/** Pure domain algorithms used by the feature modules. */
import { Ride } from '../types';
import {
  MultiStopRoute,
  PoolRequest,
  RewardProfile,
  RewardTransaction,
  RouteStop,
  TravelInsight,
} from './featureModels';
import { createFeatureRecord } from './featureModels';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface RouteLeg {
  from: string;
  to: string;
  distanceKm: number;
  estimatedMinutes: number;
}

export interface RouteEstimate {
  totalDistanceKm: number;
  drivingMinutes: number;
  dwellMinutes: number;
  totalMinutes: number;
  legs: RouteLeg[];
}

const EARTH_RADIUS_KM = 6371.0088;

export function toRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

export function haversineDistanceKm(a: Coordinate, b: Coordinate): number {
  const latitudeDelta = toRadians(b.latitude - a.latitude);
  const longitudeDelta = toRadians(b.longitude - a.longitude);
  const firstLatitude = toRadians(a.latitude);
  const secondLatitude = toRadians(b.latitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

export function estimateRouteFromDistances(distances: number[], stops: RouteStop[], averageSpeedKmh = 24): RouteEstimate {
  const safeSpeed = Math.max(5, Math.min(80, averageSpeedKmh));
  const legs = distances.map((distance, index) => {
    const safeDistance = Math.max(0, Number.isFinite(distance) ? distance : 0);
    return {
      from: stops[index]?.label || `Stop ${index + 1}`,
      to: stops[index + 1]?.label || `Stop ${index + 2}`,
      distanceKm: safeDistance,
      estimatedMinutes: Math.ceil(safeDistance / safeSpeed * 60),
    };
  });
  const totalDistanceKm = legs.reduce((total, leg) => total + leg.distanceKm, 0);
  const drivingMinutes = legs.reduce((total, leg) => total + leg.estimatedMinutes, 0);
  const dwellMinutes = stops.reduce((total, stop) => total + Math.max(0, stop.dwellMinutes), 0);
  return {
    totalDistanceKm: roundTo(totalDistanceKm, 1),
    drivingMinutes,
    dwellMinutes,
    totalMinutes: drivingMinutes + dwellMinutes,
    legs,
  };
}

export function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function getRouteStopSequence(route: MultiStopRoute): string[] {
  return route.stops.map((stop) => stop.address.trim()).filter(Boolean);
}

export function estimateFare(distanceKm: number, vehicle: string): number {
  const rates: Record<string, { base: number; perKm: number; booking: number }> = {
    BIKE: { base: 20, perKm: 8, booking: 5 },
    WOMEN_BIKE: { base: 22, perKm: 8.5, booking: 5 },
    AUTO: { base: 30, perKm: 12, booking: 8 },
    CAB: { base: 60, perKm: 17, booking: 12 },
  };
  const rate = rates[vehicle] || rates.BIKE;
  return roundTo(rate.base + Math.max(0, distanceKm) * rate.perKm + rate.booking, 0);
}

export function calculatePoolCompatibility(first: PoolRequest, second: PoolRequest): number {
  const firstTime = new Date(first.departureAt).getTime();
  const secondTime = new Date(second.departureAt).getTime();
  if (!Number.isFinite(firstTime) || !Number.isFinite(secondTime)) return 0;
  const timeDifferenceMinutes = Math.abs(firstTime - secondTime) / 60_000;
  if (timeDifferenceMinutes > 45) return 0;
  if (first.vehicle !== second.vehicle) return 0;
  const originScore = similarityScore(first.origin, second.origin);
  const destinationScore = similarityScore(first.destination, second.destination);
  const timeScore = Math.max(0, 1 - timeDifferenceMinutes / 45);
  return roundTo((originScore * 0.35 + destinationScore * 0.45 + timeScore * 0.2) * 100, 0);
}

export function similarityScore(first: string, second: string): number {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  const a = new Set(normalize(first));
  const b = new Set(normalize(second));
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return intersection / union;
}

export function findPoolMatches(request: PoolRequest, candidates: PoolRequest[], threshold = 35): Array<{ request: PoolRequest; score: number }> {
  return candidates
    .filter((candidate) => candidate.id !== request.id && candidate.status === 'OPEN')
    .map((candidate) => ({ request: candidate, score: calculatePoolCompatibility(request, candidate) }))
    .filter((candidate) => candidate.score >= threshold)
    .sort((a, b) => b.score - a.score);
}

export function calculateRewardTier(lifetimePoints: number): RewardProfile['currentTier'] {
  if (lifetimePoints >= 10_000) return 'PLATINUM';
  if (lifetimePoints >= 5_000) return 'GOLD';
  if (lifetimePoints >= 1_500) return 'SILVER';
  return 'STARTER';
}

export function pointsForRide(ride: Ride): number {
  if (ride.status !== 'COMPLETED') return 0;
  const fare = Math.max(0, ride.finalFare ?? ride.estimatedFare ?? 0);
  const distance = Math.max(0, ride.distanceKm || 0);
  return Math.max(5, Math.floor(fare / 10) + Math.floor(distance));
}

export function createRideRewardTransaction(ride: Ride): RewardTransaction | null {
  const points = pointsForRide(ride);
  if (!points) return null;
  return createFeatureRecord({
    kind: 'EARNED' as const,
    points,
    description: `Points earned for ride ${ride.id.slice(0, 8)}`,
    sourceId: ride.id,
  });
}

export function summarizeRideHistory(rides: Ride[], now = new Date()): TravelInsight {
  const completed = rides.filter((ride) => ride.status === 'COMPLETED');
  const cancelled = rides.filter((ride) => ride.status === 'CANCELLED');
  const totalSpend = completed.reduce((sum, ride) => sum + (ride.finalFare ?? ride.estimatedFare ?? 0), 0);
  const totalDistanceKm = completed.reduce((sum, ride) => sum + (ride.distanceKm || 0), 0);
  const vehicleCounts = countBy(completed, (ride) => ride.vehicleCategory || 'UNKNOWN');
  const destinationCounts = countBy(completed, (ride) => normalizeDestination(ride.destAddress));
  const monthlyMap = new Map<string, { amount: number; rides: number }>();
  let weekdayRideCount = 0;
  let weekendRideCount = 0;
  completed.forEach((ride) => {
    const date = new Date(ride.completedAt || ride.createdAt);
    if (Number.isNaN(date.getTime())) return;
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const entry = monthlyMap.get(month) || { amount: 0, rides: 0 };
    entry.amount += ride.finalFare ?? ride.estimatedFare ?? 0;
    entry.rides += 1;
    monthlyMap.set(month, entry);
    if (date.getDay() === 0 || date.getDay() === 6) weekendRideCount += 1;
    else weekdayRideCount += 1;
  });
  const vehicleEntries = [...vehicleCounts.entries()].sort((a, b) => b[1] - a[1]);
  const destinationEntries = [...destinationCounts.entries()].sort((a, b) => b[1] - a[1]);
  const totalRides = rides.length;
  const completedRides = completed.length;
  const monthLabels = [...monthlyMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const recentMonths = monthLabels.slice(-6);
  const elapsedDays = Math.max(1, Math.ceil((now.getTime() - new Date(now.getFullYear(), now.getMonth(), 1).getTime()) / 86_400_000));
  return {
    totalRides,
    completedRides,
    cancelledRides: cancelled.length,
    totalDistanceKm: roundTo(totalDistanceKm, 1),
    totalSpend: roundTo(totalSpend, 2),
    averageFare: completedRides ? roundTo(totalSpend / completedRides, 2) : 0,
    averageDistanceKm: completedRides ? roundTo(totalDistanceKm / completedRides, 1) : 0,
    mostUsedVehicle: vehicleEntries[0]?.[0] || 'Not enough data',
    mostFrequentDestination: destinationEntries[0]?.[0] || 'Not enough data',
    weekdayRideCount,
    weekendRideCount,
    estimatedTimeSavedMinutes: Math.round(totalDistanceKm * 1.7),
    monthlySpend: recentMonths.map(([month, value]) => ({ month, amount: roundTo(value.amount, 2), rides: value.rides })),
    vehicleBreakdown: vehicleEntries.map(([vehicle, count]) => ({ vehicle, rides: count, share: completedRides ? roundTo(count / completedRides * 100, 1) : 0 })),
    destinationBreakdown: destinationEntries.slice(0, 5).map(([destination, count]) => ({ destination, rides: count })),
  };
}

function countBy<T>(items: T[], key: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const value = key(item);
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return counts;
}

function normalizeDestination(value: string): string {
  const cleaned = (value || '').split(',')[0].trim();
  return cleaned || 'Unknown destination';
}

export function calculateCancellationRate(total: number, cancelled: number): number {
  if (total <= 0) return 0;
  return roundTo(Math.min(100, Math.max(0, cancelled / total * 100)), 1);
}

export function calculateCompletionRate(total: number, completed: number): number {
  if (total <= 0) return 0;
  return roundTo(Math.min(100, Math.max(0, completed / total * 100)), 1);
}

export function getDateRangeLabel(start: Date, end: Date): string {
  const formatter = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

export function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

export function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function filterRidesByDateRange<T extends { createdAt: string }>(items: T[], start: Date, end: Date): T[] {
  return items.filter((item) => {
    const timestamp = new Date(item.createdAt).getTime();
    return Number.isFinite(timestamp) && timestamp >= start.getTime() && timestamp <= end.getTime();
  });
}

export function getRewardProgress(lifetimePoints: number): { tier: string; nextTier: string | null; current: number; target: number; percentage: number } {
  const tiers = [
    { name: 'STARTER', minimum: 0 },
    { name: 'SILVER', minimum: 1500 },
    { name: 'GOLD', minimum: 5000 },
    { name: 'PLATINUM', minimum: 10000 },
  ];
  const currentTier = [...tiers].reverse().find((tier) => lifetimePoints >= tier.minimum) || tiers[0];
  const currentIndex = tiers.findIndex((tier) => tier.name === currentTier.name);
  const next = tiers[currentIndex + 1];
  if (!next) return { tier: 'PLATINUM', nextTier: null, current: lifetimePoints, target: lifetimePoints, percentage: 100 };
  const progress = Math.max(0, lifetimePoints - currentTier.minimum);
  const span = next.minimum - currentTier.minimum;
  return {
    tier: currentTier.name,
    nextTier: next.name,
    current: progress,
    target: span,
    percentage: roundTo(Math.min(100, progress / span * 100), 1),
  };
}
