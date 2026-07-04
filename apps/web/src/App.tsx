import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { collections, customers, notes, type Alert } from './data';

const Icon = ({ children }: { children: string }) => <span className="nav-icon" aria-hidden="true">{children}</span>;

function Login({ onLogin }: { onLogin: () => void }) {
  const [busy, setBusy] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault(); setBusy(true); window.setTimeout(onLogin, 450);
  };
  return <main className="login-page">
    <section className="login-intro">
      <div className="brand brand-light"><span className="brand-mark">M</span><span>MODULAR<small>CRM OPERATIVO</small></span></div>
      <p className="eyebrow">Ventas bajo control</p>
      <h1>Una vista clara.<br/><em>Decisiones rápidas.</em></h1>
      <p>Clientes, cobros y actividad comercial en un solo lugar, sin ruido innecesario.</p>
      <div className="login-rule"><span>04</span><span>JUL · 2026</span></div>
    </section>
    <section className="login-panel" aria-labelledby="login-title">
      <form onSubmit={submit}>
        <p className="eyebrow terracotta">Acceso seguro</p>
        <h2 id="login-title">Bienvenido de nuevo</h2>
        <p>Ingresa a tu espacio de trabajo.</p>
        <label>Correo electrónico<input type="email" defaultValue="demo@modularcrm.com" required autoComplete="email" /></label>
        <label>Contraseña<input type="password" defaultValue="demostracion" required autoComplete="current-password" /></label>
        <div className="form-options"><label className="check"><input type="checkbox"/> Recordarme</label><button type="button" className="text-button">¿Olvidaste tu contraseña?</button></div>
        <button className="primary login-button" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar al CRM'}<span aria-hidden="true">→</span></button>
        <small className="login-help">Acceso de demostración · No se envían datos</small>
      </form>
    </section>
  </main>;
}

function Sidebar({ onLogout }: { onLogout: () => void }) {
  return <aside className="sidebar">
    <div className="brand"><span className="brand-mark">M</span><span>MODULAR<small>CRM OPERATIVO</small></span></div>
    <nav aria-label="Navegación principal">
      <p className="nav-label">OPERACIÓN</p>
      <a className="active" href="#dashboard"><Icon>⌁</Icon>Resumen</a>
      <a href="#clientes"><Icon>◎</Icon>Clientes<span className="nav-count">128</span></a>
      <a href="#ventas"><Icon>↗</Icon>Ventas</a>
      <a href="#cobros"><Icon>$</Icon>Cobros<span className="dot-alert" title="Cobros pendientes" /></a>
      <p className="nav-label">GESTIÓN</p>
      <a href="#actividad"><Icon>≡</Icon>Actividad</a>
      <a href="#campanas"><Icon>◇</Icon>Campañas</a>
      <a href="#reportes"><Icon>▥</Icon>Reportes</a>
    </nav>
    <div className="sidebar-bottom">
      <a href="#ajustes"><Icon>⚙</Icon>Ajustes</a>
      <button onClick={onLogout} className="profile"><span className="avatar">LM</span><span><b>Lucía Méndez</b><small>Administradora</small></span><span aria-hidden="true">···</span></button>
    </div>
  </aside>;
}

const metrics = [
  { label: 'CLIENTES ACTIVOS', value: '128', delta: '+8 este mes', tone: 'ink' },
  { label: 'VENCEN HOY', value: '6', delta: '2 requieren atención', tone: 'urgent' },
  { label: 'COBRADO EN USD', value: '$ 18.450', delta: '↑ 12,4% vs. junio', tone: 'sage' },
  { label: 'COBRADO EN ARS', value: '$ 9,2 M', delta: '↑ 7,8% vs. junio', tone: 'sage' },
];

function StatusBadge({ status }: { status: Alert }) {
  return <span className={`status ${status === 'Vencido' ? 'late' : status === 'Hoy' ? 'today' : 'ok'}`}><i/>{status}</span>;
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
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
  const filtered = useMemo(() => customers.filter(c => `${c.name} ${c.owner} ${c.channel}`.toLowerCase().includes(query.toLowerCase())), [query]);
  return <div className="app-shell">
    <Sidebar onLogout={onLogout}/>
    <div className="workspace">
      <header className="topbar"><div className="search"><span aria-hidden="true">⌕</span><input ref={searchRef} aria-label="Buscar clientes" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar clientes…"/><kbd>Ctrl K</kbd></div><button aria-label="Notificaciones disponibles próximamente" disabled className="icon-button">♢<i/></button><span className="top-date">SÁBADO, 04 JUL 2026</span></header>
      <main id="dashboard" className="main-content">
        <section className="page-heading"><div><p className="eyebrow">Centro de operaciones</p><h1>Buen día, Lucía.</h1><p>Esto es lo que requiere tu atención hoy.</p></div><button className="primary" onClick={() => setNotice(true)}><span>＋</span> Nuevo cliente</button></section>
        {notice && <div className="toast" role="status">Formulario de cliente preparado para la próxima integración API.<button onClick={() => setNotice(false)}>Cerrar</button></div>}
        <section className="metrics" aria-label="Indicadores principales">{metrics.map(m => <article key={m.label} className={`metric ${m.tone}`}><p>{m.label}</p><strong>{m.value}</strong><small>{m.delta}</small></article>)}</section>
        <div className="dashboard-grid">
          <section className="customer-section" id="clientes">
            <div className="section-title"><div><p className="eyebrow">Cartera activa</p><h2>Clientes que requieren seguimiento</h2></div>{query && <button className="text-button" onClick={() => setQuery('')}>Limpiar filtro</button>}</div>
            <div className="table-wrap"><table><thead><tr><th>CLIENTE</th><th>RESPONSABLE</th><th>CANAL</th><th>SALDO</th><th>PRÓXIMO VENC.</th><th>ESTADO</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>
              {filtered.map(c => <tr key={c.id}><td><div className="customer"><span className="customer-mark">{c.initials}</span><div><b>{c.name}</b><small>CL-{String(c.id + 1041).padStart(4, '0')}</small></div></div></td><td>{c.owner}</td><td><span className="channel">{c.channel}</span></td><td><b>{c.currency === 'USD' ? 'US$' : '$'} {c.balance}</b><small>{c.currency}</small></td><td>{c.due}</td><td><StatusBadge status={c.alert}/></td><td><button className="row-action" aria-label={`Acciones para ${c.name}`}>···</button></td></tr>)}
            </tbody></table>{filtered.length === 0 && <div className="empty"><b>Sin resultados</b><p>Prueba con otro nombre, canal o responsable.</p></div>}</div>
          </section>
          <aside className="activity-rail">
            <section id="cobros" className="timeline-panel"><div className="section-title compact"><div><p className="eyebrow">Agenda de hoy</p><h2>Próximos cobros</h2></div><span className="date-tile"><b>04</b>JUL</span></div>
              <div className="timeline">{collections.map(item => <article key={item.time} className={item.state}><time>{item.time}</time><div className="timeline-marker"/><div><b>{item.name}</b><p>{item.detail}</p><button>Ver cliente →</button></div></article>)}</div>
              <button className="secondary" onClick={() => setNotice(true)}>Ver resumen de agenda</button>
            </section>
            <section id="actividad" className="notes-panel"><div className="section-title compact"><div><p className="eyebrow">Equipo</p><h2>Actividad reciente</h2></div></div>{notes.map(n => <article className="note" key={n.text}><span>{n.initials}</span><div><p>{n.text}</p><time>{n.time}</time></div></article>)}</section>
          </aside>
        </div>
      </main>
    </div>
  </div>;
}

export function App() {
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem('crm-demo') === 'true');
  const login = () => { sessionStorage.setItem('crm-demo', 'true'); setAuthenticated(true); };
  const logout = () => { sessionStorage.removeItem('crm-demo'); setAuthenticated(false); };
  return authenticated ? <Dashboard onLogout={logout}/> : <Login onLogin={login}/>;
}
