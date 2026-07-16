import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const createCampaignSchema = z.object({
  name: z.string().trim().min(2).max(255),
  subject: z.string().trim().min(2).max(255),
  body: z.string().trim().min(1).max(20000),
  scheduledAt: z.string().datetime().optional(),
}).strict();

export const updateCampaignSchema = z.object({
  name: z.string().trim().min(2).max(255).optional(),
  subject: z.string().trim().min(2).max(255).optional(),
  body: z.string().trim().min(1).max(20000).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Indica al menos un campo para actualizar');
export const enqueueCampaignSchema = z.object({
  customerIds: z.array(uuidSchema).min(1).max(1000),
  idempotencyKey: z.string().trim().min(8).max(160).regex(/^[a-zA-Z0-9:._-]+$/),
}).strict();

export const processMarketingQueueSchema = z.object({
  batchSize: z.number().int().min(1).max(100).default(25),
  throttlePerMinute: z.number().int().min(1).max(600).default(60),
  simulateFailure: z.boolean().default(false),
}).strict();

export const bounceDeliverySchema = z.object({
  reason: z.enum(['rebote', 'queja']).default('rebote'),
  detail: z.string().trim().max(1000).optional(),
}).strict();
