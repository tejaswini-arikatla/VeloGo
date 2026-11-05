import { describe, expect, it } from 'vitest';
import { Ride } from '../../types';
import {
  calculateCancellationRate,
  calculateCompletionRate,
  calculatePoolCompatibility,
  estimateFare,
  estimateRouteFromDistances,
  findPoolMatches,
  getRewardProgress,
  haversineDistanceKm,
  pointsForRide,
  roundTo,
  summarizeRideHistory,
} from '../featureAlgorithms';
import { PoolRequest, RouteStop } from '../featureModels';

const pool = (id: string, origin: string, destination: string, departureAt: string): PoolRequest => ({
  id, origin, destination, departureAt, seatsRequested: 1, seatsAvailable: 1,
  vehicle: 'AUTO', contributionLimit: 100, note: '', status: 'OPEN', ownerName: id,
  ownerId: id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: 1,
});

const ride = (overrides: Partial<Ride> = {}): Ride => ({
  id: 'ride-1', customerId: 'user-1', customerName: 'Test', customerPhone: '9999999999',
  vehicleCategory: 'BIKE', status: 'COMPLETED', pickupAddress: 'College', pickupLat: 16.3, pickupLng: 80.4,
  destAddress: 'Station, Guntur', destLat: 16.2, destLng: 80.5, distanceKm: 8, durationMinutes: 20,
  estimatedFare: 100, finalFare: 110, discountAmount: 0, taxAmount: 0, otpCode: '1234',
  paymentMethod: 'CASH', paymentStatus: 'SUCCESS', createdAt: new Date().toISOString(),
  completedAt: new Date().toISOString(), ...overrides,
});

describe('route and fare algorithms', () => {
  it('calculates a zero distance between identical coordinates', () => {
    expect(haversineDistanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0 })).toBe(0);
  });

  it('calculates a plausible distance between two nearby cities', () => {
    const distance = haversineDistanceKm({ latitude: 16.3067, longitude: 80.4365 }, { latitude: 16.5062, longitude: 80.6480 });
    expect(distance).toBeGreaterThan(20);
    expect(distance).toBeLessThan(35);
  });

  it('rounds values without changing integer values', () => {
    expect(roundTo(10, 2)).toBe(10);
    expect(roundTo(1.236, 2)).toBe(1.24);
  });

  it('estimates total route distance and dwell time', () => {
    const stops: RouteStop[] = [
      { id: '1', label: 'Start', address: 'A', kind: 'PICKUP', dwellMinutes: 0, completed: false },
      { id: '2', label: 'Stop', address: 'B', kind: 'WAYPOINT', dwellMinutes: 10, completed: false },
      { id: '3', label: 'End', address: 'C', kind: 'DROPOFF', dwellMinutes: 5, completed: false },
    ];
    const result = estimateRouteFromDistances([5, 7], stops, 24);
    expect(result.totalDistanceKm).toBe(12);
    expect(result.dwellMinutes).toBe(15);
    expect(result.totalMinutes).toBeGreaterThan(result.drivingMinutes);
  });

  it('uses a safe speed range in route estimation', () => {
    const stops: RouteStop[] = [{ id: '1', label: 'A', address: 'A', kind: 'PICKUP', dwellMinutes: 0, completed: false }, { id: '2', label: 'B', address: 'B', kind: 'DROPOFF', dwellMinutes: 0, completed: false }];
    const tooFast = estimateRouteFromDistances([10], stops, 500);
    const safe = estimateRouteFromDistances([10], stops, 80);
    expect(tooFast.drivingMinutes).toBe(safe.drivingMinutes);
  });

  it('returns a non-negative fare for each vehicle type', () => {
    ['BIKE', 'WOMEN_BIKE', 'AUTO', 'CAB'].forEach((vehicle) => expect(estimateFare(10, vehicle)).toBeGreaterThan(0));
  });
});

describe('pool matching algorithms', () => {
  it('gives a high score to a similar route and departure time', () => {
    const departure = new Date(Date.now() + 60 * 60_000).toISOString();
    const first = pool('one', 'Guntur Railway Station', 'VVIT Guntur', departure);
    const second = pool('two', 'Guntur Railway Station', 'VVIT Guntur', new Date(new Date(departure).getTime() + 5 * 60_000).toISOString());
    expect(calculatePoolCompatibility(first, second)).toBeGreaterThan(80);
  });

  it('does not match incompatible vehicle categories', () => {
    const departure = new Date(Date.now() + 60 * 60_000).toISOString();
    const first = pool('one', 'Guntur', 'Vijayawada', departure);
    const second = { ...pool('two', 'Guntur', 'Vijayawada', departure), vehicle: 'CAB' as const };
    expect(calculatePoolCompatibility(first, second)).toBe(0);
  });

  it('does not match rides more than 45 minutes apart', () => {
    const first = pool('one', 'Guntur', 'Vijayawada', new Date(Date.now() + 60 * 60_000).toISOString());
    const second = pool('two', 'Guntur', 'Vijayawada', new Date(Date.now() + 120 * 60_000).toISOString());
    expect(calculatePoolCompatibility(first, second)).toBe(0);
  });

  it('finds matches above the threshold and sorts best first', () => {
    const time = new Date(Date.now() + 60 * 60_000).toISOString();
    const own = pool('mine', 'Guntur Railway Station', 'VVIT Guntur', time);
    const candidates = [pool('good', 'Guntur Railway Station', 'VVIT Guntur', time), pool('bad', 'Hyderabad', 'Airport', time)];
    const matches = findPoolMatches(own, candidates, 10);
    expect(matches[0].request.id).toBe('good');
  });
});

describe('reward and analytics algorithms', () => {
  it('calculates reward points only for completed rides', () => {
    expect(pointsForRide(ride())).toBeGreaterThan(0);
    expect(pointsForRide(ride({ status: 'CANCELLED' }))).toBe(0);
  });

  it('returns the expected reward progress tiers', () => {
    expect(getRewardProgress(0).tier).toBe('STARTER');
    expect(getRewardProgress(2000).tier).toBe('SILVER');
    expect(getRewardProgress(6000).tier).toBe('GOLD');
    expect(getRewardProgress(11000).tier).toBe('PLATINUM');
  });

  it('summarizes completed ride distance and spend', () => {
    const summary = summarizeRideHistory([ride(), ride({ id: 'ride-2', distanceKm: 4, finalFare: 80 })]);
    expect(summary.completedRides).toBe(2);
    expect(summary.totalDistanceKm).toBe(12);
    expect(summary.totalSpend).toBe(190);
  });

  it('excludes cancelled fares from total spend', () => {
    const summary = summarizeRideHistory([ride(), ride({ id: 'ride-2', status: 'CANCELLED', finalFare: 500 })]);
    expect(summary.totalSpend).toBe(110);
    expect(summary.cancelledRides).toBe(1);
  });

  it('handles empty history without dividing by zero', () => {
    const summary = summarizeRideHistory([]);
    expect(summary.averageFare).toBe(0);
    expect(summary.averageDistanceKm).toBe(0);
    expect(summary.mostUsedVehicle).toBe('Not enough data');
  });

  it('calculates percentages safely for zero and valid totals', () => {
    expect(calculateCompletionRate(0, 0)).toBe(0);
    expect(calculateCompletionRate(10, 8)).toBe(80);
    expect(calculateCancellationRate(10, 2)).toBe(20);
  });
});
