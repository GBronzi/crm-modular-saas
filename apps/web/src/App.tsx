import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collections, customers as demoCustomers, notes, type Alert } from './data';
import { createCustomer, createCustomerNote, createPayment, createSale, deleteCustomer, fetchCustomerNotes, fetchCustomers, fetchFinanceDashboard, fetchFinanceSummary, loginWithPassword, updateCustomer, type AcquisitionChannel, type ApiCustomer, type CreateCustomerInput, type Currency, type CustomerNote, type FinanceDashboard, type FinanceSummary, type Session } from './api';

const Icon = ({ children }: { children: string }) => <span className="nav-icon" aria-hidden="true">{children}</span>;

type CustomerRow = {
  id: string;
  name: string;
  owner: string;
  channel: string;
  balance: string;
  currency: 'USD' | 'ARS';
  due: string;
  alert: Alert;
  initials: string;
  apiCustomer?: ApiCustomer;
};

type CustomerFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  acquisitionChannel: AcquisitionChannel;
  paymentAlertsEnabled: boolean;
  marketingConsent: boolean;
};

const emptyCustomerForm: CustomerFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  country: '',
  acquisitionChannel: 'whatsapp',
  paymentAlertsEnabled: true,
  marketingConsent: false,
};

function initials(firstName: string, lastName: string) {
  return `${firstName.at(0) ?? ''}${lastName.at(0) ?? ''}`.toUpperCase() || 'CL';
}

function toCustomerAlert(customer: ApiCustomer): Alert {
  if (!customer.paymentAlertsEnabled) return 'Al día';
  if (customer.alertStatus === 'vencido') return 'Vencido';
  if (customer.alertStatus === 'hoy') return 'Hoy';
  return 'Al día';
}

function toCustomerRow(customer: ApiCustomer): CustomerRow {
  return {
    id: customer.id,
    name: `${customer.firstName} ${customer.lastName}`,
    owner: 'Equipo CRM',
    channel: customer.acquisitionChannel,
    balance: customer.balanceAmount ?? '0.00',
    currency: customer.balanceCurrency ?? 'USD',
    due: customer.nextDueDate ? String(customer.nextDueDate).slice(0, 10) : 'Sin venta activa',
    alert: toCustomerAlert(customer),
    initials: initials(customer.firstName, customer.lastName),
    apiCustomer: customer,
  };
}

function toFormState(customer: ApiCustomer): CustomerFormState {
  return {
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email ?? '',
    phone: customer.phone ?? '',
    country: customer.country ?? '',
    acquisitionChannel: customer.acquisitionChannel,
    paymentAlertsEnabled: customer.paymentAlertsEnabled,
    marketingConsent: Boolean(customer.marketingConsentAt),
  };
}

function toCustomerInput(form: CustomerFormState): CreateCustomerInput {
  return {
    firstName: form.firstName,
    lastName: form.lastName,
    email: form.email || null,
    phone: form.phone || null,
    country: form.country || null,
    acquisitionChannel: form.acquisitionChannel,
    paymentAlertsEnabled: form.paymentAlertsEnabled,
    marketingConsent: form.marketingConsent,
  };
}

function Login({ onLogin }: { onLogin: (session: Session) => void }) {
  const [companySlug, setCompanySlug] = useState('demo');
  const [email, setEmail] = useState('demo@modularcrm.com');
  const [password, setPassword] = useState('demostracion-local');
  const [mfaCode, setMfaCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const session = await loginWithPassword({ companySlug, email, password, ...(mfaCode ? { mfaCode } : {}) });
      onLogin({ ...session, companySlug });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setBusy(false);
    }
  };
  return <main className="login-page">
    <section className="login-intro">
      <div className="brand brand-light"><span className="brand-mark">M</span><span>MODULAR<small>CRM OPERATIVO</small></span></div>
      <p className="eyebrow">Ventas bajo control</p>
      <h1>Una vista clara.<br/><em>Decisiones rápidas.</em></h1>
      <p>Clientes, cobros y actividad comercial en un solo lugar, sin ruido innecesario.</p>
      <div className="login-rule"><span>09</span><span>JUL · 2026</span></div>
    </section>
    <section className="login-panel" aria-labelledby="login-title">
      <form onSubmit={submit}>
        <p className="eyebrow terracotta">Acceso seguro</p>
        <h2 id="login-title">Bienvenido de nuevo</h2>
        <p>Ingresa a tu espacio de trabajo.</p>
        <label>Empresa<input value={companySlug} onChange={event => setCompanySlug(event.target.value)} required autoComplete="organization" /></label>
        <label>Correo electrónico<input type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="email" /></label>
        <label>Contraseña<input type="password" value={password} onChange={event => setPassword(event.target.value)} required autoComplete="current-password" /></label>
        <label>Código MFA <small>si está activado</small><input value={mfaCode} onChange={event => setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" pattern="\d{6}" autoComplete="one-time-code" placeholder="000000" /></label>
        <div className="form-options"><label className="check"><input type="checkbox"/> Recordarme</label><button type="button" className="text-button">¿Olvidaste tu contraseña?</button></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary login-button" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar al CRM'}<span aria-hidden="true">→</span></button>
        <small className="login-help">Conectado a la API local · Los datos quedan aislados por empresa</small>
      </form>
    </section>
  </main>;
}

function Sidebar({ onLogout, customerCount }: { onLogout: () => void; customerCount: number | 'API' }) {
  return <aside className="sidebar">
    <div className="brand"><span className="brand-mark">M</span><span>MODULAR<small>CRM OPERATIVO</small></span></div>
    <nav aria-label="Navegación principal">
      <p className="nav-label">OPERACIÓN</p>
      <a className="active" href="#dashboard"><Icon>⌁</Icon>Resumen</a>
      <a href="#clientes"><Icon>◎</Icon>Clientes<span className="nav-count">{customerCount}</span></a>
      <a href="#ventas"><Icon>↗</Icon>Ventas</a>
      <a href="#cobros"><Icon>$</Icon>Cobros<span className="dot-alert" title="Cobros pendientes" /></a>
      <p className="nav-label">GESTIÓN</p>
      <a href="#actividad"><Icon>≡</Icon>Actividad</a>
      <a href="#campanas"><Icon>◇</Icon>Campañas</a>
      <a href="#reportes"><Icon>▥</Icon>Reportes</a>
    </nav>
    <div className="sidebar-bottom">
      <a href="#ajustes"><Icon>⚙</Icon>Ajustes</a>
      <button onClick={onLogout} className="profile"><span className="avatar">CRM</span><span><b>Sesión activa</b><small>API protegida</small></span><span aria-hidden="true">···</span></button>
    </div>
  </aside>;
}

const metrics = [
  { label: 'CLIENTES ACTIVOS', value: '128', delta: '+8 este mes', tone: 'ink' },
  { label: 'VENCEN HOY', value: '6', delta: '2 requieren atención', tone: 'urgent' },
  { label: 'VENCIDOS', value: '0', delta: 'alertas reales', tone: 'urgent' },
  { label: 'USD COBRADO / SALDO', value: '0.00 / 0.00', delta: 'datos reales', tone: 'sage' },
  { label: 'ARS COBRADO / SALDO', value: '0.00 / 0.00', delta: 'datos reales', tone: 'sage' },
];

function StatusBadge({ status }: { status: Alert }) {
  return <span className={`status ${status === 'Vencido' ? 'late' : status === 'Hoy' ? 'today' : 'ok'}`}><i/>{status}</span>;
}

function CustomerForm({ busy, error, initialValue, mode, onCancel, onSubmit }: { busy: boolean; error: string | null; initialValue?: CustomerFormState; mode: 'create' | 'edit'; onCancel: () => void; onSubmit: (value: CustomerFormState) => void }) {
  const [form, setForm] = useState<CustomerFormState>(initialValue ?? emptyCustomerForm);
  const update = <K extends keyof CustomerFormState>(key: K, value: CustomerFormState[K]) => setForm(current => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(form);
  };
  return <div className="modal-backdrop" role="presentation">
    <form className="customer-form" aria-labelledby="customer-form-title" onSubmit={submit}>
      <div className="section-title compact"><div><p className="eyebrow">{mode === 'create' ? 'Nuevo registro' : 'Actualizar registro'}</p><h2 id="customer-form-title">{mode === 'create' ? 'Crear cliente' : 'Editar cliente'}</h2></div><button type="button" className="text-button" onClick={onCancel}>Cerrar</button></div>
      <div className="form-grid">
        <label>Nombre<input value={form.firstName} onChange={event => update('firstName', event.target.value)} required /></label>
        <label>Apellido<input value={form.lastName} onChange={event => update('lastName', event.target.value)} required /></label>
        <label>Email<input type="email" value={form.email} onChange={event => update('email', event.target.value)} /></label>
        <label>Teléfono<input value={form.phone} onChange={event => update('phone', event.target.value)} /></label>
        <label>País<input value={form.country} onChange={event => update('country', event.target.value)} /></label>
        <label>Canal<select value={form.acquisitionChannel} onChange={event => update('acquisitionChannel', event.target.value as AcquisitionChannel)}><option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="otro">Otro</option></select></label>
      </div>
      <div className="form-options"><label className="check"><input type="checkbox" checked={form.paymentAlertsEnabled} onChange={event => update('paymentAlertsEnabled', event.target.checked)}/> Alertas de cobro</label><label className="check"><input type="checkbox" checked={form.marketingConsent} onChange={event => update('marketingConsent', event.target.checked)}/> Consentimiento marketing</label></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary login-button" disabled={busy}>{busy ? 'Guardando…' : mode === 'create' ? 'Guardar cliente' : 'Guardar cambios'}<span aria-hidden="true">→</span></button>
    </form>
  </div>;
}

function money(currency: Currency, amount: string) {
  return `${currency} ${amount}`;
}

function balance(amount: string, paid: string) {
  return (Number(amount) - Number(paid)).toFixed(2);
}

function dashboardTotal(dashboard: FinanceDashboard | null, currency: Currency) {
  const total = dashboard?.totals.find(item => item.currency === currency);
  return total ? `${total.paid} / ${total.balance}` : '0.00 / 0.00';
}

function CustomerDrawer({ customer, session, busy, error, onClose, onDelete, onEdit, onFinanceChange }: { customer: ApiCustomer; session: Session; busy: boolean; error: string | null; onClose: () => void; onDelete: () => void; onEdit: () => void; onFinanceChange: () => void }) {
  const [finance, setFinance] = useState<FinanceSummary | null>(null);
  const [financeError, setFinanceError] = useState<string | null>(null);
  const [financeBusy, setFinanceBusy] = useState(false);
  const [customerNotes, setCustomerNotes] = useState<CustomerNote[]>([]);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [notesBusy, setNotesBusy] = useState(false);
  const [noteBody, setNoteBody] = useState('');
  const [saleForm, setSaleForm] = useState({ productName: 'Servicio CRM', totalAmount: '1000.00', currency: 'USD' as Currency, firstAmount: '500.00', secondAmount: '500.00', firstDueDate: '2026-08-10', secondDueDate: '2026-09-10' });
  const [paymentForm, setPaymentForm] = useState({ installmentId: '', amount: '100.00', method: 'transferencia' as const });

  const loadFinance = useCallback(async () => {
    setFinanceBusy(true);
    setFinanceError(null);
    try {
      const summary = await fetchFinanceSummary(session, customer.id);
      setFinance(summary);
      setPaymentForm(current => ({ ...current, installmentId: current.installmentId || summary.installments.find(item => item.status !== 'pagada')?.installmentId || '' }));
    } catch (err) {
      setFinanceError(err instanceof Error ? err.message : 'No se pudo cargar el resumen financiero');
    } finally {
      setFinanceBusy(false);
    }
  }, [customer.id, session]);


  const loadNotes = useCallback(async () => {
    setNotesBusy(true);
    setNotesError(null);
    try {
      setCustomerNotes(await fetchCustomerNotes(session, customer.id));
    } catch (err) {
      setNotesError(err instanceof Error ? err.message : 'No se pudo cargar la bitácora');
    } finally {
      setNotesBusy(false);
    }
  }, [customer.id, session]);
  useEffect(() => { void loadFinance(); }, [loadFinance]);
  useEffect(() => { void loadNotes(); }, [loadNotes]);


  const submitNote = async (event: FormEvent) => {
    event.preventDefault();
    setNotesBusy(true);
    setNotesError(null);
    try {
      const created = await createCustomerNote(session, customer.id, noteBody);
      setCustomerNotes(current => [{ ...created, authorName: created.authorName ?? 'Equipo CRM' }, ...current]);
      setNoteBody('');
    } catch (err) {
      setNotesError(err instanceof Error ? err.message : 'No se pudo guardar la nota');
    } finally {
      setNotesBusy(false);
    }
  };
  const submitSale = async (event: FormEvent) => {
    event.preventDefault();
    setFinanceBusy(true);
    setFinanceError(null);
    try {
      await createSale(session, customer.id, {
        productName: saleForm.productName,
        totalAmount: saleForm.totalAmount,
        currency: saleForm.currency,
        installments: [
          { amount: saleForm.firstAmount, dueDate: saleForm.firstDueDate },
          { amount: saleForm.secondAmount, dueDate: saleForm.secondDueDate },
        ],
      });
      await loadFinance();
    } catch (err) {
      setFinanceError(err instanceof Error ? err.message : 'No se pudo crear la venta');
      setFinanceBusy(false);
    }
  };

  const submitPayment = async (event: FormEvent) => {
    event.preventDefault();
    const installment = finance?.installments.find(item => item.installmentId === paymentForm.installmentId);
    if (!installment) return;
    setFinanceBusy(true);
    setFinanceError(null);
    try {
      await createPayment(session, installment.installmentId, { amount: paymentForm.amount, currency: installment.currency, method: paymentForm.method });
      await loadFinance();
      onFinanceChange();
    } catch (err) {
      setFinanceError(err instanceof Error ? err.message : 'No se pudo registrar el pago');
      setFinanceBusy(false);
    }
  };

  return <aside className="customer-drawer" aria-label="Ficha del cliente">
    <div className="section-title compact"><div><p className="eyebrow">Ficha lateral</p><h2>{customer.firstName} {customer.lastName}</h2></div><button type="button" className="text-button" onClick={onClose}>Cerrar</button></div>
    <dl className="customer-details">
      <div><dt>Email</dt><dd>{customer.email ?? 'Sin email'}</dd></div>
      <div><dt>Teléfono</dt><dd>{customer.phone ?? 'Sin teléfono'}</dd></div>
      <div><dt>País</dt><dd>{customer.country ?? 'Sin país'}</dd></div>
      <div><dt>Canal</dt><dd>{customer.acquisitionChannel}</dd></div>
      <div><dt>Alertas de cobro</dt><dd>{customer.paymentAlertsEnabled ? `Activas · ${customer.alertStatus}` : 'Desactivadas'}</dd></div>
      <div><dt>Próximo vencimiento</dt><dd>{customer.nextDueDate ? String(customer.nextDueDate).slice(0, 10) : 'Sin cuotas pendientes'}</dd></div>
      <div><dt>Saldo visible</dt><dd>{customer.balanceCurrency ? money(customer.balanceCurrency, customer.balanceAmount) : 'Sin saldo'}</dd></div>
      <div><dt>Marketing</dt><dd>{customer.marketingConsentAt ? 'Consentido' : 'Sin consentimiento'}</dd></div>
    </dl>

    <section className="finance-panel">
      <div className="section-title compact"><div><p className="eyebrow">Finanzas</p><h2>Ventas y cuotas</h2></div><button type="button" className="text-button" onClick={() => void loadFinance()} disabled={financeBusy}>Actualizar</button></div>
      {financeBusy && <p className="muted-line">Cargando resumen financiero…</p>}
      {financeError && <p className="form-error" role="alert">{financeError}</p>}
      <div className="finance-totals">
        {(finance?.totals.length ? finance.totals : [{ currency: 'USD' as Currency, scheduled: '0.00', paid: '0.00' }]).map(total => <article key={total.currency}><span>{total.currency}</span><b>{total.paid}</b><small>cobrado de {total.scheduled}</small></article>)}
      </div>
      <div className="installments-list">
        {finance?.installments.map(item => <article key={item.installmentId} className={item.status}>
          <div><b>{item.productName}</b><small>Cuota {item.sequence} · vence {String(item.dueDate).slice(0, 10)}</small></div>
          <div><b>{money(item.currency, balance(item.installmentAmount, item.paidAmount))}</b><small>{item.status}</small></div>
        </article>)}
        {finance && finance.installments.length === 0 && <p className="muted-line">Sin ventas registradas.</p>}
      </div>
      <form className="mini-form" onSubmit={submitSale}>
        <h3>Nueva venta</h3>
        <label>Producto<input value={saleForm.productName} onChange={event => setSaleForm(current => ({ ...current, productName: event.target.value }))} required /></label>
        <div className="form-grid"><label>Total<input value={saleForm.totalAmount} onChange={event => setSaleForm(current => ({ ...current, totalAmount: event.target.value }))} required /></label><label>Moneda<select value={saleForm.currency} onChange={event => setSaleForm(current => ({ ...current, currency: event.target.value as Currency }))}><option value="USD">USD</option><option value="ARS">ARS</option></select></label></div>
        <div className="form-grid"><label>Cuota 1<input value={saleForm.firstAmount} onChange={event => setSaleForm(current => ({ ...current, firstAmount: event.target.value }))} required /></label><label>Vence<input type="date" value={saleForm.firstDueDate} onChange={event => setSaleForm(current => ({ ...current, firstDueDate: event.target.value }))} required /></label></div>
        <div className="form-grid"><label>Cuota 2<input value={saleForm.secondAmount} onChange={event => setSaleForm(current => ({ ...current, secondAmount: event.target.value }))} required /></label><label>Vence<input type="date" value={saleForm.secondDueDate} onChange={event => setSaleForm(current => ({ ...current, secondDueDate: event.target.value }))} required /></label></div>
        <button className="secondary" disabled={financeBusy}>Crear venta</button>
      </form>
      <form className="mini-form" onSubmit={submitPayment}>
        <h3>Registrar pago</h3>
        <label>Cuota<select value={paymentForm.installmentId} onChange={event => setPaymentForm(current => ({ ...current, installmentId: event.target.value }))} required>{finance?.installments.map(item => <option key={item.installmentId} value={item.installmentId}>{item.productName} · cuota {item.sequence} · saldo {money(item.currency, balance(item.installmentAmount, item.paidAmount))}</option>)}</select></label>
        <div className="form-grid"><label>Monto<input value={paymentForm.amount} onChange={event => setPaymentForm(current => ({ ...current, amount: event.target.value }))} required /></label><label>Método<select value={paymentForm.method} onChange={event => setPaymentForm(current => ({ ...current, method: event.target.value as typeof paymentForm.method }))}><option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option><option value="tarjeta_debito">Débito</option><option value="tarjeta_credito">Crédito</option><option value="criptomoneda">Criptomoneda</option></select></label></div>
        <button className="secondary" disabled={financeBusy || !paymentForm.installmentId}>Registrar pago</button>
      </form>
    </section>

    <section className="notes-live-panel">
      <div className="section-title compact"><div><p className="eyebrow">Bitácora</p><h2>Notas del cliente</h2></div><button type="button" className="text-button" onClick={() => void loadNotes()} disabled={notesBusy}>Actualizar</button></div>
      {notesBusy && <p className="muted-line">Cargando bitácora…</p>}
      {notesError && <p className="form-error" role="alert">{notesError}</p>}
      <form className="mini-form" onSubmit={submitNote}>
        <label>Nueva nota<textarea value={noteBody} onChange={event => setNoteBody(event.target.value)} required maxLength={5000} placeholder="Registrar llamada, acuerdo o seguimiento…" /></label>
        <button className="secondary" disabled={notesBusy || noteBody.trim().length === 0}>Guardar nota</button>
      </form>
      <div className="live-notes-list">
        {customerNotes.map(note => <article key={note.id}><p>{note.body}</p><small>{note.authorName ?? 'Equipo CRM'} · {new Date(note.createdAt).toLocaleString()}</small></article>)}
        {!notesBusy && customerNotes.length === 0 && <p className="muted-line">Sin notas registradas.</p>}
      </div>
    </section>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="drawer-actions"><button className="secondary" onClick={onEdit} disabled={busy}>Editar cliente</button><button className="danger-button" onClick={onDelete} disabled={busy}>{busy ? 'Eliminando…' : 'Eliminar'}</button></div>
  </aside>;
}
function Dashboard({ onLogout, session }: { onLogout: () => void; session: Session }) {
  const [query, setQuery] = useState('');
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [apiCustomers, setApiCustomers] = useState<ApiCustomer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [financeDashboard, setFinanceDashboard] = useState<FinanceDashboard | null>(null);
  const [financeDashboardError, setFinanceDashboardError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedCustomer = apiCustomers.find(customer => customer.id === selectedCustomerId) ?? null;

  const loadCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    setCustomerError(null);
    try {
      const rows = await fetchCustomers(session);
      setApiCustomers(rows);
    } catch (err) {
      setCustomerError(err instanceof Error ? err.message : 'No se pudieron cargar clientes');
    } finally {
      setLoadingCustomers(false);
    }
  }, [session]);

  const loadFinanceDashboard = useCallback(async () => {
    setFinanceDashboardError(null);
    try {
      setFinanceDashboard(await fetchFinanceDashboard(session));
    } catch (err) {
      setFinanceDashboardError(err instanceof Error ? err.message : 'No se pudo cargar el resumen financiero');
    }
  }, [session]);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, []);

  useEffect(() => { void loadCustomers(); void loadFinanceDashboard(); }, [loadCustomers, loadFinanceDashboard]);

  const openCreateForm = () => {
    setFormError(null);
    setFormMode('create');
  };

  const openEditForm = () => {
    setFormError(null);
    setFormMode('edit');
  };

  const saveCustomer = async (value: CustomerFormState) => {
    setSavingCustomer(true);
    setFormError(null);
    try {
      if (formMode === 'edit' && selectedCustomer) {
        const updated = await updateCustomer(session, selectedCustomer.id, toCustomerInput(value));
        setApiCustomers(current => current.map(customer => customer.id === updated.id ? updated : customer));
        setSelectedCustomerId(updated.id);
      } else {
        const created = await createCustomer(session, toCustomerInput(value));
        setApiCustomers(current => [created, ...current]);
        setSelectedCustomerId(created.id);
      }
      setFormMode(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo guardar el cliente');
    } finally {
      setSavingCustomer(false);
    }
  };

  const removeSelectedCustomer = async () => {
    if (!selectedCustomer) return;
    if (!window.confirm(`Eliminar lógicamente a ${selectedCustomer.firstName} ${selectedCustomer.lastName}?`)) return;
    setDeletingCustomer(true);
    setDrawerError(null);
    try {
      await deleteCustomer(session, selectedCustomer.id);
      setApiCustomers(current => current.filter(customer => customer.id !== selectedCustomer.id));
      setSelectedCustomerId(null);
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : 'No se pudo eliminar el cliente');
    } finally {
      setDeletingCustomer(false);
    }
  };

  const usingFallback = loadingCustomers || Boolean(customerError);
  const apiRows = apiCustomers.map(toCustomerRow);
  const demoRows: CustomerRow[] = demoCustomers.map(customer => ({ ...customer, id: String(customer.id) }));
  const customerRows = usingFallback ? demoRows : apiRows;
  const filtered = useMemo(() => customerRows.filter(c => `${c.name} ${c.owner} ${c.channel}`.toLowerCase().includes(query.toLowerCase())), [customerRows, query]);
  const dueTodayCount = apiCustomers.filter(customer => customer.paymentAlertsEnabled && customer.alertStatus === 'hoy').length;
  const overdueCount = apiCustomers.filter(customer => customer.paymentAlertsEnabled && customer.alertStatus === 'vencido').length;
  const metricValue = (label: string, fallback: string) => {
    if (usingFallback) return fallback;
    if (label === 'CLIENTES ACTIVOS') return apiCustomers.length;
    if (label === 'VENCEN HOY') return dueTodayCount;
    if (label === 'VENCIDOS') return overdueCount;
    if (label === 'USD COBRADO / SALDO') return dashboardTotal(financeDashboard, 'USD');
    if (label === 'ARS COBRADO / SALDO') return dashboardTotal(financeDashboard, 'ARS');
    return fallback;
  };
  return <div className="app-shell">
    <Sidebar onLogout={onLogout} customerCount={usingFallback ? 'API' : apiCustomers.length}/>
    <div className="workspace">
      <header className="topbar"><div className="search"><span aria-hidden="true">⌕</span><input ref={searchRef} aria-label="Buscar clientes" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar clientes…"/><kbd>Ctrl K</kbd></div><button aria-label="Notificaciones disponibles próximamente" disabled className="icon-button">♢<i/></button><span className="top-date">JUEVES, 09 JUL 2026</span></header>
      <main id="dashboard" className="main-content">
        <section className="page-heading"><div><p className="eyebrow">Centro de operaciones</p><h1>Buen día.</h1><p>Sesión conectada a empresa <b>{session.companySlug}</b>.</p></div><button className="primary" onClick={openCreateForm}><span>＋</span> Nuevo cliente</button></section>
        {customerError && <div className="toast" role="alert">No se pudo cargar la API de clientes: {customerError}. Mostrando datos de referencia visual.<button onClick={() => setCustomerError(null)}>Cerrar</button></div>}
        {financeDashboardError && <div className="toast" role="alert">No se pudo cargar el resumen financiero: {financeDashboardError}.<button onClick={() => setFinanceDashboardError(null)}>Cerrar</button></div>}
        <section className="metrics" aria-label="Indicadores principales">{metrics.map(m => <article key={m.label} className={`metric ${m.tone}`}><p>{m.label}</p><strong>{metricValue(m.label, m.value)}</strong><small>{m.delta}</small></article>)}</section>
        <div className="dashboard-grid">
          <section className="customer-section" id="clientes">
            <div className="section-title"><div><p className="eyebrow">Cartera activa</p><h2>{loadingCustomers ? 'Cargando clientes de la API…' : 'Clientes del espacio de trabajo'}</h2></div>{query && <button className="text-button" onClick={() => setQuery('')}>Limpiar filtro</button>}</div>
            <div className="table-wrap"><table><thead><tr><th>CLIENTE</th><th>RESPONSABLE</th><th>CANAL</th><th>SALDO</th><th>PRÓXIMO VENC.</th><th>ESTADO</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>
              {filtered.map((c, index) => <tr key={c.id}><td><button className="customer row-customer" onClick={() => c.apiCustomer && setSelectedCustomerId(c.id)} disabled={!c.apiCustomer}><span className="customer-mark">{c.initials}</span><span><b>{c.name}</b><small>CL-{String(index + 1042).padStart(4, '0')}</small></span></button></td><td>{c.owner}</td><td><span className="channel">{c.channel}</span></td><td><b>{c.currency === 'USD' ? 'US$' : '$'} {c.balance}</b><small>{c.currency}</small></td><td>{c.due}</td><td><StatusBadge status={c.alert}/></td><td><button className="row-action" aria-label={`Abrir ficha de ${c.name}`} onClick={() => c.apiCustomer && setSelectedCustomerId(c.id)} disabled={!c.apiCustomer}>···</button></td></tr>)}
            </tbody></table>{filtered.length === 0 && <div className="empty"><b>Sin resultados</b><p>Prueba con otro nombre, canal o responsable.</p></div>}</div>
          </section>
          <aside className="activity-rail">
            <section id="cobros" className="timeline-panel"><div className="section-title compact"><div><p className="eyebrow">Agenda de hoy</p><h2>Próximos cobros</h2></div><span className="date-tile"><b>09</b>JUL</span></div>
              <div className="timeline">{collections.map(item => <article key={item.time} className={item.state}><time>{item.time}</time><div className="timeline-marker"/><div><b>{item.name}</b><p>{item.detail}</p><button>Ver cliente →</button></div></article>)}</div>
              <button className="secondary" onClick={openCreateForm}>Crear cliente de agenda</button>
            </section>
            <section id="actividad" className="notes-panel"><div className="section-title compact"><div><p className="eyebrow">Equipo</p><h2>Actividad reciente</h2></div></div>{notes.map(n => <article className="note" key={n.text}><span>{n.initials}</span><div><p>{n.text}</p><time>{n.time}</time></div></article>)}</section>
          </aside>
        </div>
      </main>
    </div>
    {selectedCustomer && <CustomerDrawer customer={selectedCustomer} session={session} busy={deletingCustomer} error={drawerError} onClose={() => setSelectedCustomerId(null)} onDelete={removeSelectedCustomer} onEdit={openEditForm} onFinanceChange={() => { void loadCustomers(); void loadFinanceDashboard(); }}/>}
    {formMode && <CustomerForm busy={savingCustomer} error={formError} initialValue={formMode === 'edit' && selectedCustomer ? toFormState(selectedCustomer) : undefined} mode={formMode} onCancel={() => setFormMode(null)} onSubmit={saveCustomer}/>}
  </div>;
}

function readStoredSession(): Session | null {
  const value = sessionStorage.getItem('crm-session');
  if (!value) return null;
  try { return JSON.parse(value) as Session; } catch { return null; }
}

export function App() {
  const [session, setSession] = useState<Session | null>(() => readStoredSession());
  const login = (nextSession: Session) => { sessionStorage.setItem('crm-session', JSON.stringify(nextSession)); setSession(nextSession); };
  const logout = () => { sessionStorage.removeItem('crm-session'); setSession(null); };
  return session ? <Dashboard onLogout={logout} session={session}/> : <Login onLogin={login}/>;
}
