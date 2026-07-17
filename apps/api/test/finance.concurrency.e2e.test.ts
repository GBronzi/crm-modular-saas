import { describe, expect, it } from 'vitest';

const apiUrl = process.env.CRM_API_E2E_URL;
const describeE2e = apiUrl ? describe : describe.skip;

type JsonRecord = Record<string, unknown>;

async function request<T extends JsonRecord>(path: string, options: RequestInit = {}): Promise<T> {
  if (!apiUrl) throw new Error('CRM_API_E2E_URL no configurado');
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text}`);
  return payload as T;
}

describeE2e('finance concurrency e2e', () => {
  it('serializes concurrent payments and rejects overpayment', async () => {
    const stamp = Date.now();
    const provision = await request<{ accessToken: string }>('/auth/provision', {
      method: 'POST',
      body: JSON.stringify({
        companyName: `Concurrente ${stamp}`,
        companySlug: `concurrente-${stamp}`,
        displayName: 'Admin Concurrente',
        email: `concurrente-${stamp}@example.com`,
        password: 'a-secure-password',
      }),
    });
    const auth = { authorization: `Bearer ${provision.accessToken}` };
    const customer = await request<{ id: string }>('/customers', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ firstName: 'Cliente', lastName: 'Concurrente', acquisitionChannel: 'otro' }),
    });
    const sale = await request<{ installments: Array<{ id: string }> }>(`/customers/${customer.id}/sales`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        productName: 'Plan concurrente',
        totalAmount: '100.00',
        currency: 'USD',
        installments: [{ amount: '100.00', dueDate: '2026-12-31' }],
      }),
    });
    const installmentId = sale.installments[0]?.id;
    expect(installmentId).toBeTruthy();

    const pay = () => fetch(`${apiUrl}/installments/${installmentId}/payments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...auth },
      body: JSON.stringify({ amount: '80.00', currency: 'USD', method: 'efectivo' }),
    });
    const responses = await Promise.all([pay(), pay()]);
    const statuses = responses.map((response) => response.status).sort();
    expect(statuses).toEqual([201, 400]);

    const summary = await request<{ installments: Array<{ installmentId: string; paidAmount: string; status: string }> }>(`/customers/${customer.id}/finance`, { headers: auth });
    const installment = summary.installments.find((item) => item.installmentId === installmentId);
    expect(installment?.paidAmount).toBe('80.00');
    expect(installment?.status).toBe('pendiente');
  });
});
