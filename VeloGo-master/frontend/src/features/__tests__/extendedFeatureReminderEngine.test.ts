import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REMINDER_PREFERENCE,
  evaluateReminder,
  getDueReminderCandidates,
  getUpcomingReminderCandidates,
  isWithinQuietHours,
  normalizeReminderPreference,
  reminderFireTimes,
} from '../extendedFeatureReminderEngine';

const candidate = {
  id: 'reminder-1',
  title: 'Check scheduled ride',
  dueAt: '2026-11-02T10:00:00.000Z',
  kind: 'SCHEDULED_RIDE' as const,
};

describe('reminder preference normalization', () => {
  it('uses safe defaults when no preferences are supplied', () => {
    expect(normalizeReminderPreference({})).toEqual(DEFAULT_REMINDER_PREFERENCE);
  });

  it('filters invalid lead times and duplicate channels', () => {
    const result = normalizeReminderPreference({ leadMinutes: [-1, 15, 15, 20000], channels: ['IN_APP', 'IN_APP'] });
    expect(result.leadMinutes).toEqual([15]);
    expect(result.channels).toEqual(['IN_APP']);
  });

  it('clamps daily notification limits', () => {
    expect(normalizeReminderPreference({ maxPerDay: 100 }).maxPerDay).toBe(50);
  });
});

describe('quiet hours', () => {
  it('recognizes a normal daytime quiet interval', () => {
    expect(isWithinQuietHours(new Date('2026-11-02T13:00:00'), '12:00', '14:00')).toBe(true);
  });

  it('recognizes a quiet interval that crosses midnight', () => {
    expect(isWithinQuietHours(new Date('2026-11-02T23:30:00'), '22:00', '07:00')).toBe(true);
    expect(isWithinQuietHours(new Date('2026-11-02T12:00:00'), '22:00', '07:00')).toBe(false);
  });

  it('returns false for invalid quiet-hour values', () => {
    expect(isWithinQuietHours(new Date(), 'invalid', '07:00')).toBe(false);
  });
});

describe('reminder evaluation', () => {
  it('creates one fire time for each configured lead time', () => {
    const times = reminderFireTimes(candidate, { ...DEFAULT_REMINDER_PREFERENCE, leadMinutes: [10, 30] });
    expect(times).toHaveLength(2);
  });

  it('does not create fire times for completed reminders', () => {
    expect(reminderFireTimes({ ...candidate, completed: true }, DEFAULT_REMINDER_PREFERENCE)).toEqual([]);
  });

  it('marks an already sent reminder as suppressed', () => {
    const result = evaluateReminder(candidate, { leadMinutes: [15] }, {
      now: new Date('2026-11-02T09:50:00.000Z'),
      sentKeys: ['reminder-1:15'],
    });
    expect(result[0].suppressedReason).toBe('ALREADY_SENT');
  });

  it('suppresses reminders during quiet hours', () => {
    const result = evaluateReminder(candidate, {
      leadMinutes: [15],
      quietHoursEnabled: true,
      quietHoursStart: '09:00',
      quietHoursEnd: '11:00',
    }, { now: new Date('2026-11-02T09:50:00.000Z') });
    expect(result[0].suppressedReason).toBe('QUIET_HOURS');
  });

  it('finds due reminders and excludes completed records', () => {
    const result = getDueReminderCandidates([
      { ...candidate, dueAt: '2026-11-02T09:00:00.000Z' },
      { ...candidate, id: 'done', completed: true, dueAt: '2026-11-02T09:00:00.000Z' },
    ], new Date('2026-11-02T10:00:00.000Z'));
    expect(result).toHaveLength(1);
  });

  it('finds reminders within the requested horizon', () => {
    const result = getUpcomingReminderCandidates([candidate], 60, new Date('2026-11-02T09:30:00.000Z'));
    expect(result).toHaveLength(1);
  });
});
