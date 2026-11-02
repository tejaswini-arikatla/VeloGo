/**
 * Export helpers for customer-created expansion records.
 * Exports are deliberately plain CSV/JSON/text so no new runtime dependency is needed.
 */
import { safeFilename, sanitizeCsvText } from './extendedFeatureValidation';

export interface ExportColumn<T> {
  key: string;
  label: string;
  value: (record: T) => unknown;
}

export interface ExportResult {
  filename: string;
  content: string;
  mimeType: string;
  rowCount: number;
}

function csvEscape(value: unknown): string {
  const text = sanitizeCsvText(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildCsv<T>(
  records: T[],
  columns: ExportColumn<T>[],
  options: { includeBom?: boolean; delimiter?: string } = {},
): string {
  const delimiter = options.delimiter || ',';
  const header = columns.map((column) => csvEscape(column.label)).join(delimiter);
  const body = records.map((record) => columns.map((column) => csvEscape(column.value(record))).join(delimiter));
  const content = [header, ...body].join('\r\n');
  return options.includeBom ? `\uFEFF${content}` : content;
}

export function createCsvExport<T>(
  title: string,
  records: T[],
  columns: ExportColumn<T>[],
): ExportResult {
  return {
    filename: `${safeFilename(title)}.csv`,
    content: buildCsv(records, columns, { includeBom: true }),
    mimeType: 'text/csv;charset=utf-8',
    rowCount: records.length,
  };
}

export function createJsonExport<T>(
  title: string,
  records: T[],
  metadata: Record<string, unknown> = {},
): ExportResult {
  const content = JSON.stringify({
    title,
    exportedAt: new Date().toISOString(),
    count: records.length,
    metadata,
    records,
  }, null, 2);
  return {
    filename: `${safeFilename(title)}.json`,
    content,
    mimeType: 'application/json;charset=utf-8',
    rowCount: records.length,
  };
}

export function createTextReport(
  title: string,
  sections: Array<{ heading: string; lines: string[] }>,
): ExportResult {
  const lines = [
    title.toUpperCase(),
    '='.repeat(Math.min(72, Math.max(8, title.length))),
    `Generated: ${new Date().toLocaleString('en-IN')}`,
    '',
  ];
  sections.forEach((section) => {
    lines.push(section.heading);
    lines.push('-'.repeat(Math.min(72, Math.max(8, section.heading.length))));
    lines.push(...section.lines);
    lines.push('');
  });
  return {
    filename: `${safeFilename(title)}.txt`,
    content: lines.join('\n'),
    mimeType: 'text/plain;charset=utf-8',
    rowCount: sections.reduce((sum, section) => sum + section.lines.length, 0),
  };
}

export function downloadExport(result: ExportResult): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([result.content], { type: result.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = result.filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function buildPrintableReport(
  title: string,
  subtitle: string,
  sections: Array<{ heading: string; rows: Array<[string, string]> }>,
): string {
  const escapeHtml = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const content = sections.map((section) => `
    <section class="report-section">
      <h2>${escapeHtml(section.heading)}</h2>
      <table>
        <tbody>
          ${section.rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join('')}
        </tbody>
      </table>
    </section>
  `).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
:root{font-family:Arial,sans-serif;color:#172033;background:#fff}
body{max-width:850px;margin:40px auto;padding:0 24px;line-height:1.5}
h1{font-size:28px;margin-bottom:4px}
.subtitle{color:#64748b;margin-top:0}
.report-section{margin:28px 0}
h2{font-size:17px;border-bottom:1px solid #e2e8f0;padding-bottom:8px}
table{width:100%;border-collapse:collapse}
th,td{text-align:left;padding:9px 10px;border-bottom:1px solid #f1f5f9}
th{width:38%;color:#475569;font-weight:600}
@media print{body{margin:0;max-width:none}.report-section{break-inside:avoid}}
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<p class="subtitle">${escapeHtml(subtitle)}</p>
${content}
</body>
</html>`;
}

export function openPrintableReport(html: string): boolean {
  if (typeof window === 'undefined') return false;
  const popup = window.open('', '_blank', 'noopener,noreferrer');
  if (!popup) return false;
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  return true;
}

export function buildSummaryLines(
  values: Array<{ label: string; value: string | number }>,
): string[] {
  return values.map((item) => `${item.label}: ${item.value}`);
}

export function buildTableText(headers: string[], rows: unknown[][]): string {
  const normalized = rows.map((row) => headers.map((_, index) => String(row[index] ?? '')));
  const widths = headers.map((header, index) => Math.max(
    header.length,
    ...normalized.map((row) => row[index].length),
  ));
  const formatRow = (row: string[]) => row.map((value, index) => value.padEnd(widths[index])).join(' | ');
  const separator = widths.map((width) => '-'.repeat(width)).join('-+-');
  return [formatRow(headers), separator, ...normalized.map(formatRow)].join('\n');
}

export function summarizeExport(result: ExportResult): string {
  const sizeKb = Math.round(new Blob([result.content]).size / 1024 * 10) / 10;
  return `${result.rowCount} rows · ${sizeKb} KB · ${result.filename}`;
}
