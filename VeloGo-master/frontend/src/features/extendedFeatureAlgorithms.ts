/**
 * Pure domain algorithms for the VeloGo expansion modules.
 * Keeping calculations outside React makes them easier to test and reuse.
 */
export interface SplitParticipant {
  id: string;
  name: string;
  weight: number;
  paid: number;
  settled: boolean;
}

export interface SplitAllocation {
  participantId: string;
  participantName: string;
  share: number;
  paid: number;
  balance: number;
}

export interface SettlementTransfer {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateEqualSplit(total: number, participants: SplitParticipant[]): SplitAllocation[] {
  if (!Number.isFinite(total) || total < 0 || participants.length === 0) return [];
  const base = Math.floor((total / participants.length) * 100) / 100;
  let remainder = Math.round((total - base * participants.length) * 100);
  return participants.map((person) => {
    const extra = remainder > 0 ? 0.01 : 0;
    if (remainder > 0) remainder -= 1;
    const share = roundMoney(base + extra);
    return {
      participantId: person.id,
      participantName: person.name,
      share,
      paid: roundMoney(person.paid),
      balance: roundMoney(person.paid - share),
    };
  });
}

export function calculateWeightedSplit(total: number, participants: SplitParticipant[]): SplitAllocation[] {
  const valid = participants.filter((person) => Number.isFinite(person.weight) && person.weight > 0);
  const weightTotal = valid.reduce((sum, person) => sum + person.weight, 0);
  if (!Number.isFinite(total) || total < 0 || weightTotal <= 0) return [];
  let allocated = 0;
  return valid.map((person, index) => {
    const share = index === valid.length - 1
      ? roundMoney(total - allocated)
      : roundMoney(total * person.weight / weightTotal);
    allocated = roundMoney(allocated + share);
    return {
      participantId: person.id,
      participantName: person.name,
      share,
      paid: roundMoney(person.paid),
      balance: roundMoney(person.paid - share),
    };
  });
}

export function calculateCustomSplit(
  participants: Array<SplitParticipant & { customShare: number }>,
  total: number,
): SplitAllocation[] {
  const sum = participants.reduce((value, person) => value + person.customShare, 0);
  if (!Number.isFinite(total) || total < 0 || Math.abs(sum - total) > 0.01) return [];
  return participants.map((person) => ({
    participantId: person.id,
    participantName: person.name,
    share: roundMoney(person.customShare),
    paid: roundMoney(person.paid),
    balance: roundMoney(person.paid - person.customShare),
  }));
}

export function calculateSettlements(allocations: SplitAllocation[]): SettlementTransfer[] {
  const debtors = allocations
    .filter((item) => item.balance < -0.009)
    .map((item) => ({ ...item, remaining: roundMoney(-item.balance) }));
  const creditors = allocations
    .filter((item) => item.balance > 0.009)
    .map((item) => ({ ...item, remaining: roundMoney(item.balance) }));
  const transfers: SettlementTransfer[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = roundMoney(Math.min(debtor.remaining, creditor.remaining));
    if (amount > 0) {
      transfers.push({
        fromId: debtor.participantId,
        fromName: debtor.participantName,
        toId: creditor.participantId,
        toName: creditor.participantName,
        amount,
      });
    }
    debtor.remaining = roundMoney(debtor.remaining - amount);
    creditor.remaining = roundMoney(creditor.remaining - amount);
    if (debtor.remaining < 0.01) debtorIndex += 1;
    if (creditor.remaining < 0.01) creditorIndex += 1;
  }
  return transfers;
}

export interface EcoFactor {
  vehicle: string;
  gramsPerKm: number;
  label: string;
}

export const ECO_FACTORS: EcoFactor[] = [
  { vehicle: 'BIKE', gramsPerKm: 42, label: 'Motorbike' },
  { vehicle: 'AUTO', gramsPerKm: 78, label: 'Auto rickshaw' },
  { vehicle: 'CAB', gramsPerKm: 171, label: 'Petrol cab' },
  { vehicle: 'ELECTRIC', gramsPerKm: 55, label: 'Electric vehicle' },
  { vehicle: 'PUBLIC', gramsPerKm: 35, label: 'Shared public transport' },
  { vehicle: 'WALK', gramsPerKm: 0, label: 'Walking / cycling' },
];

export function estimateTripEmissions(distanceKm: number, vehicle: string): number {
  const factor = ECO_FACTORS.find((item) => item.vehicle === vehicle);
  if (!factor || !Number.isFinite(distanceKm) || distanceKm < 0) return 0;
  return Math.round(distanceKm * factor.gramsPerKm);
}

export function estimateAvoidedEmissions(distanceKm: number, vehicle: string, baselineGramsPerKm = 171): number {
  const baseline = Math.max(0, baselineGramsPerKm);
  const actual = estimateTripEmissions(distanceKm, vehicle);
  return Math.max(0, Math.round(distanceKm * baseline - actual));
}

export function groupByMonth<T>(items: T[], dateOf: (item: T) => string): Array<{ month: string; count: number }> {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const date = new Date(dateOf(item));
    if (Number.isNaN(date.getTime())) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));
}

export function nextOccurrences(
  startDate: string,
  weekdays: number[],
  count: number,
  now = new Date(),
): string[] {
  if (!startDate || !Number.isInteger(count) || count < 1 || count > 90) return [];
  const start = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return [];
  const allowed = new Set(weekdays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6));
  if (allowed.size === 0) return [];
  const result: string[] = [];
  const cursor = new Date(Math.max(start.getTime(), new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()));
  for (let scanned = 0; scanned < 370 && result.length < count; scanned += 1) {
    if (allowed.has(cursor.getDay())) {
      const year = cursor.getFullYear();
      const month = String(cursor.getMonth() + 1).padStart(2, '0');
      const day = String(cursor.getDate()).padStart(2, '0');
      result.push(`${year}-${month}-${day}`);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

export interface BudgetStatus {
  spent: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  status: 'HEALTHY' | 'WARNING' | 'EXCEEDED';
}

export function calculateBudgetStatus(spent: number, limit: number, warningAt = 80): BudgetStatus {
  const safeSpent = Math.max(0, Number.isFinite(spent) ? spent : 0);
  const safeLimit = Math.max(0, Number.isFinite(limit) ? limit : 0);
  const percentUsed = safeLimit === 0 ? (safeSpent > 0 ? 100 : 0) : Math.round((safeSpent / safeLimit) * 100);
  return {
    spent: roundMoney(safeSpent),
    limit: roundMoney(safeLimit),
    remaining: roundMoney(Math.max(0, safeLimit - safeSpent)),
    percentUsed,
    status: safeSpent > safeLimit ? 'EXCEEDED' : percentUsed >= warningAt ? 'WARNING' : 'HEALTHY',
  };
}

export interface VehicleOption {
  id: string;
  name: string;
  estimatedFare: number;
  estimatedMinutes: number;
  capacity: number;
  comfort: number;
  emissionsGramsPerKm: number;
  availability: number;
}

export function rankVehicleOptions(
  options: VehicleOption[],
  weights: { price: number; time: number; comfort: number; emissions: number },
): Array<VehicleOption & { score: number; rank: number }> {
  if (!options.length) return [];
  const maxFare = Math.max(1, ...options.map((item) => item.estimatedFare));
  const maxTime = Math.max(1, ...options.map((item) => item.estimatedMinutes));
  const maxEmissions = Math.max(1, ...options.map((item) => item.emissionsGramsPerKm));
  const normalizedWeights = {
    price: Math.max(0, weights.price),
    time: Math.max(0, weights.time),
    comfort: Math.max(0, weights.comfort),
    emissions: Math.max(0, weights.emissions),
  };
  const totalWeight = Object.values(normalizedWeights).reduce((sum, value) => sum + value, 0) || 1;
  return options.map((item) => {
    const priceScore = 1 - item.estimatedFare / maxFare;
    const timeScore = 1 - item.estimatedMinutes / maxTime;
    const comfortScore = Math.max(0, Math.min(5, item.comfort)) / 5;
    const emissionsScore = 1 - item.emissionsGramsPerKm / maxEmissions;
    const score = (
      priceScore * normalizedWeights.price +
      timeScore * normalizedWeights.time +
      comfortScore * normalizedWeights.comfort +
      emissionsScore * normalizedWeights.emissions
    ) / totalWeight;
    return { ...item, score: Math.round(score * 1000) / 10, rank: 0 };
  }).sort((a, b) => b.score - a.score)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

export function calculateTripBudget(
  trips: Array<{ fare: number; date: string }>,
  month: string,
): number {
  return roundMoney(trips.reduce((sum, trip) => {
    const date = new Date(trip.date);
    const key = Number.isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return key === month ? sum + Math.max(0, trip.fare || 0) : sum;
  }, 0));
}

export function safePercentage(value: number, total: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

export function normalizeSearch(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase();
}

export function filterByQuery<T>(items: T[], query: string, fields: Array<(item: T) => string>): T[] {
  const normalized = normalizeSearch(query);
  if (!normalized) return items;
  return items.filter((item) => fields.some((field) => normalizeSearch(field(item)).includes(normalized)));
}

export function toCsvCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function rowsToCsv(headers: string[], rows: unknown[][]): string {
  return [headers.map(toCsvCell).join(','), ...rows.map((row) => row.map(toCsvCell).join(','))].join('\r\n');
}
