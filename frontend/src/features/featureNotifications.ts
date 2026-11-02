import { FeatureNotice, ScheduledRideRecord } from './featureModels';
import { buildReminderCandidates, ReminderCandidate } from './featureCalendar';
import { addNotice, readNotices } from './featureStorage';

export interface NotificationPreference {
  enabled: boolean;
  scheduledRideReminders: boolean;
  reminderLeadMinutes: number;
  showInAppNotices: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export interface NotificationDigest {
  dueReminders: ReminderCandidate[];
  upcomingToday: ScheduledRideRecord[];
  overduePlans: ScheduledRideRecord[];
  unreadNotices: FeatureNotice[];
  generatedAt: string;
}

export interface ReminderEvaluation {
  candidate: ReminderCandidate;
  suppressed: boolean;
  suppressionReason?: string;
}

const preferenceKey = (userId: string) => `velogo_feature_suite_v1:${encodeURIComponent(userId)}:notification-preferences`;
const defaultPreference: NotificationPreference = {
  enabled: true,
  scheduledRideReminders: true,
  reminderLeadMinutes: 30,
  showInAppNotices: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
};

export function readNotificationPreferences(userId: string): NotificationPreference {
  try {
    const raw = localStorage.getItem(preferenceKey(userId));
    if (!raw) return { ...defaultPreference };
    const parsed = JSON.parse(raw) as Partial<NotificationPreference>;
    return { ...defaultPreference, ...parsed };
  } catch {
    return { ...defaultPreference };
  }
}

export function saveNotificationPreferences(userId: string, preferences: NotificationPreference): void {
  if (!userId) throw new Error('A signed-in user is required to save notification preferences.');
  localStorage.setItem(preferenceKey(userId), JSON.stringify(preferences));
}

function minutesOfDay(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value || '');
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function isWithinQuietHours(now: Date, start: string, end: string): boolean {
  const startMinutes = minutesOfDay(start);
  const endMinutes = minutesOfDay(end);
  if (startMinutes == null || endMinutes == null || startMinutes === endMinutes) return false;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  if (startMinutes < endMinutes) return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

export function evaluateReminders(
  rides: ScheduledRideRecord[],
  preferences: NotificationPreference,
  now = new Date(),
): ReminderEvaluation[] {
  return buildReminderCandidates(rides, now).filter((candidate) => candidate.due).map((candidate) => {
    if (!preferences.enabled) return { candidate, suppressed: true, suppressionReason: 'Notifications are disabled.' };
    if (!preferences.scheduledRideReminders) return { candidate, suppressed: true, suppressionReason: 'Scheduled ride reminders are disabled.' };
    if (preferences.quietHoursEnabled && isWithinQuietHours(now, preferences.quietHoursStart, preferences.quietHoursEnd)) {
      return { candidate, suppressed: true, suppressionReason: 'Quiet hours are active.' };
    }
    return { candidate, suppressed: false };
  });
}

export function buildNotificationDigest(
  userId: string,
  rides: ScheduledRideRecord[],
  now = new Date(),
): NotificationDigest {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 86_400_000);
  const active = rides.filter((ride) => ride.status === 'SCHEDULED');
  const preferences = readNotificationPreferences(userId);
  const evaluated = evaluateReminders(active, preferences, now);
  return {
    dueReminders: evaluated.filter((item) => !item.suppressed).map((item) => item.candidate),
    upcomingToday: active.filter((ride) => {
      const timestamp = new Date(ride.scheduledAt).getTime();
      return timestamp >= start.getTime() && timestamp < end.getTime();
    }).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    overduePlans: active.filter((ride) => new Date(ride.scheduledAt).getTime() < now.getTime()),
    unreadNotices: readNotices(userId).filter((notice) => !notice.dismissed),
    generatedAt: now.toISOString(),
  };
}

export function recordDueReminderNotices(userId: string, rides: ScheduledRideRecord[], now = new Date()): FeatureNotice[] {
  const preferences = readNotificationPreferences(userId);
  if (!preferences.showInAppNotices) return [];
  const candidates = evaluateReminders(rides, preferences, now).filter((item) => !item.suppressed);
  const existing = readNotices(userId);
  const created: FeatureNotice[] = [];
  candidates.forEach(({ candidate }) => {
    const duplicate = existing.some((notice) => notice.message.includes(candidate.rideId) && notice.title === 'Upcoming scheduled ride');
    if (duplicate) return;
    created.push(addNotice(userId, 'info', 'Upcoming scheduled ride', `${candidate.title} (${candidate.rideId}) is approaching.`));
  });
  return created;
}

export function getNotificationPreferenceSummary(preferences: NotificationPreference): string[] {
  const summary: string[] = [];
  summary.push(preferences.enabled ? 'Notifications enabled' : 'Notifications disabled');
  summary.push(preferences.scheduledRideReminders ? `Ride reminders ${preferences.reminderLeadMinutes} minutes before` : 'Ride reminders disabled');
  summary.push(preferences.showInAppNotices ? 'In-app notices enabled' : 'In-app notices disabled');
  if (preferences.quietHoursEnabled) summary.push(`Quiet hours ${preferences.quietHoursStart}–${preferences.quietHoursEnd}`);
  return summary;
}

export function normalizeReminderLeadMinutes(value: number): number {
  const allowed = [0, 5, 10, 15, 30, 60, 120, 1440];
  return allowed.reduce((closest, candidate) => Math.abs(candidate - value) < Math.abs(closest - value) ? candidate : closest, allowed[0]);
}

export function shouldAskForBrowserNotificationPermission(preferences: NotificationPreference): boolean {
  return preferences.enabled && preferences.scheduledRideReminders && typeof Notification !== 'undefined' && Notification.permission === 'default';
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

export function sendBrowserReminder(candidate: ReminderCandidate): boolean {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
  const notification = new Notification('Upcoming VeloGo plan', {
    body: candidate.title,
    tag: `velogo-reminder-${candidate.rideId}`,
    icon: '/favicon.svg',
  });
  notification.onclick = () => window.focus();
  return true;
}
