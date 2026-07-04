export type Currency = 'USD' | 'ARS';
export type Alert = 'Vencido' | 'Hoy' | 'Al día';

export interface Customer {
  id: number; name: string; initials: string; owner: string; channel: string;
  balance: string; currency: Currency; due: string; alert: Alert;
}

export const customers: Customer[] = [
  { id: 1, name: 'Estudio Altamar', initials: 'EA', owner: 'Lucía Méndez', channel: 'Referido', balance: '1.250', currency: 'USD', due: '03 jul', alert: 'Vencido' },
  { id: 2, name: 'Comercial Norte', initials: 'CN', owner: 'Martín Rojas', channel: 'Web', balance: '785.000', currency: 'ARS', due: 'Hoy, 16:00', alert: 'Hoy' },
  { id: 3, name: 'Patagonia Circular', initials: 'PC', owner: 'Lucía Méndez', channel: 'LinkedIn', balance: '860', currency: 'USD', due: '08 jul', alert: 'Al día' },
  { id: 4, name: 'Clínica del Parque', initials: 'CP', owner: 'Sofía Vidal', channel: 'Evento', balance: '420.000', currency: 'ARS', due: '11 jul', alert: 'Al día' },
  { id: 5, name: 'Río Claro Logística', initials: 'RC', owner: 'Martín Rojas', channel: 'Referido', balance: '2.100', currency: 'USD', due: '15 jul', alert: 'Al día' },
];

export const collections = [
  { time: '09:30', name: 'Estudio Altamar', detail: 'USD 1.250 · 1 día vencido', state: 'late' },
  { time: '12:00', name: 'Comercial Norte', detail: 'ARS 785.000 · Transferencia', state: 'today' },
  { time: '16:30', name: 'Órbita Sur', detail: 'USD 430 · Confirmar recepción', state: 'next' },
];

export const notes = [
  { initials: 'LM', text: 'Lucía registró una llamada con Patagonia Circular.', time: 'Hace 18 min' },
  { initials: 'MR', text: 'Martín actualizó la fecha de cobro de Comercial Norte.', time: 'Hace 1 h' },
  { initials: 'SV', text: 'Sofía agregó una nota en Clínica del Parque.', time: 'Hace 3 h' },
];
