import { describe, expect, it } from 'vitest';
import { buildRouteRows, buildScheduledRideRows, createReport, escapeCsvCell, quoteFormulaLikeValues, safeFilename, serializeCsv, summarizeCsvRows } from '../featureCsv';
import { MultiStopRoute, ScheduledRideRecord } from '../featureModels';

const scheduled: ScheduledRideRecord = {
  id: 'schedule-1', pickup: 'Main Gate, VVIT', destination: 'Railway Station', vehicle: 'AUTO',
  scheduledAt: '2026-02-12T10:00:00.000Z', passengerCount: 2, note: 'Carry "documents"', estimatedFare: 140,
  status: 'SCHEDULED', reminderMinutes: 30, createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z', version: 1,
};
const route: MultiStopRoute = {
  id: 'route-1', name: 'College errands', description: '', vehicle: 'AUTO', estimatedDistanceKm: 12,
  estimatedDurationMinutes: 45, isFavorite: true, tags: [],
  stops: [
    { id: 'a', label: 'Pickup', address: 'College', kind: 'PICKUP', dwellMinutes: 0, completed: false },
    { id: 'b', label: 'Drop', address: 'Station', kind: 'DROPOFF', dwellMinutes: 5, completed: false },
  ],
  createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z', version: 1,
};

describe('CSV serialization', () => {
  it('leaves simple cells unquoted', () => {
    expect(escapeCsvCell('plain')).toBe('plain');
  });

  it('quotes cells containing commas', () => {
    expect(escapeCsvCell('Main Gate, VVIT')).toBe('"Main Gate, VVIT"');
  });

  it('escapes embedded quotes using CSV quote doubling', () => {
    expect(escapeCsvCell('Carry "documents"')).toBe('"Carry ""documents"""');
  });

  it('serializes headers and rows in a stable column order', () => {
    const csv = serializeCsv([{ name: 'Asha', rides: 3 }, { name: 'Ravi', rides: 5 }], ['name', 'rides']);
    expect(csv.split('\r\n')).toEqual(['name,rides', 'Asha,3', 'Ravi,5']);
  });

  it('supports a semicolon delimiter', () => {
    expect(serializeCsv([{ first: 'A', second: 'B' }], undefined, { delimiter: ';' })).toContain('first;second');
  });

  it('can include a UTF-8 BOM for spreadsheet compatibility', () => {
    expect(serializeCsv([{ a: 1 }], undefined, { includeBom: true }).charCodeAt(0)).toBe(0xFEFF);
  });

  it('creates scheduled ride report rows', () => {
    const rows = buildScheduledRideRows([scheduled]);
    expect(rows[0].pickup).toBe('Main Gate, VVIT');
    expect(rows[0].status).toBe('SCHEDULED');
  });

  it('creates multi-stop route report rows', () => {
    const rows = buildRouteRows([route]);
    expect(rows[0].stopCount).toBe(2);
    expect(rows[0].stopSequence).toBe('College | Station');
  });

  it('builds a named downloadable report', () => {
    const report = createReport('scheduled-rides', buildScheduledRideRows([scheduled]));
    expect(report.filename).toBe('scheduled-rides.csv');
    expect(report.rowCount).toBe(1);
    expect(report.content).toContain('pickup');
  });

  it('summarizes the dimensions and empty cells of a dataset', () => {
    const summary = summarizeCsvRows([{ a: 1, b: '' }, { a: 2, b: null }]);
    expect(summary.rows).toBe(2);
    expect(summary.columns).toBe(2);
    expect(summary.emptyCells).toBe(2);
  });

  it('prefixes formula-like values to reduce spreadsheet injection risk', () => {
    const safe = quoteFormulaLikeValues([{ name: '=HYPERLINK("x")', notes: 'ordinary text' }]);
    expect(safe[0].name).toBe("'=HYPERLINK(\"x\")");
    expect(safe[0].notes).toBe('ordinary text');
  });

  it('normalizes a report filename', () => {
    expect(safeFilename('My Ride History 2026')).toBe('my-ride-history-2026');
    expect(safeFilename('***')).toBe('velogo-report');
  });
});
