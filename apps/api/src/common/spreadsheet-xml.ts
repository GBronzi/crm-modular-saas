export type SpreadsheetValue = string | number | boolean | Date | null | undefined;

export function toSpreadsheetXml(columns: Array<{ header: string; value: (row: Record<string, unknown>) => SpreadsheetValue }>, rows: Record<string, unknown>[]) {
  const header = '<?xml version="1.0" encoding="UTF-8"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n<Worksheet ss:Name="Clientes"><Table>';
  const footer = '</Table></Worksheet></Workbook>\n';
  const headerRow = `<Row>${columns.map(column => cell(column.header)).join('')}</Row>`;
  const dataRows = rows.map(row => `<Row>${columns.map(column => cell(column.value(row))).join('')}</Row>`).join('');
  return `${header}${headerRow}${dataRows}${footer}`;
}

function cell(value: SpreadsheetValue) {
  const type = typeof value === 'number' ? 'Number' : typeof value === 'boolean' ? 'Boolean' : 'String';
  const text = value instanceof Date ? value.toISOString() : value == null ? '' : String(value);
  return `<Cell><Data ss:Type="${type}">${escapeXml(text)}</Data></Cell>`;
}

function escapeXml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}
