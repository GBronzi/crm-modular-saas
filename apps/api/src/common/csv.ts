export type CsvValue = string | number | boolean | Date | null | undefined;

export function toCsv(columns: Array<{ header: string; value: (row: Record<string, unknown>) => CsvValue }>, rows: Record<string, unknown>[]) {
  const lines = [columns.map(column => escapeCsv(column.header)).join(',')];
  for (const row of rows) {
    lines.push(columns.map(column => escapeCsv(column.value(row))).join(','));
  }
  return `${lines.join('\n')}\n`;
}

function escapeCsv(value: CsvValue) {
  const text = value instanceof Date ? value.toISOString() : value == null ? '' : String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}
