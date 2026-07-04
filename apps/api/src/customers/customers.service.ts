import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types.js';
import { TenantTransactionsService } from '../auth/tenant-transactions.service.js';
@Injectable()
export class CustomersService {
  constructor(private readonly db:TenantTransactionsService) {}
  list(user:AuthUser) { return this.db.inTenant(user.companyId,async (client)=>(await client.query(`SELECT id,first_name "firstName",last_name "lastName",email,phone,country,acquisition_channel "acquisitionChannel",payment_alerts_enabled "paymentAlertsEnabled",marketing_consent_at "marketingConsentAt",created_at "createdAt" FROM customers WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 100`)).rows); }
  create(user:AuthUser,value:Record<string,unknown>) { return this.db.inTenant(user.companyId,async (client)=>(await client.query(`INSERT INTO customers(company_id,owner_user_id,first_name,last_name,email,phone,country,instagram_handle,facebook_handle,acquisition_channel,payment_alerts_enabled,marketing_consent_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,CASE WHEN $12 THEN now() ELSE NULL END) RETURNING id,first_name "firstName",last_name "lastName",email,created_at "createdAt"`,[user.companyId,user.userId,value.firstName,value.lastName,value.email??null,value.phone??null,value.country??null,value.instagramHandle??null,value.facebookHandle??null,value.acquisitionChannel,value.paymentAlertsEnabled??true,value.marketingConsent??false])).rows[0]); }
}
