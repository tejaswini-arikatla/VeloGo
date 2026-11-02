import { describe, expect, it } from 'vitest';
import { buildReminderCandidates, dateKey, exportScheduledRidesToIcs, getCalendarSummary, getMonthGrid, getUpcomingWindow, parseLocalDate } from '../featureCalendar';
import { ScheduledRideRecord } from '../featureModels';

const scheduled = (id: string, scheduledAt: Date, status: ScheduledRideRecord['status'] = 'SCHEDULED'): ScheduledRideRecord => ({
  id, pickup: 'VVIT, Guntur', destination: 'Railway Station', vehicle: 'AUTO',
  scheduledAt: scheduledAt.toISOString(), passengerCount: 1, note: 'Bring a bag', estimatedFare: 120,
  status, reminderMinutes: 30, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: 1,
});

describe('calendar helpers', () => {
  it('formats date keys in local calendar format', () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('parses a valid local date', () => {
    const parsed = parseLocalDate('2026-02-14');
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(1);
    expect(parsed?.getDate()).toBe(14);
  });

  it('returns null for malformed date strings', () => {
    expect(parseLocalDate('not-a-date')).toBeNull();
    expect(parseLocalDate('')).toBeNull();
  });

  it('creates six weeks of calendar days', () => {
    const weeks = getMonthGrid(2026, 1, [], new Date(2026, 1, 12));
    expect(weeks).toHaveLength(6);
    expect(weeks.every((week) => week.days.length === 7)).toBe(true);
  });

  it('places scheduled rides on the correct calendar date', () => {
    const event = scheduled('ride-1', new Date(2026, 1, 12, 10, 30));
    const weeks = getMonthGrid(2026, 1, [event], new Date(2026, 1, 12));
    const day = weeks.flatMap((week) => week.days).find((item) => item.dateKey === '2026-02-12');
    expect(day?.events).toHaveLength(1);
    expect(day?.isToday).toBe(true);
  });

  it('does not show cancelled records as calendar events', () => {
    const event = scheduled('ride-1', new Date(2026, 1, 12), 'CANCELLED');
    const weeks = getMonthGrid(2026, 1, [event]);
    expect(weeks.flatMap((week) => week.days).flatMap((day) => day.events)).toHaveLength(0);
  });

  it('summarizes future, today and cancelled plans', () => {
    const now = new Date(2026, 1, 12, 9, 0);
    const records = [
      scheduled('today', new Date(2026, 1, 12, 12, 0)),
      scheduled('tomorrow', new Date(2026, 1, 13, 12, 0)),
      scheduled('cancelled', new Date(2026, 1, 14), 'CANCELLED'),
    ];
    const summary = getCalendarSummary(records, now);
    expect(summary.upcoming).toBe(2);
    expect(summary.today).toBe(1);
    expect(summary.cancelled).toBe(1);
    expect(summary.nextRide?.id).toBe('today');
  });

  it('creates reminders at the configured lead time', () => {
    const now = new Date(2026, 1, 12, 9, 30);
    const event = scheduled('reminder', new Date(2026, 1, 12, 10, 0));
    const candidates = buildReminderCandidates([event], now);
    expect(candidates[0].due).toBe(true);
    expect(candidates[0].minutesUntilRide).toBe(30);
  });

  it('does not remind for plans without reminders', () => {
    const event = { ...scheduled('no-reminder', new Date(Date.now() + 60_000)), reminderMinutes: 0 };
    expect(buildReminderCandidates([event])).toHaveLength(0);
  });

  it('filters a requested upcoming window', () => {
    const start = new Date(2026, 1, 12);
    const records = [scheduled('a', new Date(2026, 1, 13)), scheduled('b', new Date(2026, 1, 25))];
    expect(getUpcomingWindow(records, start, 7).map((item) => item.id)).toEqual(['a']);
  });

  it('exports valid calendar events with escaped commas', () => {
    const event = { ...scheduled('ics', new Date(2026, 1, 12, 10, 0)), pickup: 'Main Gate, VVIT' };
    const ics = exportScheduledRidesToIcs([event]);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('Main Gate\\, VVIT');
    expect(ics).toContain('END:VCALENDAR');
  });
});
