import { describe, expect, it } from 'vitest';
import {
  calculateCommuteBudget,
  calculateDwellTime,
  calculateGroupBudget,
  calculateReadiness,
  clampPassengerCount,
  countMatchingWeekdays,
  estimateAirportTransferTime,
  estimatePerPassengerDistance,
  getPoolDepartureWindow,
  isDepartureCompatible,
  orderPlanningStops,
} from '../extendedFeaturePlanning';

describe('planning calculations', () => {
  it('orders route stops by their configured sequence', () => {
    const result = orderPlanningStops([
      { id: 'b', label: 'Second', order: 2, dwellMinutes: 5 },
      { id: 'a', label: 'First', order: 1, dwellMinutes: 0 },
    ]);
    expect(result.map((item) => item.label)).toEqual(['First', 'Second']);
  });

  it('adds dwell time while ignoring invalid negative values', () => {
    expect(calculateDwellTime([
      { id: 'a', label: 'A', order: 1, dwellMinutes: 10 },
      { id: 'b', label: 'B', order: 2, dwellMinutes: -5 },
    ])).toBe(10);
  });

  it('reports checklist readiness based on required items', () => {
    const result = calculateReadiness([
      { id: 'a', label: 'ID', completed: true, required: true },
      { id: 'b', label: 'Water', completed: false, required: false },
    ]);
    expect(result.ready).toBe(true);
    expect(result.percentage).toBe(50);
  });

  it('calculates group budget based on confirmed members', () => {
    expect(calculateGroupBudget(500, 4, 3)).toEqual({
      plannedTotal: 2000,
      confirmedShare: 1500,
      pendingMembers: 1,
    });
  });

  it('calculates an airport pickup recommendation', () => {
    const flight = new Date('2026-11-02T12:00:00Z');
    const result = estimateAirportTransferTime(flight, 'DEPARTURE', 30);
    expect(result?.toISOString()).toBe('2026-11-02T08:30:00.000Z');
  });

  it('calculates recurring commute budgets', () => {
    expect(calculateCommuteBudget(50, true, 20)).toBe(2000);
  });

  it('counts selected weekdays in a date range', () => {
    expect(countMatchingWeekdays(new Date(2026, 10, 2), new Date(2026, 10, 8), [1, 2, 3, 4, 5])).toBe(5);
  });

  it('divides a shared trip distance per passenger', () => {
    expect(estimatePerPassengerDistance(12, 3, true)).toBe(4);
    expect(estimatePerPassengerDistance(12, 3, false)).toBe(12);
  });

  it('builds a departure window around a proposed pool trip', () => {
    const result = getPoolDepartureWindow('2026-11-02T10:00:00Z', 15);
    expect(result?.earliest).toBe('2026-11-02T09:45:00.000Z');
    expect(result?.latest).toBe('2026-11-02T10:15:00.000Z');
  });

  it('checks time compatibility within a tolerance', () => {
    expect(isDepartureCompatible('2026-11-02T10:00:00Z', '2026-11-02T10:10:00Z', 15)).toBe(true);
    expect(isDepartureCompatible('2026-11-02T10:00:00Z', '2026-11-02T10:30:00Z', 15)).toBe(false);
  });

  it('clamps passenger counts to configured limits', () => {
    expect(clampPassengerCount(20)).toBe(8);
    expect(clampPassengerCount(0)).toBe(1);
  });
});
