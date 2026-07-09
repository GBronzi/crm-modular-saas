export type Session = {
  companySlug: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
};

export type AcquisitionChannel = 'instagram' | 'whatsapp' | 'facebook' | 'otro';

export type ApiCustomer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  instagramHandle?: string | null;
  facebookHandle?: string | null;
  acquisitionChannel: AcquisitionChannel;
  paymentAlertsEnabled: boolean;
  marketingConsentAt: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type CreateCustomerInput = {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  acquisitionChannel: AcquisitionChannel;
  paymentAlertsEnabled?: boolean;
  marketingConsent?: boolean;
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
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function authHeaders(session: Session) {
  return { authorization: `Bearer ${session.accessToken}` };
}

export function loginWithPassword(input: { companySlug: string; email: string; password: string }): Promise<Omit<Session, 'companySlug'>> {
  return request('/api/auth/login', { method: 'POST', body: JSON.stringify(input) });
}

export function fetchCustomers(session: Session): Promise<ApiCustomer[]> {
  return request('/api/customers', { headers: authHeaders(session) });
}

export function createCustomer(session: Session, input: CreateCustomerInput): Promise<ApiCustomer> {
  return request('/api/customers', { method: 'POST', headers: authHeaders(session), body: JSON.stringify(input) });
}