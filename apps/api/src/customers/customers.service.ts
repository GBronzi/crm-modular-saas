import { Injectable, NotFoundException } from '@nestjs/common';
import type { z } from 'zod';
import type { AuthUser } from '../auth/auth.types.js';
import { TenantTransactionsService } from '../auth/tenant-transactions.service.js';
import type { createCustomerSchema, updateCustomerSchema } from './customers.schemas.js';

type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

const customerSelect = `
  SELECT id,
         first_name "firstName",
         last_name "lastName",
         email,
         phone,
         country,
         instagram_handle "instagramHandle",
         facebook_handle "facebookHandle",
         acquisition_channel "acquisitionChannel",
         payment_alerts_enabled "paymentAlertsEnabled",
         marketing_consent_at "marketingConsentAt",
         created_at "createdAt",
         updated_at "updatedAt"
  FROM customers`;

@Injectable()
export class CustomersService {
  constructor(private readonly db: TenantTransactionsService) {}

  list(user: AuthUser) {
    return this.db.inTenant(user.companyId, async (client) => (
      await client.query(`${customerSelect} WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 100`)
    ).rows);
  }

  get(user: AuthUser, customerId: string) {
    return this.db.inTenant(user.companyId, async (client) => {
      const row = (await client.query(`${customerSelect} WHERE id=$1 AND deleted_at IS NULL`, [customerId])).rows[0];
      if (!row) throw new NotFoundException('Cliente no encontrado');
      return row;
    });
  }

  create(user: AuthUser, value: CreateCustomerInput) {
    return this.db.inTenant(user.companyId, async (client) => (
      await client.query(
        `INSERT INTO customers(company_id,owner_user_id,first_name,last_name,email,phone,country,instagram_handle,facebook_handle,acquisition_channel,payment_alerts_enabled,marketing_consent_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,CASE WHEN $12 THEN now() ELSE NULL END)
         RETURNING id,first_name "firstName",last_name "lastName",email,phone,country,acquisition_channel "acquisitionChannel",payment_alerts_enabled "paymentAlertsEnabled",marketing_consent_at "marketingConsentAt",created_at "createdAt",updated_at "updatedAt"`,
        [user.companyId, user.userId, value.firstName, value.lastName, value.email ?? null, value.phone ?? null, value.country ?? null, value.instagramHandle ?? null, value.facebookHandle ?? null, value.acquisitionChannel, value.paymentAlertsEnabled ?? true, value.marketingConsent ?? false],
      )
    ).rows[0]);
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
         RETURNING id,first_name "firstName",last_name "lastName",email,phone,country,instagram_handle "instagramHandle",facebook_handle "facebookHandle",acquisition_channel "acquisitionChannel",payment_alerts_enabled "paymentAlertsEnabled",marketing_consent_at "marketingConsentAt",created_at "createdAt",updated_at "updatedAt"`,
        [customerId, value.firstName ?? null, value.lastName ?? null, value.email ?? null, value.phone ?? null, value.country ?? null, value.instagramHandle ?? null, value.facebookHandle ?? null, value.acquisitionChannel ?? null, value.paymentAlertsEnabled ?? null, value.marketingConsent ?? null],
      )).rows[0];
      if (!row) throw new NotFoundException('Cliente no encontrado');
      return row;
    });
  }

  remove(user: AuthUser, customerId: string): Promise<void> {
    return this.db.inTenant(user.companyId, async (client) => {
      const result = await client.query('UPDATE customers SET deleted_at=now(),updated_at=now() WHERE id=$1 AND deleted_at IS NULL', [customerId]);
      if (result.rowCount === 0) throw new NotFoundException('Cliente no encontrado');
    });
  }
}