import { describe, expect, it } from 'vitest';
import { toCsv } from '../src/common/csv.js';

describe('toCsv', () => {
  it('escapes commas, quotes and new lines', () => {
    const csv = toCsv(
      [{ header: 'Nombre', value: row => row.name as string }, { header: 'Nota', value: row => row.note as string }],
      [{ name: 'Ana, CRM', note: 'Dijo "sí"\nSeguimiento' }],
    );
    expect(csv).toBe('Nombre,Nota\n"Ana, CRM","Dijo ""sí""\nSeguimiento"\n');
  });
});
