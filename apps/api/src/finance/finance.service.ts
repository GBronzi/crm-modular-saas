import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { PoolClient } from 'pg';
import type { z } from 'zod';
import type { AuthUser } from '../auth/auth.types.js';
import { TenantTransactionsService } from '../auth/tenant-transactions.service.js';
import type { createPaymentSchema, createSaleSchema } from './finance.schemas.js';

type CreateSaleInput = z.infer<typeof createSaleSchema>;
type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

type InstallmentRow = { id: string; amount: string; currency: 'USD' | 'ARS'; due_date: string; status: string; paid_amount: string };

function toCents(value: string): bigint {
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2));
}

function assertInstallmentSum(input: CreateSaleInput) {
  const expected = toCents(input.totalAmount);
  const actual = input.installments.reduce((total, item) => total + toCents(item.amount), 0n);
  if (actual !== expected) throw new BadRequestException('La suma de cuotas debe coincidir con el total de la venta');
}

@Injectable()
export class FinanceService {
  constructor(private readonly db: TenantTransactionsService) {}

  summary(user: AuthUser, customerId: string) {
    return this.db.inTenant(user.companyId, async (client) => {
      await this.assertCustomer(client, customerId);
      const rows = (await client.query(
        `SELECT s.id "saleId",
                s.product_name "productName",
                s.total_amount::text "totalAmount",
                s.currency,
                s.sold_at "soldAt",
                i.id "installmentId",
                i.sequence,
                i.amount::text "installmentAmount",
                i.due_date "dueDate",
                i.status,
                COALESCE(SUM(p.amount),0)::text "paidAmount"
         FROM sales s
         JOIN installments i ON i.company_id=s.company_id AND i.sale_id=s.id
         LEFT JOIN payments p ON p.company_id=i.company_id AND p.installment_id=i.id
         WHERE s.customer_id=$1 AND s.deleted_at IS NULL
         GROUP BY s.id,i.id
         ORDER BY s.sold_at DESC,i.sequence ASC`,
        [customerId],
      )).rows;
      const totals = (await client.query(
        `SELECT i.currency,
                COALESCE(SUM(i.amount),0)::numeric(18,2)::text "scheduled",
                COALESCE(SUM(paid.total_paid),0)::text "paid"
         FROM installments i
         JOIN sales s ON s.company_id=i.company_id AND s.id=i.sale_id
         LEFT JOIN LATERAL (
           SELECT COALESCE(SUM(amount),0) total_paid FROM payments p WHERE p.company_id=i.company_id AND p.installment_id=i.id
         ) paid ON true
         WHERE s.customer_id=$1 AND s.deleted_at IS NULL
         GROUP BY i.currency
         ORDER BY i.currency`,
        [customerId],
      )).rows;
      return { customerId, totals, installments: rows };
    });
  }

  dashboard(user: AuthUser) {
    return this.db.inTenant(user.companyId, async (client) => {
      const totals = (await client.query(
        `SELECT i.currency,
                COALESCE(SUM(i.amount),0)::numeric(18,2)::text "scheduled",
                COALESCE(SUM(paid.total_paid),0)::numeric(18,2)::text "paid",
                (COALESCE(SUM(i.amount),0)-COALESCE(SUM(paid.total_paid),0))::numeric(18,2)::text "balance"
         FROM installments i
         JOIN sales s ON s.company_id=i.company_id AND s.id=i.sale_id
         LEFT JOIN LATERAL (
           SELECT COALESCE(SUM(amount),0) total_paid FROM payments p WHERE p.company_id=i.company_id AND p.installment_id=i.id
         ) paid ON true
         WHERE s.deleted_at IS NULL AND i.status <> 'cancelada'
         GROUP BY i.currency
         ORDER BY i.currency`,
      )).rows;
      return { totals };
    });
  }
  createSale(user: AuthUser, customerId: string, input: CreateSaleInput) {
    assertInstallmentSum(input);
    return this.db.inTenant(user.companyId, async (client) => {
      await this.assertCustomer(client, customerId);
      const sale = (await client.query(
        `INSERT INTO sales(company_id,customer_id,product_name,total_amount,currency,sold_at)
         VALUES ($1,$2,$3,$4,$5,COALESCE($6::date,current_date))
         RETURNING id,product_name "productName",total_amount::text "totalAmount",currency,sold_at "soldAt"`,
        [user.companyId, customerId, input.productName, input.totalAmount, input.currency, input.soldAt ?? null],
      )).rows[0];
      const installments = [];
      for (const [index, installment] of input.installments.entries()) {
        installments.push((await client.query(
          `INSERT INTO installments(company_id,sale_id,sequence,amount,currency,due_date)
           VALUES ($1,$2,$3,$4,$5,$6)
           RETURNING id,sequence,amount::text "amount",currency,due_date "dueDate",status`,
          [user.companyId, sale.id, index + 1, installment.amount, input.currency, installment.dueDate],
        )).rows[0]);
      }
      return { ...sale, installments };
    });
  }

  createPayment(user: AuthUser, installmentId: string, input: CreatePaymentInput) {
    return this.db.inTenant(user.companyId, async (client) => {
      const installment = await this.lockInstallment(client, installmentId);
      if (installment.currency !== input.currency) throw new BadRequestException('La moneda del pago debe coincidir con la cuota');
      const remaining = toCents(installment.amount) - toCents(installment.paid_amount);
      if (toCents(input.amount) > remaining) throw new BadRequestException('El pago supera el saldo pendiente de la cuota');
      const payment = (await client.query(
        `INSERT INTO payments(company_id,installment_id,amount,currency,method,paid_at,external_reference)
         VALUES ($1,$2,$3,$4,$5,COALESCE($6::timestamptz,now()),$7)
         RETURNING id,installment_id "installmentId",amount::text,currency,method,paid_at "paidAt",external_reference "externalReference"`,
        [user.companyId, installmentId, input.amount, input.currency, input.method, input.paidAt ?? null, input.externalReference ?? null],
      )).rows[0];
      await this.refreshInstallmentStatus(client, installmentId);
      const updated = await this.lockInstallment(client, installmentId);
      return { payment, installment: { id: updated.id, amount: updated.amount, currency: updated.currency, dueDate: updated.due_date, status: updated.status, paidAmount: updated.paid_amount } };
    });
  }

  private async assertCustomer(client: PoolClient, customerId: string) {
    const row = (await client.query('SELECT 1 FROM customers WHERE id=$1 AND deleted_at IS NULL', [customerId])).rows[0];
    if (!row) throw new NotFoundException('Cliente no encontrado');
  }

  private async lockInstallment(client: PoolClient, installmentId: string): Promise<InstallmentRow> {
    const row = (await client.query<InstallmentRow>(
      `WITH locked AS (
         SELECT i.id,i.company_id,i.amount,i.currency,i.due_date,i.status
         FROM installments i
         WHERE i.id=$1
         FOR UPDATE
       )
       SELECT locked.id,
              locked.amount::text,
              locked.currency,
              locked.due_date::text,
              locked.status,
              COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.company_id=locked.company_id AND p.installment_id=locked.id),0)::text paid_amount
       FROM locked`,
      [installmentId],
    )).rows[0];
    if (!row) throw new NotFoundException('Cuota no encontrada');
    if (row.status === 'cancelada') throw new BadRequestException('La cuota está cancelada');
    return row;
  }

  private async refreshInstallmentStatus(client: PoolClient, installmentId: string) {
    await client.query(
      `UPDATE installments i
       SET status = CASE
         WHEN paid.total_paid >= i.amount THEN 'pagada'::installment_status
         WHEN i.due_date < current_date THEN 'vencida'::installment_status
         ELSE 'pendiente'::installment_status
       END
       FROM (
         SELECT COALESCE(SUM(amount),0) total_paid FROM payments WHERE installment_id=$1
       ) paid
       WHERE i.id=$1`,
      [installmentId],
    );
  }
}
