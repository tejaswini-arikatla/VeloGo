import { describe, expect, it } from 'vitest';
import {
  buildCategoryMetrics,
  buildDestinationMetrics,
  buildMonthlyMetrics,
  buildWeekdayDistribution,
  calculateAverage,
  calculateMedian,
  comparePeriods,
  detectFareOutliers,
  movingAverage,
  percentile,
  summarizeJourneys,
} from '../extendedFeatureInsights';

const sample = [
  { id: '1', date: '2026-10-01T09:00:00', distanceKm: 5, fare: 60, status: 'COMPLETED', vehicle: 'BIKE', destination: 'College' },
  { id: '2', date: '2026-10-03T09:00:00', distanceKm: 8, fare: 100, status: 'COMPLETED', vehicle: 'AUTO', destination: 'Station' },
  { id: '3', date: '2026-10-04T09:00:00', distanceKm: 4, fare: 50, status: 'CANCELLED', vehicle: 'CAB', destination: 'Airport' },
  { id: '4', date: '2026-11-01T09:00:00', distanceKm: 10, fare: 120, status: 'COMPLETED', vehicle: 'BIKE', destination: 'College' },
];

describe('journey summary', () => {
  it('summarizes completed, cancelled and active journeys', () => {
    const result = summarizeJourneys(sample);
    expect(result.totalRecords).toBe(4);
    expect(result.completed).toBe(3);
    expect(result.cancelled).toBe(1);
    expect(result.totalSpend).toBe(280);
    expect(result.totalDistanceKm).toBe(23);
  });

  it('returns zero averages for an empty collection', () => {
    const result = summarizeJourneys([]);
    expect(result.averageFare).toBe(0);
    expect(result.averageDistanceKm).toBe(0);
  });

  it('builds month-level spend and distance metrics', () => {
    const result = buildMonthlyMetrics(sample);
    expect(result).toHaveLength(2);
    expect(result[0].rides).toBe(2);
    expect(result[0].spend).toBe(160);
  });

  it('groups vehicle categories', () => {
    const result = buildCategoryMetrics(sample);
    expect(result[0].category).toBe('BIKE');
    expect(result[0].count).toBe(2);
  });

  it('ranks frequently visited destinations', () => {
    const result = buildDestinationMetrics(sample);
    expect(result[0].destination).toBe('College');
    expect(result[0].count).toBe(2);
  });

  it('compares periods without dividing by zero', () => {
    expect(comparePeriods(20, 10).percentageChange).toBe(100);
    expect(comparePeriods(20, 0).percentageChange).toBeNull();
    expect(comparePeriods(0, 0).direction).toBe('UNCHANGED');
  });

  it('calculates percentiles using interpolation', () => {
    expect(percentile([10, 20, 30, 40], 50)).toBe(25);
  });

  it('detects high-fare outliers only when enough records exist', () => {
    expect(detectFareOutliers(sample)).toEqual([]);
  });

  it('creates weekday distribution', () => {
    const result = buildWeekdayDistribution(sample);
    expect(result).toHaveLength(7);
    expect(result.reduce((sum, item) => sum + item.count, 0)).toBe(4);
  });

  it('calculates a moving average with a rolling window', () => {
    expect(movingAverage([10, 20, 30, 40], 2)).toEqual([10, 15, 25, 35]);
  });

  it('calculates average and median', () => {
    expect(calculateAverage([2, 4, 6])).toBe(4);
    expect(calculateMedian([8, 1, 4])).toBe(4);
  });
});
