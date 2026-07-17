import { describe, expect, it } from 'vitest';
import { createPaymentSchema, createSaleSchema, decimalMoneySchema } from '../src/finance/finance.schemas.js';

describe('finance schemas', () => {
  it('accepts sale creation with decimal-string money', () => {
    expect(createSaleSchema.parse({
      productName: 'Implementación CRM',
      totalAmount: '1200.50',
      currency: 'USD',
      installments: [
        { amount: '600.25', dueDate: '2026-08-10' },
        { amount: '600.25', dueDate: '2026-09-10' },
      ],
    })).toMatchObject({ productName: 'Implementación CRM', currency: 'USD' });
  });

  it('rejects malformed money and invalid payment methods', () => {
    expect(() => decimalMoneySchema.parse('12.999')).toThrow();
    expect(() => createPaymentSchema.parse({
      amount: '100.00',
      currency: 'USD',
      method: 'cheque',
    })).toThrow();
  });
});
