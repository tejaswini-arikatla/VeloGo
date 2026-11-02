import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildNotificationDigest,
  evaluateReminders,
  getNotificationPreferenceSummary,
  isWithinQuietHours,
  normalizeReminderLeadMinutes,
  readNotificationPreferences,
  saveNotificationPreferences,
} from '../featureNotifications';
import { ScheduledRideRecord } from '../featureModels';

const userId = 'notification-test-user';
const makeRide = (id: string, scheduledAt: Date, reminderMinutes = 30): ScheduledRideRecord => ({
  id, pickup: 'College', destination: 'Station', vehicle: 'AUTO', scheduledAt: scheduledAt.toISOString(),
  passengerCount: 1, note: '', estimatedFare: null, status: 'SCHEDULED', reminderMinutes,
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: 1,
});

beforeEach(() => localStorage.clear());

describe('notification preference rules', () => {
  it('returns safe defaults when no preferences exist', () => {
    const preferences = readNotificationPreferences(userId);
    expect(preferences.enabled).toBe(true);
    expect(preferences.scheduledRideReminders).toBe(true);
    expect(preferences.quietHoursEnabled).toBe(false);
  });

  it('persists notification preferences per account', () => {
    const preferences = { ...readNotificationPreferences(userId), enabled: false, reminderLeadMinutes: 60 };
    saveNotificationPreferences(userId, preferences);
    expect(readNotificationPreferences(userId).enabled).toBe(false);
    expect(readNotificationPreferences('another-user').enabled).toBe(true);
  });

  it('detects a quiet-hours interval that does not cross midnight', () => {
    expect(isWithinQuietHours(new Date(2026, 0, 1, 23, 0), '22:00', '06:00')).toBe(true);
  });

  it('detects a quiet-hours interval that crosses midnight', () => {
    expect(isWithinQuietHours(new Date(2026, 0, 1, 2, 0), '22:00', '07:00')).toBe(true);
    expect(isWithinQuietHours(new Date(2026, 0, 1, 12, 0), '22:00', '07:00')).toBe(false);
  });

  it('ignores malformed quiet-hours values', () => {
    expect(isWithinQuietHours(new Date(2026, 0, 1, 23, 0), 'bad', '06:00')).toBe(false);
  });

  it('suppresses reminders when notifications are disabled', () => {
    const now = new Date(2026, 0, 1, 9, 30);
    const ride = makeRide('due', new Date(2026, 0, 1, 10, 0));
    const preferences = { ...readNotificationPreferences(userId), enabled: false };
    expect(evaluateReminders([ride], preferences, now)[0].suppressed).toBe(true);
  });

  it('suppresses reminders during quiet hours', () => {
    const now = new Date(2026, 0, 1, 23, 30);
    const ride = makeRide('due', new Date(2026, 0, 2, 0, 0));
    const preferences = { ...readNotificationPreferences(userId), quietHoursEnabled: true, quietHoursStart: '22:00', quietHoursEnd: '07:00' };
    const result = evaluateReminders([ride], preferences, now);
    expect(result[0].suppressed).toBe(true);
    expect(result[0].suppressionReason).toContain('Quiet hours');
  });

  it('returns a digest with upcoming rides today', () => {
    const now = new Date(2026, 0, 1, 9, 0);
    const todayRide = makeRide('today', new Date(2026, 0, 1, 11, 0));
    const tomorrowRide = makeRide('tomorrow', new Date(2026, 0, 2, 11, 0));
    const digest = buildNotificationDigest(userId, [todayRide, tomorrowRide], now);
    expect(digest.upcomingToday.map((item) => item.id)).toEqual(['today']);
  });

  it('normalizes a reminder lead time to the nearest supported choice', () => {
    expect(normalizeReminderLeadMinutes(26)).toBe(30);
    expect(normalizeReminderLeadMinutes(80)).toBe(60);
  });

  it('creates a readable preference summary', () => {
    const summary = getNotificationPreferenceSummary({ ...readNotificationPreferences(userId), quietHoursEnabled: true });
    expect(summary.some((item) => item.includes('Quiet hours'))).toBe(true);
  });
});
