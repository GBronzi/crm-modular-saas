import { describe, expect, it } from 'vitest';
import { createCustomerNoteSchema, createCustomerSchema, customerIdSchema, updateCustomerSchema } from '../src/customers/customers.schemas.js';

describe('customers schemas', () => {
  it('normalizes customer creation payloads', () => {
    expect(createCustomerSchema.parse({
      firstName: ' Ana ',
      lastName: ' Gómez ',
      email: ' ANA@EXAMPLE.COM ',
      acquisitionChannel: 'whatsapp',
    })).toMatchObject({ firstName: 'Ana', lastName: 'Gómez', email: 'ana@example.com' });
  });

  it('normalizes customer notes', () => {
    expect(createCustomerNoteSchema.parse({ body: '  Llamar el lunes  ' })).toMatchObject({ body: 'Llamar el lunes' });
    expect(() => createCustomerNoteSchema.parse({ body: '' })).toThrow();
  });

  it('rejects empty updates and invalid ids', () => {
    expect(() => updateCustomerSchema.parse({})).toThrow();
    expect(updateCustomerSchema.parse({ paymentAlertsEnabled: false })).toMatchObject({ paymentAlertsEnabled: false });
    expect(() => customerIdSchema.parse('cliente-1')).toThrow();
  });
});
