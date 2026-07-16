import { z } from 'zod';

export const uuidSchema = z.string().uuid();
export const currencySchema = z.enum(['USD', 'ARS']);
export const decimalMoneySchema = z.string().trim().regex(/^\d{1,16}(\.\d{1,2})?$/, 'Debe ser un monto decimal positivo');

export const createSaleSchema = z.object({
  productName: z.string().trim().min(1).max(255),
  totalAmount: decimalMoneySchema,
  currency: currencySchema,
  soldAt: z.string().date().optional(),
  installments: z.array(z.object({
    amount: decimalMoneySchema,
    dueDate: z.string().date(),
  }).strict()).min(1).max(60),
}).strict();

export const createPaymentSchema = z.object({
  amount: decimalMoneySchema,
  currency: currencySchema,
  method: z.enum(['efectivo', 'transferencia', 'tarjeta_debito', 'tarjeta_credito', 'criptomoneda']),
  paidAt: z.string().datetime().optional(),
  externalReference: z.string().trim().max(255).optional(),
}).strict();
