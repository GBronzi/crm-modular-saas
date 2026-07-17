import { describe, expect, it } from 'vitest';

const apiUrl = process.env.CRM_API_E2E_URL;
const describeE2e = apiUrl ? describe : describe.skip;

type JsonRecord = Record<string, unknown>;

async function request<T extends JsonRecord>(path: string, options: RequestInit = {}): Promise<T> {
  if (!apiUrl) throw new Error('CRM_API_E2E_URL no configurado');
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers ?? {}) },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text}`);
  return (text ? JSON.parse(text) : {}) as T;
}

describeE2e('marketing queue load e2e', () => {
  it('enqueues and processes a small batch without duplicates', async () => {
    const stamp = Date.now();
    const provision = await request<{ accessToken: string }>('/auth/provision', {
      method: 'POST',
      body: JSON.stringify({ companyName: `Carga ${stamp}`, companySlug: `carga-${stamp}`, displayName: 'Admin Carga', email: `carga-${stamp}@example.com`, password: 'a-secure-password' }),
    });
    const auth = { authorization: `Bearer ${provision.accessToken}` };
    const customers = [] as Array<{ id: string }>;
    for (let index = 0; index < 20; index += 1) {
      customers.push(await request<{ id: string }>('/customers', {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ firstName: 'Carga', lastName: String(index), email: `cliente-${stamp}-${index}@example.com`, acquisitionChannel: 'otro', marketingConsent: true }),
      }));
    }
    const campaign = await request<{ id: string }>('/marketing/campaigns', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ name: 'Carga marketing', subject: 'Carga', body: 'Contenido' }),
    });
    const enqueue = await request<{ queued: number }>(`/marketing/campaigns/${campaign.id}/enqueue`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ customerIds: customers.map(customer => customer.id), idempotencyKey: `load-${stamp}` }),
    });
    const duplicate = await request<{ totals: Array<{ status: string; total: number }> }>(`/marketing/campaigns/${campaign.id}/enqueue`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ customerIds: customers.map(customer => customer.id), idempotencyKey: `load-${stamp}` }),
    });
    const process = await request<{ picked: number; sent: number; throttleApplied: number }>('/marketing/worker/process', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ batchSize: 20, throttlePerMinute: 600 }),
    });
    const totalDeliveries = duplicate.totals.reduce((total, item) => total + item.total, 0);
    expect(enqueue.queued).toBe(20);
    expect(totalDeliveries).toBe(20);
    expect(process.throttleApplied).toBe(10);
    expect(process.sent).toBe(10);
  });
});
