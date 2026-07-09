import { describe, expect, it } from 'vitest';
import { createCustomerSchema, customerIdSchema, updateCustomerSchema } from '../src/customers/customers.schemas.js';

describe('customers schemas', () => {
  it('normalizes customer creation payloads', () => {
    expect(createCustomerSchema.parse({
      firstName: ' Ana ',
      lastName: ' Gómez ',
      email: ' ANA@EXAMPLE.COM ',
      acquisitionChannel: 'whatsapp',
    })).toMatchObject({ firstName: 'Ana', lastName: 'Gómez', email: 'ana@example.com' });
  });

  it('rejects empty updates and invalid ids', () => {
    expect(() => updateCustomerSchema.parse({})).toThrow();
    expect(updateCustomerSchema.parse({ paymentAlertsEnabled: false })).toMatchObject({ paymentAlertsEnabled: false });
    expect(() => customerIdSchema.parse('cliente-1')).toThrow();
  });
});
