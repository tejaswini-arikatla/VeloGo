/**
 * Aggregation helpers for the customer-side feature dashboards.
 * All amounts and distances are derived from supplied records; no live data is inferred.
 */
export interface JourneyFact {
  id: string;
  date: string;
  distanceKm: number;
  fare: number;
  status: string;
  vehicle: string;
  origin?: string;
  destination?: string;
  durationMinutes?: number;
}

export interface JourneySummary {
  totalRecords: number;
  completed: number;
  cancelled: number;
  active: number;
  completionRate: number;
  cancellationRate: number;
  totalDistanceKm: number;
  totalSpend: number;
  averageFare: number;
  averageDistanceKm: number;
  averageDurationMinutes: number;
  longestJourneyKm: number;
  highestFare: number;
  mostUsedVehicle: string;
  topDestination: string;
}

export interface MonthlyJourneyMetric {
  month: string;
  rides: number;
  spend: number;
  distance: number;
  averageFare: number;
}

export interface CategoryMetric {
  category: string;
  count: number;
  spend: number;
  distance: number;
  percentage: number;
}

export interface DestinationMetric {
  destination: string;
  count: number;
  totalSpend: number;
  averageFare: number;
}

const finiteOrZero = (value: number | undefined | null): number => (
  Number.isFinite(value) ? Number(value) : 0
);

const safeDivide = (numerator: number, denominator: number): number => (
  denominator > 0 ? numerator / denominator : 0
);

const round = (value: number, digits = 2): number => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export function summarizeJourneys(records: JourneyFact[]): JourneySummary {
  const completed = records.filter((record) => record.status === 'COMPLETED');
  const cancelled = records.filter((record) => record.status === 'CANCELLED');
  const active = records.filter((record) => !['COMPLETED', 'CANCELLED'].includes(record.status));
  const totalDistanceKm = completed.reduce((sum, item) => sum + Math.max(0, finiteOrZero(item.distanceKm)), 0);
  const totalSpend = completed.reduce((sum, item) => sum + Math.max(0, finiteOrZero(item.fare)), 0);
  const durationValues = completed.map((item) => finiteOrZero(item.durationMinutes)).filter((value) => value > 0);
  const vehicleCounts = countBy(completed, (item) => item.vehicle || 'UNKNOWN');
  const destinationCounts = countBy(completed, (item) => item.destination || 'Unknown destination');
  return {
    totalRecords: records.length,
    completed: completed.length,
    cancelled: cancelled.length,
    active: active.length,
    completionRate: round(safeDivide(completed.length, records.length) * 100, 1),
    cancellationRate: round(safeDivide(cancelled.length, records.length) * 100, 1),
    totalDistanceKm: round(totalDistanceKm),
    totalSpend: round(totalSpend),
    averageFare: round(safeDivide(totalSpend, completed.length)),
    averageDistanceKm: round(safeDivide(totalDistanceKm, completed.length)),
    averageDurationMinutes: round(safeDivide(durationValues.reduce((sum, value) => sum + value, 0), durationValues.length), 1),
    longestJourneyKm: round(Math.max(0, ...completed.map((item) => finiteOrZero(item.distanceKm)))),
    highestFare: round(Math.max(0, ...completed.map((item) => finiteOrZero(item.fare)))),
    mostUsedVehicle: highestCount(vehicleCounts),
    topDestination: highestCount(destinationCounts),
  };
}

function countBy<T>(items: T[], keyOf: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const key = keyOf(item).trim() || 'Unknown';
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
}

function highestCount(counts: Map<string, number>): string {
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || '—';
}

export function buildMonthlyMetrics(records: JourneyFact[]): MonthlyJourneyMetric[] {
  const buckets = new Map<string, JourneyFact[]>();
  records.filter((item) => item.status === 'COMPLETED').forEach((item) => {
    const date = new Date(item.date);
    if (Number.isNaN(date.getTime())) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    buckets.set(key, [...(buckets.get(key) || []), item]);
  });
  return [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, items]) => {
    const spend = items.reduce((sum, item) => sum + Math.max(0, finiteOrZero(item.fare)), 0);
    const distance = items.reduce((sum, item) => sum + Math.max(0, finiteOrZero(item.distanceKm)), 0);
    return {
      month,
      rides: items.length,
      spend: round(spend),
      distance: round(distance),
      averageFare: round(safeDivide(spend, items.length)),
    };
  });
}

export function buildCategoryMetrics(records: JourneyFact[]): CategoryMetric[] {
  const completed = records.filter((item) => item.status === 'COMPLETED');
  const buckets = new Map<string, { count: number; spend: number; distance: number }>();
  completed.forEach((item) => {
    const category = item.vehicle || 'UNKNOWN';
    const current = buckets.get(category) || { count: 0, spend: 0, distance: 0 };
    current.count += 1;
    current.spend += Math.max(0, finiteOrZero(item.fare));
    current.distance += Math.max(0, finiteOrZero(item.distanceKm));
    buckets.set(category, current);
  });
  return [...buckets.entries()].map(([category, value]) => ({
    category,
    count: value.count,
    spend: round(value.spend),
    distance: round(value.distance),
    percentage: round(safeDivide(value.count, completed.length) * 100, 1),
  })).sort((a, b) => b.count - a.count);
}

export function buildDestinationMetrics(records: JourneyFact[], limit = 10): DestinationMetric[] {
  const buckets = new Map<string, { count: number; spend: number }>();
  records.filter((item) => item.status === 'COMPLETED').forEach((item) => {
    const destination = (item.destination || 'Unknown destination').trim();
    const current = buckets.get(destination) || { count: 0, spend: 0 };
    current.count += 1;
    current.spend += Math.max(0, finiteOrZero(item.fare));
    buckets.set(destination, current);
  });
  return [...buckets.entries()].map(([destination, value]) => ({
    destination,
    count: value.count,
    totalSpend: round(value.spend),
    averageFare: round(safeDivide(value.spend, value.count)),
  })).sort((a, b) => b.count - a.count || a.destination.localeCompare(b.destination)).slice(0, Math.max(1, limit));
}

export function comparePeriods(
  current: number,
  previous: number,
): { difference: number; percentageChange: number | null; direction: 'UP' | 'DOWN' | 'UNCHANGED' } {
  const difference = round(current - previous);
  if (previous === 0) {
    return {
      difference,
      percentageChange: current === 0 ? 0 : null,
      direction: current === 0 ? 'UNCHANGED' : 'UP',
    };
  }
  const percentageChange = round((difference / Math.abs(previous)) * 100, 1);
  return {
    difference,
    percentageChange,
    direction: difference > 0 ? 'UP' : difference < 0 ? 'DOWN' : 'UNCHANGED',
  };
}

export function percentile(values: number[], percentileValue: number): number {
  const clean = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!clean.length || percentileValue < 0 || percentileValue > 100) return 0;
  const position = (clean.length - 1) * percentileValue / 100;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return clean[lower];
  return clean[lower] + (clean[upper] - clean[lower]) * (position - lower);
}

export function detectFareOutliers(records: JourneyFact[], multiplier = 1.5): JourneyFact[] {
  const fares = records.filter((item) => item.status === 'COMPLETED').map((item) => finiteOrZero(item.fare));
  if (fares.length < 4) return [];
  const q1 = percentile(fares, 25);
  const q3 = percentile(fares, 75);
  const threshold = q3 + Math.max(0, multiplier) * (q3 - q1);
  return records.filter((item) => item.status === 'COMPLETED' && finiteOrZero(item.fare) > threshold);
}

export function buildWeekdayDistribution(records: JourneyFact[]): Array<{ weekday: string; count: number }> {
  const labels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const counts = labels.map((weekday) => ({ weekday, count: 0 }));
  records.forEach((record) => {
    const date = new Date(record.date);
    if (Number.isNaN(date.getTime())) return;
    counts[date.getDay()].count += 1;
  });
  return counts;
}

export function movingAverage(values: number[], windowSize = 3): number[] {
  if (!Number.isInteger(windowSize) || windowSize < 1) return [];
  return values.map((_, index) => {
    const start = Math.max(0, index - windowSize + 1);
    const sample = values.slice(start, index + 1).filter(Number.isFinite);
    return sample.length ? round(sample.reduce((sum, value) => sum + value, 0) / sample.length) : 0;
  });
}

export function topN<T>(items: T[], valueOf: (item: T) => number, count: number): T[] {
  if (!Number.isInteger(count) || count < 1) return [];
  return [...items].sort((a, b) => valueOf(b) - valueOf(a)).slice(0, count);
}

export function calculateAverage(values: number[]): number {
  const clean = values.filter(Number.isFinite);
  return clean.length ? round(clean.reduce((sum, value) => sum + value, 0) / clean.length) : 0;
}

export function calculateMedian(values: number[]): number {
  const clean = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!clean.length) return 0;
  const middle = Math.floor(clean.length / 2);
  return round(clean.length % 2 ? clean[middle] : (clean[middle - 1] + clean[middle]) / 2);
}

export function groupFactsByDate(records: JourneyFact[]): Map<string, JourneyFact[]> {
  const result = new Map<string, JourneyFact[]>();
  records.forEach((record) => {
    const date = new Date(record.date);
    if (Number.isNaN(date.getTime())) return;
    const key = date.toISOString().slice(0, 10);
    result.set(key, [...(result.get(key) || []), record]);
  });
  return result;
}
