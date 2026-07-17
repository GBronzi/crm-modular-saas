import { Injectable, NotFoundException } from '@nestjs/common';
import type { z } from 'zod';
import type { AuthUser } from '../auth/auth.types.js';
import { TenantTransactionsService } from '../auth/tenant-transactions.service.js';
import { toCsv } from '../common/csv.js';
import { toSpreadsheetXml } from '../common/spreadsheet-xml.js';
import type { createCustomerNoteSchema, createCustomerSchema, updateCustomerSchema } from './customers.schemas.js';

type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
type CreateCustomerNoteInput = z.infer<typeof createCustomerNoteSchema>;

const customerSelect = `
  SELECT c.id,
         c.first_name "firstName",
         c.last_name "lastName",
         c.email,
         c.phone,
         c.country,
         c.instagram_handle "instagramHandle",
         c.facebook_handle "facebookHandle",
         c.acquisition_channel "acquisitionChannel",
         c.payment_alerts_enabled "paymentAlertsEnabled",
         c.marketing_consent_at "marketingConsentAt",
         c.created_at "createdAt",
         c.updated_at "updatedAt",
         finance.next_due_date "nextDueDate",
         COALESCE(finance.balance_amount, '0.00') "balanceAmount",
         finance.currency "balanceCurrency",
         CASE
           WHEN NOT c.payment_alerts_enabled THEN 'desactivada'
           WHEN finance.has_overdue THEN 'vencido'
           WHEN finance.has_due_today THEN 'hoy'
           ELSE 'al_dia'
         END "alertStatus"
  FROM customers c
  LEFT JOIN LATERAL (
    SELECT open_items.currency,
           MIN(open_items.due_date) next_due_date,
           SUM(open_items.remaining)::numeric(18,2)::text balance_amount,
           BOOL_OR(open_items.due_date < current_date) has_overdue,
           BOOL_OR(open_items.due_date = current_date) has_due_today
    FROM (
      SELECT i.currency,
             i.due_date,
             i.amount - COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.company_id=i.company_id AND p.installment_id=i.id),0) remaining
      FROM installments i
      JOIN sales s ON s.company_id=i.company_id AND s.id=i.sale_id
      WHERE s.customer_id=c.id AND s.deleted_at IS NULL AND i.status <> 'cancelada'
    ) open_items
    WHERE open_items.remaining > 0
    GROUP BY open_items.currency
    ORDER BY MIN(open_items.due_date)
    LIMIT 1
  ) finance ON true`;

const customerExportColumns = [
  { header: 'id', value: (row: Record<string, unknown>) => row.id as string },
  { header: 'first_name', value: (row: Record<string, unknown>) => row.firstName as string },
  { header: 'last_name', value: (row: Record<string, unknown>) => row.lastName as string },
  { header: 'email', value: (row: Record<string, unknown>) => row.email as string | null },
  { header: 'phone', value: (row: Record<string, unknown>) => row.phone as string | null },
  { header: 'country', value: (row: Record<string, unknown>) => row.country as string | null },
  { header: 'acquisition_channel', value: (row: Record<string, unknown>) => row.acquisitionChannel as string },
  { header: 'payment_alerts_enabled', value: (row: Record<string, unknown>) => row.paymentAlertsEnabled as boolean },
  { header: 'alert_status', value: (row: Record<string, unknown>) => row.alertStatus as string },
  { header: 'next_due_date', value: (row: Record<string, unknown>) => row.nextDueDate as string | null },
  { header: 'balance_amount', value: (row: Record<string, unknown>) => row.balanceAmount as string },
  { header: 'balance_currency', value: (row: Record<string, unknown>) => row.balanceCurrency as string | null },
  { header: 'marketing_consent_at', value: (row: Record<string, unknown>) => row.marketingConsentAt as string | null },
  { header: 'created_at', value: (row: Record<string, unknown>) => row.createdAt as string },
  { header: 'updated_at', value: (row: Record<string, unknown>) => row.updatedAt as string },
];
@Injectable()
export class CustomersService {
  constructor(private readonly db: TenantTransactionsService) {}

  list(user: AuthUser) {
    return this.db.inTenant(user.companyId, async (client) => (
      await client.query(`${customerSelect} WHERE c.deleted_at IS NULL ORDER BY c.created_at DESC LIMIT 100`)
    ).rows);
  }

  get(user: AuthUser, customerId: string) {
    return this.db.inTenant(user.companyId, async (client) => {
      const row = (await client.query(`${customerSelect} WHERE c.id=$1 AND c.deleted_at IS NULL`, [customerId])).rows[0];
      if (!row) throw new NotFoundException('Cliente no encontrado');
      return row;
    });
  }

  exportCsv(user: AuthUser) {
    return this.db.inTenant(user.companyId, async (client) => {
      const rows = (await client.query(`${customerSelect} WHERE c.deleted_at IS NULL ORDER BY c.created_at DESC`)).rows;
      return toCsv(customerExportColumns, rows);
    });
  }

  exportExcel(user: AuthUser) {
    return this.db.inTenant(user.companyId, async (client) => {
      const rows = (await client.query(`${customerSelect} WHERE c.deleted_at IS NULL ORDER BY c.created_at DESC`)).rows;
      return toSpreadsheetXml(customerExportColumns, rows);
    });
  }

  create(user: AuthUser, value: CreateCustomerInput) {
    return this.db.inTenant(user.companyId, async (client) => {
      const row = (await client.query(
        `INSERT INTO customers(company_id,owner_user_id,first_name,last_name,email,phone,country,instagram_handle,facebook_handle,acquisition_channel,payment_alerts_enabled,marketing_consent_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,CASE WHEN $12 THEN now() ELSE NULL END)
         RETURNING id`,
        [user.companyId, user.userId, value.firstName, value.lastName, value.email ?? null, value.phone ?? null, value.country ?? null, value.instagramHandle ?? null, value.facebookHandle ?? null, value.acquisitionChannel, value.paymentAlertsEnabled ?? true, value.marketingConsent ?? false],
      )).rows[0];
      return (await client.query(`${customerSelect} WHERE c.id=$1 AND c.deleted_at IS NULL`, [row.id])).rows[0];
    });
  }

  update(user: AuthUser, customerId: string, value: UpdateCustomerInput) {
    return this.db.inTenant(user.companyId, async (client) => {
      const row = (await client.query(
        `UPDATE customers
         SET first_name=COALESCE($2,first_name),
             last_name=COALESCE($3,last_name),
             email=COALESCE($4,email),
             phone=COALESCE($5,phone),
             country=COALESCE($6,country),
             instagram_handle=COALESCE($7,instagram_handle),
             facebook_handle=COALESCE($8,facebook_handle),
             acquisition_channel=COALESCE($9,acquisition_channel),
             payment_alerts_enabled=COALESCE($10,payment_alerts_enabled),
             marketing_consent_at=CASE WHEN $11::boolean IS NULL THEN marketing_consent_at WHEN $11::boolean THEN COALESCE(marketing_consent_at,now()) ELSE NULL END,
             updated_at=now()
         WHERE id=$1 AND deleted_at IS NULL
         RETURNING id`,
        [customerId, value.firstName ?? null, value.lastName ?? null, value.email ?? null, value.phone ?? null, value.country ?? null, value.instagramHandle ?? null, value.facebookHandle ?? null, value.acquisitionChannel ?? null, value.paymentAlertsEnabled ?? null, value.marketingConsent ?? null],
      )).rows[0];
      if (!row) throw new NotFoundException('Cliente no encontrado');
      return (await client.query(`${customerSelect} WHERE c.id=$1 AND c.deleted_at IS NULL`, [row.id])).rows[0];
    });
  }

  listNotes(user: AuthUser, customerId: string) {
    return this.db.inTenant(user.companyId, async (client) => {
      await this.assertCustomer(client, customerId);
      return (await client.query(
        `SELECT n.id,n.body,n.created_at "createdAt",u.id "authorId",u.display_name "authorName"
         FROM customer_notes n
         JOIN users u ON u.company_id=n.company_id AND u.id=n.author_user_id
         WHERE n.customer_id=$1
         ORDER BY n.created_at DESC
         LIMIT 100`,
        [customerId],
      )).rows;
    });
  }

  createNote(user: AuthUser, customerId: string, value: CreateCustomerNoteInput) {
    return this.db.inTenant(user.companyId, async (client) => {
      await this.assertCustomer(client, customerId);
      return (await client.query(
        `INSERT INTO customer_notes(company_id,customer_id,author_user_id,body)
         VALUES ($1,$2,$3,$4)
         RETURNING id,body,created_at "createdAt",$3::uuid "authorId"`,
        [user.companyId, customerId, user.userId, value.body],
      )).rows[0];
    });
  }

  private async assertCustomer(client: import('pg').PoolClient, customerId: string) {
    const row = (await client.query('SELECT 1 FROM customers WHERE id=$1 AND deleted_at IS NULL', [customerId])).rows[0];
    if (!row) throw new NotFoundException('Cliente no encontrado');
  }

  remove(user: AuthUser, customerId: string): Promise<void> {
    return this.db.inTenant(user.companyId, async (client) => {
      const result = await client.query('UPDATE customers SET deleted_at=now(),updated_at=now() WHERE id=$1 AND deleted_at IS NULL', [customerId]);
      if (result.rowCount === 0) throw new NotFoundException('Cliente no encontrado');
    });
  }
}
