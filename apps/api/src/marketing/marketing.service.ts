import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { z } from 'zod';
import type { AuthUser } from '../auth/auth.types.js';
import { TenantTransactionsService } from '../auth/tenant-transactions.service.js';
import type { bounceDeliverySchema, createCampaignSchema, enqueueCampaignSchema, processMarketingQueueSchema, updateCampaignSchema } from './marketing.schemas.js';

type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
type EnqueueCampaignInput = z.infer<typeof enqueueCampaignSchema>;
type ProcessMarketingQueueInput = z.infer<typeof processMarketingQueueSchema>;
type BounceDeliveryInput = z.infer<typeof bounceDeliverySchema>;
type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;

@Injectable()
export class MarketingService {
  constructor(private readonly db: TenantTransactionsService) {}

  listCampaigns(user: AuthUser) {
    return this.db.inTenant(user.companyId, async (client) => (
      await client.query(
        `SELECT id,name,subject,status,scheduled_at "scheduledAt",created_at "createdAt",updated_at "updatedAt"
         FROM campaigns
         ORDER BY created_at DESC
         LIMIT 100`,
      )
    ).rows);
  }

  createCampaign(user: AuthUser, input: CreateCampaignInput) {
    return this.db.inTenant(user.companyId, async (client) => (
      await client.query(
        `INSERT INTO campaigns(company_id,owner_user_id,name,subject,body,scheduled_at)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING id,name,subject,status,scheduled_at "scheduledAt",created_at "createdAt"`,
        [user.companyId, user.userId, input.name, input.subject, input.body, input.scheduledAt ?? null],
      )
    ).rows[0]);
  }

  getCampaign(user: AuthUser, campaignId: string) {
    return this.db.inTenant(user.companyId, async (client) => {
      const campaign = (await client.query(
        `SELECT id,name,subject,body,status,scheduled_at "scheduledAt",created_at "createdAt",updated_at "updatedAt"
         FROM campaigns WHERE id=$1`,
        [campaignId],
      )).rows[0];
      if (!campaign) throw new NotFoundException('Campaña no encontrada');
      return campaign;
    });
  }

  updateCampaign(user: AuthUser, campaignId: string, input: UpdateCampaignInput) {
    return this.db.inTenant(user.companyId, async (client) => {
      const campaign = (await client.query<{ status: string }>('SELECT status FROM campaigns WHERE id=$1 FOR UPDATE', [campaignId])).rows[0];
      if (!campaign) throw new NotFoundException('Campaña no encontrada');
      if (campaign.status !== 'borrador') throw new BadRequestException('Solo se pueden editar campañas en borrador');
      const columns: string[] = [];
      const values: Array<string | null> = [];
      const set = (column: string, value: string | null | undefined) => {
        if (value === undefined) return;
        values.push(value);
        columns.push(`${column}=$${values.length}`);
      };
      set('name', input.name);
      set('subject', input.subject);
      set('body', input.body);
      set('scheduled_at', input.scheduledAt);
      values.push(campaignId);
      return (await client.query(
        `UPDATE campaigns SET ${columns.join(',')},updated_at=now() WHERE id=$${values.length}
         RETURNING id,name,subject,body,status,scheduled_at "scheduledAt",created_at "createdAt",updated_at "updatedAt"`,
        values,
      )).rows[0];
    });
  }

  listDeliveries(user: AuthUser, campaignId: string) {
    return this.db.inTenant(user.companyId, async (client) => {
      const campaign = (await client.query<{ id: string }>('SELECT id FROM campaigns WHERE id=$1', [campaignId])).rows[0];
      if (!campaign) throw new NotFoundException('Campaña no encontrada');
      return (await client.query(
        `SELECT id,
                campaign_id "campaignId",
                customer_id "customerId",
                email,
                status,
                attempt_count "attemptCount",
                max_attempts "maxAttempts",
                next_attempt_at "nextAttemptAt",
                last_error "lastError",
                processed_at "processedAt",
                created_at "createdAt"
         FROM campaign_deliveries
         WHERE campaign_id=$1
         ORDER BY created_at DESC`,
        [campaignId],
      )).rows;
    });
  }

  bounceDelivery(user: AuthUser, deliveryId: string, input: BounceDeliveryInput) {
    return this.db.inTenant(user.companyId, async (client) => {
      const delivery = (await client.query<{ id: string; email: string; campaign_id: string }>(
        `SELECT id,email,campaign_id
         FROM campaign_deliveries
         WHERE id=$1
         FOR UPDATE`,
        [deliveryId],
      )).rows[0];
      if (!delivery) throw new NotFoundException('Entrega no encontrada');
      await client.query(
        `INSERT INTO suppression_entries(company_id,email,reason)
         VALUES ($1,$2,$3)
         ON CONFLICT (company_id,email) DO UPDATE SET reason=EXCLUDED.reason`,
        [user.companyId, delivery.email, input.reason],
      );
      const detail = input.detail ? `: ${input.detail}` : '';
      const row = (await client.query(
        `UPDATE campaign_deliveries
         SET status='fallido',last_error=$2,processed_at=now(),next_attempt_at=now()
         WHERE id=$1
         RETURNING id,campaign_id "campaignId",email,status,last_error "lastError",processed_at "processedAt"`,
        [deliveryId, `${input.reason}${detail}`],
      )).rows[0];
      await client.query("UPDATE campaigns SET status='enviando',updated_at=now() WHERE id=$1 AND status='completada'", [delivery.campaign_id]);
      return row;
    });
  }
  enqueueCampaign(user: AuthUser, campaignId: string, input: EnqueueCampaignInput) {
    return this.db.inTenant(user.companyId, async (client) => {
      const campaign = (await client.query<{ id: string }>('SELECT id FROM campaigns WHERE id=$1', [campaignId])).rows[0];
      if (!campaign) throw new NotFoundException('Campaña no encontrada');
      const customers = (await client.query<{ id: string; email: string | null; marketing_consent_at: Date | null; suppressed: boolean }>(
        `SELECT c.id,c.email,c.marketing_consent_at,
                EXISTS (SELECT 1 FROM suppression_entries s WHERE s.email=c.email) suppressed
         FROM customers c
         WHERE c.id = ANY($1::uuid[]) AND c.deleted_at IS NULL`,
        [input.customerIds],
      )).rows;
      if (customers.length !== new Set(input.customerIds).size) throw new BadRequestException('Uno o más clientes no existen');
      let queued = 0;
      let suppressed = 0;
      for (const customer of customers) {
        const status = !customer.email || !customer.marketing_consent_at || customer.suppressed ? 'suprimido' : 'pendiente';
        if (status === 'suprimido') suppressed += 1; else queued += 1;
        await client.query(
          `INSERT INTO campaign_deliveries(company_id,campaign_id,customer_id,email,status,idempotency_key,processed_at,last_error)
           VALUES ($1,$2,$3,COALESCE($4,''),$5::delivery_status,$6,CASE WHEN $5::delivery_status='suprimido' THEN now() ELSE NULL END,CASE WHEN $5::delivery_status='suprimido' THEN 'Sin consentimiento, email o suprimido' ELSE NULL END)
           ON CONFLICT (company_id,idempotency_key) DO NOTHING`,
          [user.companyId, campaignId, customer.id, customer.email, status, `${input.idempotencyKey}:${customer.id}`],
        );
      }
      await client.query("UPDATE campaigns SET status='programada',updated_at=now() WHERE id=$1 AND status='borrador'", [campaignId]);
      const totals = (await client.query(
        `SELECT status,count(*)::int total
         FROM campaign_deliveries
         WHERE campaign_id=$1
         GROUP BY status`,
        [campaignId],
      )).rows;
      return { campaignId, requested: input.customerIds.length, queued, suppressed, totals };
    });
  }

  queuePanel(user: AuthUser) {
    return this.db.inTenant(user.companyId, async (client) => {
      const totals = (await client.query(
        `SELECT status,count(*)::int total
         FROM campaign_deliveries
         GROUP BY status
         ORDER BY status`,
      )).rows;
      const errors = (await client.query(
        `SELECT d.id,
                d.campaign_id "campaignId",
                c.name "campaignName",
                d.customer_id "customerId",
                d.email,
                d.status,
                d.attempt_count "attemptCount",
                d.max_attempts "maxAttempts",
                d.next_attempt_at "nextAttemptAt",
                d.last_error "lastError",
                d.created_at "createdAt"
         FROM campaign_deliveries d
         JOIN campaigns c ON c.company_id=d.company_id AND c.id=d.campaign_id
         WHERE d.status IN ('fallido','suprimido')
         ORDER BY d.created_at DESC
         LIMIT 100`,
      )).rows;
      return { totals, errors };
    });
  }

  retryDelivery(user: AuthUser, deliveryId: string) {
    return this.db.inTenant(user.companyId, async (client) => {
      const row = (await client.query(
        `UPDATE campaign_deliveries
         SET status='pendiente',next_attempt_at=now(),last_error=NULL
         WHERE id=$1 AND status='fallido' AND attempt_count < max_attempts
         RETURNING id,campaign_id "campaignId",status,attempt_count "attemptCount",max_attempts "maxAttempts",next_attempt_at "nextAttemptAt"`,
        [deliveryId],
      )).rows[0];
      if (!row) throw new NotFoundException('Entrega fallida no encontrada o sin reintentos disponibles');
      await client.query("UPDATE campaigns SET status='programada',updated_at=now() WHERE id=$1", [row.campaignId]);
      return row;
    });
  }
  processQueue(user: AuthUser, input: ProcessMarketingQueueInput) {
    return this.db.inTenant(user.companyId, async (client) => {
      const allowedByThrottle = Math.max(1, Math.min(input.batchSize, Math.floor(input.throttlePerMinute / 60) || 1));
      const rows = (await client.query<{ id: string; attempt_count: number; max_attempts: number }>(
        `WITH picked AS (
           SELECT id
           FROM campaign_deliveries
           WHERE status IN ('pendiente','fallido') AND next_attempt_at <= now() AND attempt_count < max_attempts
           ORDER BY next_attempt_at ASC, created_at ASC
           LIMIT $1
           FOR UPDATE SKIP LOCKED
         )
         UPDATE campaign_deliveries d
         SET status='procesando',attempt_count=attempt_count+1,last_error=NULL
         FROM picked
         WHERE d.id=picked.id
         RETURNING d.id,d.attempt_count,d.max_attempts`,
        [allowedByThrottle],
      )).rows;
      let sent = 0;
      let failed = 0;
      for (const row of rows) {
        if (input.simulateFailure) {
          failed += 1;
          const terminal = row.attempt_count >= row.max_attempts;
          await client.query(
            `UPDATE campaign_deliveries
             SET status='fallido',last_error=$2,next_attempt_at=CASE WHEN $3 THEN next_attempt_at ELSE now()+($4 * interval '1 minute') END
             WHERE id=$1`,
            [row.id, terminal ? 'Máximo de reintentos alcanzado' : 'Fallo simulado de proveedor', terminal, Math.min(60, 2 ** row.attempt_count)],
          );
        } else {
          sent += 1;
          await client.query("UPDATE campaign_deliveries SET status='enviado',processed_at=now(),last_error=NULL WHERE id=$1", [row.id]);
        }
      }
      await client.query(
        `UPDATE campaigns c
         SET status=CASE
           WHEN NOT EXISTS (SELECT 1 FROM campaign_deliveries d WHERE d.campaign_id=c.id AND d.status IN ('pendiente','procesando','fallido')) THEN 'completada'::campaign_status
           ELSE 'enviando'::campaign_status
         END, updated_at=now()
         WHERE EXISTS (SELECT 1 FROM campaign_deliveries d WHERE d.campaign_id=c.id)`,
      );
      return { picked: rows.length, sent, failed, throttleApplied: allowedByThrottle };
    });
  }
}
