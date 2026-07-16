import { z } from 'zod';

const customerBaseSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(320).nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  country: z.string().trim().max(100).nullable().optional(),
  instagramHandle: z.string().trim().max(100).nullable().optional(),
  facebookHandle: z.string().trim().max(100).nullable().optional(),
  acquisitionChannel: z.enum(['instagram', 'whatsapp', 'facebook', 'otro']),
  paymentAlertsEnabled: z.boolean().optional(),
  marketingConsent: z.boolean().optional(),
});

export const createCustomerSchema = customerBaseSchema.strict();
export const updateCustomerSchema = customerBaseSchema.partial().strict().refine(
  (value) => Object.keys(value).length > 0,
  'Debe enviar al menos un campo para actualizar',
);
export const customerIdSchema = z.string().uuid();

export const createCustomerNoteSchema = z.object({
  body: z.string().trim().min(1).max(5000),
}).strict();
