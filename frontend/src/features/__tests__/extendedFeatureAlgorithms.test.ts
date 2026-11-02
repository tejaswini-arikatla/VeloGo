import { describe, expect, it } from 'vitest';
import {
  calculateBudgetStatus,
  calculateCustomSplit,
  calculateEqualSplit,
  calculateSettlements,
  calculateWeightedSplit,
  estimateAvoidedEmissions,
  estimateTripEmissions,
  nextOccurrences,
  rankVehicleOptions,
  rowsToCsv,
  safePercentage,
} from '../extendedFeatureAlgorithms';

describe('fare allocation algorithms', () => {
  const people = [
    { id: 'a', name: 'Asha', weight: 1, paid: 100, settled: false },
    { id: 'b', name: 'Ravi', weight: 1, paid: 0, settled: false },
    { id: 'c', name: 'Maya', weight: 1, paid: 0, settled: false },
  ];

  it('splits a total equally and assigns the rounding remainder', () => {
    const result = calculateEqualSplit(100, people);
    expect(result.map((item) => item.share)).toEqual([33.34, 33.33, 33.33]);
    expect(result.reduce((sum, item) => sum + item.share, 0)).toBe(100);
  });

  it('returns no allocation for a negative total', () => {
    expect(calculateEqualSplit(-10, people)).toEqual([]);
  });

  it('returns no allocation for an empty participant list', () => {
    expect(calculateEqualSplit(100, [])).toEqual([]);
  });

  it('uses weights to calculate proportional shares', () => {
    const weighted = calculateWeightedSplit(600, [
      { ...people[0], weight: 1 },
      { ...people[1], weight: 2 },
      { ...people[2], weight: 3 },
    ]);
    expect(weighted.map((item) => item.share)).toEqual([100, 200, 300]);
  });

  it('ignores non-positive weights', () => {
    const result = calculateWeightedSplit(100, [
      { ...people[0], weight: 0 },
      { ...people[1], weight: 2 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].share).toBe(100);
  });

  it('accepts custom shares only when they add up', () => {
    const custom = people.map((person, index) => ({ ...person, customShare: [40, 30, 30][index] }));
    expect(calculateCustomSplit(custom, 100)).toHaveLength(3);
    expect(calculateCustomSplit(custom, 101)).toEqual([]);
  });

  it('reduces several debts to a small set of settlement transfers', () => {
    const allocations = [
      { participantId: 'a', participantName: 'A', share: 50, paid: 100, balance: 50 },
      { participantId: 'b', participantName: 'B', share: 50, paid: 0, balance: -50 },
    ];
    expect(calculateSettlements(allocations)).toEqual([
      { fromId: 'b', fromName: 'B', toId: 'a', toName: 'A', amount: 50 },
    ]);
  });

  it('does not create settlement transfers for a balanced split', () => {
    expect(calculateSettlements([
      { participantId: 'a', participantName: 'A', share: 50, paid: 50, balance: 0 },
    ])).toEqual([]);
  });
});

describe('environment estimates', () => {
  it('calculates a motorbike emissions estimate', () => {
    expect(estimateTripEmissions(10, 'BIKE')).toBe(420);
  });

  it('calculates zero emissions for walking', () => {
    expect(estimateTripEmissions(10, 'WALK')).toBe(0);
  });

  it('returns zero for an unknown vehicle', () => {
    expect(estimateTripEmissions(10, 'UNKNOWN')).toBe(0);
  });

  it('calculates avoided emissions relative to a baseline', () => {
    expect(estimateAvoidedEmissions(10, 'WALK')).toBe(1710);
  });

  it('does not report negative avoided emissions', () => {
    expect(estimateAvoidedEmissions(10, 'CAB')).toBe(0);
  });
});

describe('budget and commute algorithms', () => {
  it('marks a budget as healthy below its warning threshold', () => {
    expect(calculateBudgetStatus(300, 1000, 80).status).toBe('HEALTHY');
  });

  it('marks a budget as warning when threshold is reached', () => {
    expect(calculateBudgetStatus(800, 1000, 80).status).toBe('WARNING');
  });

  it('marks a budget as exceeded above its limit', () => {
    expect(calculateBudgetStatus(1100, 1000).status).toBe('EXCEEDED');
  });

  it('handles a zero budget without dividing by zero', () => {
    expect(calculateBudgetStatus(10, 0).percentUsed).toBe(100);
  });

  it('creates a finite list of selected weekdays', () => {
    const result = nextOccurrences('2026-11-02', [1, 3, 5], 4, new Date('2026-11-01T00:00:00'));
    expect(result).toHaveLength(4);
    expect(result[0]).toBe('2026-11-02');
  });

  it('rejects an invalid recurrence count', () => {
    expect(nextOccurrences('2026-11-02', [1], 0)).toEqual([]);
  });
});

describe('vehicle ranking and CSV safety', () => {
  const options = [
    { id: 'bike', name: 'Bike', estimatedFare: 50, estimatedMinutes: 20, capacity: 1, comfort: 2, emissionsGramsPerKm: 42, availability: 80 },
    { id: 'cab', name: 'Cab', estimatedFare: 200, estimatedMinutes: 30, capacity: 4, comfort: 5, emissionsGramsPerKm: 171, availability: 90 },
  ];

  it('ranks the cheaper vehicle first when price is the priority', () => {
    const ranked = rankVehicleOptions(options, { price: 5, time: 1, comfort: 1, emissions: 1 });
    expect(ranked[0].name).toBe('Bike');
    expect(ranked[0].rank).toBe(1);
  });

  it('ranks the more comfortable vehicle first when comfort dominates', () => {
    const ranked = rankVehicleOptions(options, { price: 0, time: 0, comfort: 5, emissions: 0 });
    expect(ranked[0].name).toBe('Cab');
  });

  it('keeps percentages within zero and one hundred', () => {
    expect(safePercentage(20, 10)).toBe(100);
    expect(safePercentage(-1, 10)).toBe(0);
    expect(safePercentage(1, 0)).toBe(0);
  });

  it('quotes CSV cells and escapes quotes', () => {
    expect(rowsToCsv(['Name'], [['A "quoted" name']])).toContain('"A ""quoted"" name"');
  });
});
