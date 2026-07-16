import { describe, expect, it } from 'vitest';
import { createCampaignSchema, enqueueCampaignSchema, processMarketingQueueSchema, updateCampaignSchema } from '../src/marketing/marketing.schemas.js';

describe('marketing schemas', () => {
  it('validates campaign creation', () => {
    expect(createCampaignSchema.parse({ name: 'Promo julio', subject: 'Oferta', body: 'Contenido' }).name).toBe('Promo julio');
  });

  it('requires an idempotency key when enqueueing', () => {
    expect(enqueueCampaignSchema.safeParse({ customerIds: ['550e8400-e29b-41d4-a716-446655440000'] }).success).toBe(false);
    expect(enqueueCampaignSchema.safeParse({ customerIds: ['550e8400-e29b-41d4-a716-446655440000'], idempotencyKey: 'campaign:test-1' }).success).toBe(true);
  });

  it('defaults worker processing limits', () => {
    expect(processMarketingQueueSchema.parse({})).toEqual({ batchSize: 25, throttlePerMinute: 60, simulateFailure: false });
  });
  it('requires at least one campaign field to update', () => {
    expect(updateCampaignSchema.safeParse({}).success).toBe(false);
    expect(updateCampaignSchema.parse({ subject: 'Nueva oferta', scheduledAt: null })).toEqual({ subject: 'Nueva oferta', scheduledAt: null });
  });
});
