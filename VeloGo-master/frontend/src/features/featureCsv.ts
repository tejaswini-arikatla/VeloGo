import { Ride } from '../types';
import { FeatureAuditEntry, LostItemReport, MultiStopRoute, ScheduledRideRecord, TrustedContact } from './featureModels';

export type CsvCell = string | number | boolean | null | undefined;
export type CsvRow = Record<string, CsvCell>;

export interface CsvExportOptions {
  delimiter?: ',' | ';' | '\t';
  includeBom?: boolean;
  lineEnding?: '\n' | '\r\n';
}

export interface DownloadableReport {
  filename: string;
  mimeType: string;
  content: string;
  rowCount: number;
}

export function escapeCsvCell(value: CsvCell, delimiter = ','): string {
  if (value == null) return '';
  const raw = String(value);
  const requiresQuotes = raw.includes(delimiter) || raw.includes('"') || raw.includes('\n') || raw.includes('\r');
  return requiresQuotes ? `"${raw.replace(/"/g, '""')}"` : raw;
}

export function serializeCsv(rows: CsvRow[], columns?: string[], options: CsvExportOptions = {}): string {
  const delimiter = options.delimiter || ',';
  const lineEnding = options.lineEnding || '\r\n';
  const headers = columns || [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const lines = [headers.map((header) => escapeCsvCell(header, delimiter)).join(delimiter)];
  rows.forEach((row) => lines.push(headers.map((header) => escapeCsvCell(row[header], delimiter)).join(delimiter)));
  const result = lines.join(lineEnding);
  return options.includeBom ? `\uFEFF${result}` : result;
}

export function buildScheduledRideRows(records: ScheduledRideRecord[]): CsvRow[] {
  return records.map((record) => ({
    id: record.id,
    pickup: record.pickup,
    destination: record.destination,
    vehicle: record.vehicle,
    scheduledAt: record.scheduledAt,
    passengerCount: record.passengerCount,
    status: record.status,
    estimatedFare: record.estimatedFare,
    reminderMinutes: record.reminderMinutes,
    note: record.note,
    createdAt: record.createdAt,
  }));
}

export function buildRouteRows(routes: MultiStopRoute[]): CsvRow[] {
  return routes.map((route) => ({
    id: route.id,
    name: route.name,
    vehicle: route.vehicle,
    stopCount: route.stops.length,
    stopSequence: route.stops.map((stop) => stop.address).join(' | '),
    dwellMinutes: route.stops.reduce((total, stop) => total + stop.dwellMinutes, 0),
    estimatedDistanceKm: route.estimatedDistanceKm,
    estimatedDurationMinutes: route.estimatedDurationMinutes,
    favorite: route.isFavorite,
    createdAt: route.createdAt,
  }));
}

export function buildLostItemRows(reports: LostItemReport[]): CsvRow[] {
  return reports.map((report) => ({
    referenceCode: report.referenceCode,
    itemName: report.itemName,
    category: report.category,
    status: report.status,
    lostAt: report.lostAt,
    pickupArea: report.pickupArea,
    rideId: report.rideId,
    createdAt: report.createdAt,
  }));
}

export function buildContactRows(contacts: TrustedContact[]): CsvRow[] {
  return contacts.map((contact) => ({
    name: contact.name,
    phone: contact.phone,
    relationship: contact.relationship,
    primary: contact.isPrimary,
    shareTripByDefault: contact.shareTripByDefault,
    notes: contact.notes,
  }));
}

export function buildRideHistoryRows(rides: Ride[]): CsvRow[] {
  return rides.map((ride) => ({
    rideId: ride.id,
    date: ride.completedAt || ride.createdAt,
    pickup: ride.pickupAddress,
    destination: ride.destAddress,
    vehicle: ride.vehicleCategory,
    status: ride.status,
    distanceKm: ride.distanceKm,
    estimatedFare: ride.estimatedFare,
    finalFare: ride.finalFare ?? '',
    paymentMethod: ride.paymentMethod,
    paymentStatus: ride.paymentStatus,
  }));
}

export function buildAuditRows(entries: FeatureAuditEntry[]): CsvRow[] {
  return entries.map((entry) => ({
    timestamp: entry.timestamp,
    feature: entry.feature,
    action: entry.action,
    recordId: entry.recordId || '',
    summary: entry.summary,
  }));
}

export function createReport(filename: string, rows: CsvRow[], columns?: string[]): DownloadableReport {
  return {
    filename: filename.endsWith('.csv') ? filename : `${filename}.csv`,
    mimeType: 'text/csv;charset=utf-8',
    content: serializeCsv(rows, columns, { includeBom: true }),
    rowCount: rows.length,
  };
}

export function downloadReport(report: DownloadableReport): void {
  const blob = new Blob([report.content], { type: report.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = report.filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function safeFilename(value: string): string {
  const normalized = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return normalized || 'velogo-report';
}

export function summarizeCsvRows(rows: CsvRow[]): { rows: number; columns: number; emptyCells: number } {
  const columns = new Set(rows.flatMap((row) => Object.keys(row)));
  let emptyCells = 0;
  rows.forEach((row) => columns.forEach((column) => {
    if (row[column] == null || row[column] === '') emptyCells += 1;
  }));
  return { rows: rows.length, columns: columns.size, emptyCells };
}

export function quoteFormulaLikeValues(rows: CsvRow[]): CsvRow[] {
  const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r'];
  return rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => {
    if (typeof value !== 'string') return [key, value];
    const first = value.trimStart().charAt(0);
    return [key, dangerousPrefixes.includes(first) ? `'${value}` : value];
  })));
}
