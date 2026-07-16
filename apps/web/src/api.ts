export type Session = {
  companySlug: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
};

export type AcquisitionChannel = 'instagram' | 'whatsapp' | 'facebook' | 'otro';
export type Currency = 'USD' | 'ARS';

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
  nextDueDate: string | null;
  balanceAmount: string;
  balanceCurrency: Currency | null;
  alertStatus: 'vencido' | 'hoy' | 'al_dia' | 'desactivada';
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

export type UpdateCustomerInput = Partial<CreateCustomerInput>;

export type FinanceSummary = {
  customerId: string;
  totals: Array<{ currency: Currency; scheduled: string; paid: string }>;
  installments: Array<{
    saleId: string;
    productName: string;
    totalAmount: string;
    currency: Currency;
    soldAt: string;
    installmentId: string;
    sequence: number;
    installmentAmount: string;
    dueDate: string;
    status: 'pendiente' | 'vencida' | 'pagada' | 'cancelada';
    paidAmount: string;
  }>;
};

export type FinanceDashboard = {
  totals: Array<{ currency: Currency; scheduled: string; paid: string; balance: string }>;
};

export type CustomerNote = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName?: string;
};
export type CreateSaleInput = {
  productName: string;
  totalAmount: string;
  currency: Currency;
  soldAt?: string;
  installments: Array<{ amount: string; dueDate: string }>;
};

export type CreatePaymentInput = {
  amount: string;
  currency: Currency;
  method: 'efectivo' | 'transferencia' | 'tarjeta_debito' | 'tarjeta_credito' | 'criptomoneda';
  paidAt?: string;
  externalReference?: string;
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

export function loginWithPassword(input: { companySlug: string; email: string; password: string; mfaCode?: string }): Promise<Omit<Session, 'companySlug'>> {
  return request('/api/auth/login', { method: 'POST', body: JSON.stringify(input) });
}

export function fetchCustomers(session: Session): Promise<ApiCustomer[]> {
  return request('/api/customers', { headers: authHeaders(session) });
}

export function createCustomer(session: Session, input: CreateCustomerInput): Promise<ApiCustomer> {
  return request('/api/customers', { method: 'POST', headers: authHeaders(session), body: JSON.stringify(input) });
}

export function updateCustomer(session: Session, id: string, input: UpdateCustomerInput): Promise<ApiCustomer> {
  return request(`/api/customers/${id}`, { method: 'PATCH', headers: authHeaders(session), body: JSON.stringify(input) });
}

export function deleteCustomer(session: Session, id: string): Promise<void> {
  return request(`/api/customers/${id}`, { method: 'DELETE', headers: authHeaders(session) });
}

export function fetchFinanceSummary(session: Session, customerId: string): Promise<FinanceSummary> {
  return request(`/api/customers/${customerId}/finance`, { headers: authHeaders(session) });
}

export function fetchFinanceDashboard(session: Session): Promise<FinanceDashboard> {
  return request('/api/finance/dashboard', { headers: authHeaders(session) });
}

export function createSale(session: Session, customerId: string, input: CreateSaleInput) {
  return request(`/api/customers/${customerId}/sales`, { method: 'POST', headers: authHeaders(session), body: JSON.stringify(input) });
}

export function createPayment(session: Session, installmentId: string, input: CreatePaymentInput) {
  return request(`/api/installments/${installmentId}/payments`, { method: 'POST', headers: authHeaders(session), body: JSON.stringify(input) });
}
export function fetchCustomerNotes(session: Session, customerId: string): Promise<CustomerNote[]> {
  return request(`/api/customers/${customerId}/notes`, { headers: authHeaders(session) });
}

export function createCustomerNote(session: Session, customerId: string, body: string): Promise<CustomerNote> {
  return request(`/api/customers/${customerId}/notes`, { method: 'POST', headers: authHeaders(session), body: JSON.stringify({ body }) });
}
