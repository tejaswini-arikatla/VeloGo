import { describe, expect, it } from 'vitest';
import {
  addCalendarDays,
  addCalendarMonths,
  buildCalendarMonth,
  clampDate,
  combineLocalDateAndTime,
  daysBetween,
  endOfMonth,
  endOfWeek,
  enumerateDateRange,
  getMonthBounds,
  getRelativeDateLabel,
  isDateWithinRange,
  localDateKey,
  parseLocalDate,
  startOfMonth,
  startOfWeek,
  weekdayName,
} from '../extendedFeatureDates';

describe('local date parsing', () => {
  it('parses a valid calendar date without a UTC conversion', () => {
    expect(parseLocalDate('2026-11-02')?.getDate()).toBe(2);
  });

  it('rejects an impossible calendar date', () => {
    expect(parseLocalDate('2026-02-30')).toBeNull();
  });

  it('rejects malformed date strings', () => {
    expect(parseLocalDate('02-11-2026')).toBeNull();
  });

  it('formats a local date key', () => {
    expect(localDateKey(new Date(2026, 10, 2))).toBe('2026-11-02');
  });

  it('adds and subtracts calendar days', () => {
    expect(addCalendarDays('2026-11-02', 1)).toBe('2026-11-03');
    expect(addCalendarDays('2026-11-02', -2)).toBe('2026-10-31');
  });

  it('adds months while clamping to the last valid day', () => {
    expect(addCalendarMonths('2026-01-31', 1)).toBe('2026-02-28');
  });
});

describe('calendar range helpers', () => {
  it('finds Monday as the start of a week', () => {
    expect(startOfWeek('2026-11-04')).toBe('2026-11-02');
  });

  it('finds the end of a week', () => {
    expect(endOfWeek('2026-11-04')).toBe('2026-11-08');
  });

  it('finds month boundaries', () => {
    expect(startOfMonth('2026-11-17')).toBe('2026-11-01');
    expect(endOfMonth('2026-11-17')).toBe('2026-11-30');
  });

  it('enumerates a bounded date range', () => {
    expect(enumerateDateRange({ start: '2026-11-01', end: '2026-11-03' })).toHaveLength(3);
  });

  it('does not enumerate a reversed range', () => {
    expect(enumerateDateRange({ start: '2026-11-03', end: '2026-11-01' })).toEqual([]);
  });

  it('builds a six-week calendar grid', () => {
    expect(buildCalendarMonth(2026, 10)).toHaveLength(42);
  });

  it('marks the selected day and current day', () => {
    const days = buildCalendarMonth(2026, 10, {
      selectedDate: '2026-11-02',
      today: new Date(2026, 10, 2),
    });
    expect(days.find((day) => day.date === '2026-11-02')?.isSelected).toBe(true);
    expect(days.find((day) => day.date === '2026-11-02')?.isToday).toBe(true);
  });

  it('clamps a date to a range', () => {
    expect(clampDate('2026-10-01', '2026-11-01', '2026-11-30')).toBe('2026-11-01');
  });

  it('checks whether a date belongs to a range', () => {
    expect(isDateWithinRange('2026-11-15', { start: '2026-11-01', end: '2026-11-30' })).toBe(true);
    expect(isDateWithinRange('2026-12-01', { start: '2026-11-01', end: '2026-11-30' })).toBe(false);
  });

  it('calculates day differences', () => {
    expect(daysBetween('2026-11-01', '2026-11-05')).toBe(4);
  });

  it('returns a month range for a valid month', () => {
    expect(getMonthBounds('2026-02')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
  });

  it('formats relative dates', () => {
    expect(getRelativeDateLabel('2026-11-03', new Date(2026, 10, 2))).toBe('Tomorrow');
  });

  it('returns a weekday label', () => {
    expect(weekdayName('2026-11-02')).toBe('Monday');
  });

  it('combines local date and time', () => {
    expect(combineLocalDateAndTime('2026-11-02', '09:30')?.getHours()).toBe(9);
  });
});
