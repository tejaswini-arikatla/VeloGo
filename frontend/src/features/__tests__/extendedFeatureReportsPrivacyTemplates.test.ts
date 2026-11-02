import { describe, expect, it } from 'vitest';
import { buildCsv, buildPrintableReport, createJsonExport, createTextReport, buildTableText } from '../extendedFeatureReports';
import { maskEmailAddress, maskPhoneNumber, redactContactDetails, reviewFreeText, getDataRetentionReview, createPrivacyExportNotice } from '../extendedFeaturePrivacy';
import { CHECKLIST_TEMPLATES, COMMUTE_TEMPLATES, cloneChecklistTemplate, flattenChecklistTemplate, getChecklistTemplate, getCommuteTemplate } from '../extendedFeatureTemplates';

describe('report export helpers', () => {
  it('creates a CSV header and rows', () => {
    const csv = buildCsv([{ name: 'Asha', amount: 20 }], [
      { key: 'name', label: 'Name', value: (item) => item.name },
      { key: 'amount', label: 'Amount', value: (item) => item.amount },
    ]);
    expect(csv).toContain('"Name","Amount"');
    expect(csv).toContain('"Asha","20"');
  });

  it('includes a UTF-8 BOM when requested', () => {
    expect(buildCsv([], [{ key: 'id', label: 'ID', value: () => '' }], { includeBom: true }).charCodeAt(0)).toBe(0xFEFF);
  });

  it('creates a JSON export with row count metadata', () => {
    const result = createJsonExport('Sample', [{ id: 1 }]);
    expect(result.rowCount).toBe(1);
    expect(JSON.parse(result.content).records).toHaveLength(1);
  });

  it('creates a text report with section headings', () => {
    const result = createTextReport('Travel summary', [{ heading: 'Totals', lines: ['Rides: 4'] }]);
    expect(result.content).toContain('Totals');
    expect(result.content).toContain('Rides: 4');
  });

  it('escapes HTML in printable reports', () => {
    const html = buildPrintableReport('<Report>', 'Summary', [{ heading: 'Details', rows: [['Name', '<script>']] }]);
    expect(html).toContain('&lt;Report&gt;');
    expect(html).not.toContain('<script>');
  });

  it('formats tabular text', () => {
    expect(buildTableText(['Name', 'Fare'], [['Asha', 50]])).toContain('Asha');
  });
});

describe('privacy helpers', () => {
  it('masks a phone number while keeping a short hint', () => {
    expect(maskPhoneNumber('+919876543210')).toContain('••');
  });

  it('masks an email local part', () => {
    expect(maskEmailAddress('person@example.com')).toContain('@example.com');
  });

  it('redacts contact details in free text', () => {
    const result = redactContactDetails('Call +919876543210 or mail person@example.com');
    expect(result).not.toContain('9876543210');
    expect(result).not.toContain('person@');
  });

  it('flags sensitive credentials in notes', () => {
    expect(reviewFreeText('My OTP is 123456').some((item) => item.severity === 'HIGH')).toBe(true);
  });

  it('recommends review after the retention window', () => {
    const result = getDataRetentionReview('2025-01-01T00:00:00.000Z', new Date('2026-01-02T00:00:00.000Z'), 365);
    expect(result.shouldReview).toBe(true);
  });

  it('provides a privacy export checklist', () => {
    expect(createPrivacyExportNotice().length).toBeGreaterThan(3);
  });
});

describe('starter templates', () => {
  it('provides a checklist template catalogue', () => {
    expect(CHECKLIST_TEMPLATES.length).toBeGreaterThanOrEqual(4);
  });

  it('flattens template categories into checklist items', () => {
    const template = getChecklistTemplate('airport');
    expect(template).toBeDefined();
    expect(flattenChecklistTemplate(template!).some((item) => item.required)).toBe(true);
  });

  it('clones a template with unique ids and unchecked items', () => {
    const template = getChecklistTemplate('daily-commute')!;
    const items = cloneChecklistTemplate(template, (() => {
      let index = 0;
      return () => `id-${++index}`;
    })());
    expect(items.every((item) => !item.completed)).toBe(true);
    expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
  });

  it('returns commute defaults by identifier', () => {
    expect(getCommuteTemplate('weekday-office')?.defaultWeekdays).toEqual([1, 2, 3, 4, 5]);
    expect(COMMUTE_TEMPLATES.length).toBeGreaterThan(1);
  });
});
