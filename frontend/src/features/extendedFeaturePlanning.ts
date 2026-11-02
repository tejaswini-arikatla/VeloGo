/**
 * Additional planning calculations shared by the new VeloGo modules.
 * These helpers use only user-entered estimates and never claim live routing data.
 */
export interface PlanningStop {
  id: string;
  label: string;
  order: number;
  dwellMinutes: number;
}

export interface ReadinessItem {
  id: string;
  label: string;
  completed: boolean;
  required: boolean;
}

export interface ReadinessSummary {
  total: number;
  completed: number;
  requiredPending: number;
  percentage: number;
  ready: boolean;
}

export function orderPlanningStops(stops: PlanningStop[]): PlanningStop[] {
  return [...stops].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export function calculateDwellTime(stops: PlanningStop[]): number {
  return stops.reduce((sum, stop) => {
    const dwell = Number.isFinite(stop.dwellMinutes) ? Math.max(0, stop.dwellMinutes) : 0;
    return sum + dwell;
  }, 0);
}

export function calculateReadiness(items: ReadinessItem[]): ReadinessSummary {
  const completed = items.filter((item) => item.completed).length;
  const requiredPending = items.filter((item) => item.required && !item.completed).length;
  return {
    total: items.length,
    completed,
    requiredPending,
    percentage: items.length ? Math.round(completed / items.length * 100) : 0,
    ready: items.length > 0 && requiredPending === 0,
  };
}

export function calculateGroupBudget(
  budgetPerPerson: number,
  memberCount: number,
  confirmedCount: number,
): { plannedTotal: number; confirmedShare: number; pendingMembers: number } {
  const safeBudget = Number.isFinite(budgetPerPerson) ? Math.max(0, budgetPerPerson) : 0;
  const safeMembers = Number.isInteger(memberCount) ? Math.max(0, memberCount) : 0;
  const safeConfirmed = Math.min(safeMembers, Number.isInteger(confirmedCount) ? Math.max(0, confirmedCount) : 0);
  return {
    plannedTotal: Math.round(safeBudget * safeMembers * 100) / 100,
    confirmedShare: Math.round(safeBudget * safeConfirmed * 100) / 100,
    pendingMembers: safeMembers - safeConfirmed,
  };
}

export function estimateAirportTransferTime(
  flightTime: Date,
  direction: 'DEPARTURE' | 'ARRIVAL',
  bufferMinutes: number,
  checkInMinutes = 180,
  exitMinutes = 45,
): Date | null {
  if (Number.isNaN(flightTime.getTime()) || !Number.isFinite(bufferMinutes) || bufferMinutes < 0) return null;
  const offset = direction === 'DEPARTURE'
    ? -(checkInMinutes + bufferMinutes)
    : exitMinutes + bufferMinutes;
  return new Date(flightTime.getTime() + offset * 60_000);
}

export function calculateCommuteBudget(
  oneWayFare: number,
  returnTrip: boolean,
  activeDays: number,
): number {
  if (!Number.isFinite(oneWayFare) || oneWayFare < 0 || !Number.isInteger(activeDays) || activeDays < 0) return 0;
  const journeysPerDay = returnTrip ? 2 : 1;
  return Math.round(oneWayFare * journeysPerDay * activeDays * 100) / 100;
}

export function countMatchingWeekdays(
  start: Date,
  end: Date,
  weekdays: number[],
): number {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  const accepted = new Set(weekdays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6));
  if (!accepted.size) return 0;
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  let count = 0;
  for (let guard = 0; cursor <= last && guard < 3660; guard += 1) {
    if (accepted.has(cursor.getDay())) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

export function estimatePerPassengerDistance(
  totalDistanceKm: number,
  passengers: number,
  shared: boolean,
): number {
  if (!Number.isFinite(totalDistanceKm) || totalDistanceKm < 0) return 0;
  if (!shared) return totalDistanceKm;
  if (!Number.isInteger(passengers) || passengers < 1) return 0;
  return Math.round((totalDistanceKm / passengers) * 100) / 100;
}

export function getPoolDepartureWindow(
  departureAt: string,
  toleranceMinutes: number,
): { earliest: string; latest: string } | null {
  const departure = new Date(departureAt);
  if (Number.isNaN(departure.getTime()) || !Number.isFinite(toleranceMinutes) || toleranceMinutes < 0) return null;
  const tolerance = Math.min(toleranceMinutes, 240) * 60_000;
  return {
    earliest: new Date(departure.getTime() - tolerance).toISOString(),
    latest: new Date(departure.getTime() + tolerance).toISOString(),
  };
}

export function isDepartureCompatible(
  first: string,
  second: string,
  toleranceMinutes: number,
): boolean {
  const a = new Date(first).getTime();
  const b = new Date(second).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= Math.max(0, toleranceMinutes) * 60_000;
}

export function clampPassengerCount(value: number, minimum = 1, maximum = 8): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, Math.floor(value)));
}
