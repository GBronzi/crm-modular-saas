export type Session = {
  companySlug: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
};

export type ApiCustomer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  acquisitionChannel: 'instagram' | 'whatsapp' | 'facebook' | 'otro';
  paymentAlertsEnabled: boolean;
  marketingConsentAt: string | null;
  createdAt: string;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(payload?.message ?? `Error HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function loginWithPassword(input: { companySlug: string; email: string; password: string }): Promise<Omit<Session, 'companySlug'>> {
  return request('/api/auth/login', { method: 'POST', body: JSON.stringify(input) });
}

export function fetchCustomers(session: Session): Promise<ApiCustomer[]> {
  return request('/api/customers', { headers: { authorization: `Bearer ${session.accessToken}` } });
}
