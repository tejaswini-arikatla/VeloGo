/**
 * Reminder evaluation and notification preference helpers.
 * This module does not schedule background work; callers evaluate reminders when active.
 */
export type ReminderChannel = 'IN_APP' | 'BROWSER' | 'EMAIL' | 'SMS';
export type ReminderEventKind = 'SCHEDULED_RIDE' | 'AIRPORT_PICKUP' | 'PAYMENT_DUE' | 'CUSTOM';

export interface ReminderCandidate {
  id: string;
  title: string;
  dueAt: string;
  kind: ReminderEventKind;
  detail?: string;
  completed?: boolean;
  dismissed?: boolean;
}

export interface ReminderPreference {
  enabled: boolean;
  channels: ReminderChannel[];
  leadMinutes: number[];
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  maxPerDay: number;
}

export interface ReminderEvaluation {
  candidateId: string;
  title: string;
  kind: ReminderEventKind;
  dueAt: string;
  fireAt: string;
  minutesUntilDue: number;
  channel: ReminderChannel;
  suppressedReason?: 'DISABLED' | 'COMPLETED' | 'DISMISSED' | 'QUIET_HOURS' | 'ALREADY_SENT' | 'DAILY_LIMIT';
}

export const DEFAULT_REMINDER_PREFERENCE: ReminderPreference = {
  enabled: true,
  channels: ['IN_APP'],
  leadMinutes: [15, 30],
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  maxPerDay: 8,
};

function parseClock(value: string): number | null {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

export function isWithinQuietHours(
  date: Date,
  start: string,
  end: string,
  options?: { useUtc?: boolean },
): boolean {
  const startMinutes = parseClock(start);
  const endMinutes = parseClock(end);
  if (startMinutes == null || endMinutes == null || startMinutes === endMinutes) return false;
  const current = (options?.useUtc ? date.getUTCHours() : date.getHours()) * 60 +
                  (options?.useUtc ? date.getUTCMinutes() : date.getMinutes());
  if (startMinutes < endMinutes) return current >= startMinutes && current < endMinutes;
  return current >= startMinutes || current < endMinutes;
}

export function normalizeReminderPreference(
  input: Partial<ReminderPreference>,
): ReminderPreference {
  const channels = [...new Set((input.channels || DEFAULT_REMINDER_PREFERENCE.channels)
    .filter((channel): channel is ReminderChannel => ['IN_APP', 'BROWSER', 'EMAIL', 'SMS'].includes(channel)))];
  const leadMinutes = [...new Set((input.leadMinutes || DEFAULT_REMINDER_PREFERENCE.leadMinutes)
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 10080))]
    .sort((a, b) => a - b);
  return {
    enabled: input.enabled ?? DEFAULT_REMINDER_PREFERENCE.enabled,
    channels: channels.length ? channels : ['IN_APP'],
    leadMinutes: leadMinutes.length ? leadMinutes : [15],
    quietHoursEnabled: input.quietHoursEnabled ?? false,
    quietHoursStart: parseClock(input.quietHoursStart || '') == null ? '22:00' : input.quietHoursStart!,
    quietHoursEnd: parseClock(input.quietHoursEnd || '') == null ? '07:00' : input.quietHoursEnd!,
    maxPerDay: Number.isInteger(input.maxPerDay) ? Math.max(1, Math.min(50, input.maxPerDay!)) : 8,
  };
}

export function reminderFireTimes(
  candidate: ReminderCandidate,
  preference: ReminderPreference,
): Date[] {
  const due = new Date(candidate.dueAt);
  if (Number.isNaN(due.getTime()) || candidate.completed || candidate.dismissed || !preference.enabled) return [];
  return preference.leadMinutes.map((minutes) => new Date(due.getTime() - minutes * 60_000));
}

export function evaluateReminder(
  candidate: ReminderCandidate,
  preferenceInput: Partial<ReminderPreference>,
  options: {
    now?: Date;
    sentKeys?: string[];
    sentToday?: number;
  } = {},
): ReminderEvaluation[] {
  const preference = normalizeReminderPreference(preferenceInput);
  const now = options.now || new Date();
  const due = new Date(candidate.dueAt);
  if (Number.isNaN(due.getTime())) return [];
  if (candidate.completed || candidate.dismissed || !preference.enabled) return [];
  const sent = new Set(options.sentKeys || []);
  const todayCount = options.sentToday || 0;
  const candidateIsUtc = typeof candidate.dueAt === 'string' && candidate.dueAt.endsWith('Z');
  const quiet = preference.quietHoursEnabled && isWithinQuietHours(
    now,
    preference.quietHoursStart,
    preference.quietHoursEnd,
    candidateIsUtc ? { useUtc: true } : undefined
  );
  return preference.leadMinutes.map((leadMinutes) => {
    const fireAt = new Date(due.getTime() - leadMinutes * 60_000);
    const key = `${candidate.id}:${leadMinutes}`;
    let suppressedReason: ReminderEvaluation['suppressedReason'];
    if (sent.has(key)) suppressedReason = 'ALREADY_SENT';
    else if (todayCount >= preference.maxPerDay) suppressedReason = 'DAILY_LIMIT';
    else if (quiet) suppressedReason = 'QUIET_HOURS';
    else if (fireAt > now) suppressedReason = undefined;
    else if (due < now) suppressedReason = undefined;
    const channel = preference.channels[0] || 'IN_APP';
    return {
      candidateId: candidate.id,
      title: candidate.title,
      kind: candidate.kind,
      dueAt: due.toISOString(),
      fireAt: fireAt.toISOString(),
      minutesUntilDue: Math.round((due.getTime() - now.getTime()) / 60_000),
      channel,
      suppressedReason,
    };
  });
}

export function getDueReminderCandidates(
  candidates: ReminderCandidate[],
  now = new Date(),
): ReminderCandidate[] {
  return candidates.filter((candidate) => {
    if (candidate.completed || candidate.dismissed) return false;
    const due = new Date(candidate.dueAt);
    return !Number.isNaN(due.getTime()) && due.getTime() <= now.getTime();
  }).sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

export function getUpcomingReminderCandidates(
  candidates: ReminderCandidate[],
  horizonMinutes = 24 * 60,
  now = new Date(),
): ReminderCandidate[] {
  const end = now.getTime() + horizonMinutes * 60_000;
  return candidates.filter((candidate) => {
    if (candidate.completed || candidate.dismissed) return false;
    const due = new Date(candidate.dueAt).getTime();
    return Number.isFinite(due) && due >= now.getTime() && due <= end;
  }).sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

export function makeReminderIdempotencyKey(candidateId: string, leadMinutes: number): string {
  return `${candidateId}:${leadMinutes}`;
}

export function shouldRequestBrowserPermission(
  preference: ReminderPreference,
  permission: NotificationPermission,
): boolean {
  return preference.enabled && preference.channels.includes('BROWSER') && permission === 'default';
}

export function canSendBrowserNotification(
  preference: ReminderPreference,
  permission: NotificationPermission,
): boolean {
  return preference.enabled && preference.channels.includes('BROWSER') && permission === 'granted';
}

export function buildNotificationOptions(
  candidate: ReminderCandidate,
): NotificationOptions {
  return {
    body: candidate.detail || `Reminder: ${candidate.title}`,
    tag: `velogo-${candidate.id}`,
    icon: '/favicon.svg',
    requireInteraction: candidate.kind === 'SCHEDULED_RIDE' || candidate.kind === 'AIRPORT_PICKUP',
  };
}

export function getReminderPreferenceWarnings(preferenceInput: Partial<ReminderPreference>): string[] {
  const preference = normalizeReminderPreference(preferenceInput);
  const warnings: string[] = [];
  if (preference.channels.includes('EMAIL')) warnings.push('Email delivery requires a configured server-side email provider.');
  if (preference.channels.includes('SMS')) warnings.push('SMS delivery requires a verified server-side messaging provider.');
  if (preference.channels.includes('BROWSER')) warnings.push('Browser notifications require permission and an active browser context.');
  if (preference.quietHoursEnabled && preference.quietHoursStart === preference.quietHoursEnd) {
    warnings.push('Quiet hours start and end are identical, so the quiet window is disabled.');
  }
  return warnings;
}
