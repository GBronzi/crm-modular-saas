import { describe, expect, it } from 'vitest';
import { toSpreadsheetXml } from '../src/common/spreadsheet-xml.js';

describe('toSpreadsheetXml', () => {
  it('escapes XML-sensitive values and emits Excel workbook XML', () => {
    const xml = toSpreadsheetXml(
      [{ header: 'Nombre', value: row => row.name as string }, { header: 'Activo', value: row => row.active as boolean }],
      [{ name: 'Ana & <CRM>', active: true }],
    );
    expect(xml).toContain('<?mso-application progid="Excel.Sheet"?>');
    expect(xml).toContain('Ana &amp; &lt;CRM&gt;');
    expect(xml).toContain('ss:Type="Boolean">true');
  });
});
