import { ScheduledRideRecord } from './featureModels';

export interface CalendarDay {
  date: Date;
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  events: ScheduledRideRecord[];
}

export interface CalendarWeek {
  days: CalendarDay[];
  weekNumber: number;
}

export interface ReminderCandidate {
  rideId: string;
  title: string;
  scheduledAt: string;
  reminderAt: string;
  minutesUntilRide: number;
  minutesUntilReminder: number;
  due: boolean;
  overdue: boolean;
}

export interface CalendarSummary {
  total: number;
  upcoming: number;
  today: number;
  thisWeek: number;
  cancelled: number;
  nextRide?: ScheduledRideRecord;
}

const DAY_MS = 86_400_000;

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseLocalDate(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function addMonths(date: Date, amount: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth() + amount, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(date.getDate(), lastDay));
  return next;
}

export function getMonthGrid(year: number, monthIndex: number, events: ScheduledRideRecord[], today = new Date()): CalendarWeek[] {
  const first = new Date(year, monthIndex, 1);
  const gridStart = new Date(year, monthIndex, 1 - first.getDay());
  const todayKey = dateKey(today);
  const byDate = new Map<string, ScheduledRideRecord[]>();
  events.forEach((event) => {
    if (event.status !== 'SCHEDULED') return;
    const key = dateKey(new Date(event.scheduledAt));
    byDate.set(key, [...(byDate.get(key) || []), event]);
  });
  const weeks: CalendarWeek[] = [];
  for (let week = 0; week < 6; week += 1) {
    const days: CalendarDay[] = [];
    for (let day = 0; day < 7; day += 1) {
      const date = addDays(gridStart, week * 7 + day);
      const key = dateKey(date);
      days.push({
        date,
        dateKey: key,
        dayNumber: date.getDate(),
        isCurrentMonth: date.getMonth() === monthIndex,
        isToday: key === todayKey,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        events: (byDate.get(key) || []).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
      });
    }
    weeks.push({ days, weekNumber: week + 1 });
  }
  return weeks;
}

export function getCalendarSummary(events: ScheduledRideRecord[], now = new Date()): CalendarSummary {
  const currentTime = now.getTime();
  const todayStart = startOfDay(now).getTime();
  const todayEnd = endOfDay(now).getTime();
  const weekEnd = todayStart + 7 * DAY_MS;
  const active = events.filter((event) => event.status === 'SCHEDULED');
  const future = active.filter((event) => new Date(event.scheduledAt).getTime() >= currentTime)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  return {
    total: events.length,
    upcoming: future.length,
    today: active.filter((event) => {
      const timestamp = new Date(event.scheduledAt).getTime();
      return timestamp >= todayStart && timestamp <= todayEnd;
    }).length,
    thisWeek: active.filter((event) => {
      const timestamp = new Date(event.scheduledAt).getTime();
      return timestamp >= todayStart && timestamp < weekEnd;
    }).length,
    cancelled: events.filter((event) => event.status === 'CANCELLED').length,
    nextRide: future[0],
  };
}

export function buildReminderCandidates(events: ScheduledRideRecord[], now = new Date()): ReminderCandidate[] {
  return events
    .filter((event) => event.status === 'SCHEDULED' && event.reminderMinutes > 0)
    .map((event) => {
      const scheduledAt = new Date(event.scheduledAt);
      const reminderAt = new Date(scheduledAt.getTime() - event.reminderMinutes * 60_000);
      const minutesUntilRide = Math.round((scheduledAt.getTime() - now.getTime()) / 60_000);
      const minutesUntilReminder = Math.round((reminderAt.getTime() - now.getTime()) / 60_000);
      return {
        rideId: event.id,
        title: `${event.pickup} → ${event.destination}`,
        scheduledAt: scheduledAt.toISOString(),
        reminderAt: reminderAt.toISOString(),
        minutesUntilRide,
        minutesUntilReminder,
        due: minutesUntilReminder <= 0 && minutesUntilRide > 0,
        overdue: minutesUntilRide <= 0,
      };
    })
    .sort((a, b) => a.reminderAt.localeCompare(b.reminderAt));
}

export function getDueReminders(events: ScheduledRideRecord[], now = new Date()): ReminderCandidate[] {
  return buildReminderCandidates(events, now).filter((candidate) => candidate.due);
}

export function getUpcomingWindow(events: ScheduledRideRecord[], start: Date, days: number): ScheduledRideRecord[] {
  const end = new Date(start.getTime() + Math.max(0, days) * DAY_MS);
  return events.filter((event) => {
    if (event.status !== 'SCHEDULED') return false;
    const timestamp = new Date(event.scheduledAt).getTime();
    return timestamp >= start.getTime() && timestamp < end.getTime();
  }).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

export function toIcsDate(value: Date): string {
  return value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeIcs(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\r?\n/g, '\\n');
}

export function scheduledRideToIcs(event: ScheduledRideRecord): string {
  const start = new Date(event.scheduledAt);
  const end = new Date(start.getTime() + 30 * 60_000);
  const description = [
    `Vehicle: ${event.vehicle}`,
    `Passengers: ${event.passengerCount}`,
    event.note ? `Note: ${event.note}` : '',
    'Planning reminder only. Confirm an actual ride in VeloGo before travelling.',
  ].filter(Boolean).join('\\n');
  return [
    'BEGIN:VEVENT',
    `UID:${escapeIcs(event.id)}@velogo.local`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${escapeIcs(`VeloGo: ${event.pickup} to ${event.destination}`)}`,
    `LOCATION:${escapeIcs(event.pickup)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
  ].join('\r\n');
}

export function exportScheduledRidesToIcs(events: ScheduledRideRecord[]): string {
  const active = events.filter((event) => event.status === 'SCHEDULED');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//VeloGo//Customer Planning//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...active.map(scheduledRideToIcs),
    'END:VCALENDAR',
  ].join('\r\n');
}

export function createCalendarDownload(content: string, filename: string, mimeType = 'text/calendar'): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function formatCalendarMonth(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(date);
}

export function getCalendarWeekdayLabels(locale = 'en-IN'): string[] {
  const sunday = new Date(2024, 0, 7);
  return Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(addDays(sunday, index)));
}

export function isSameCalendarDay(first: Date, second: Date): boolean {
  return dateKey(first) === dateKey(second);
}

export function clampCalendarMonth(date: Date, minimum: Date, maximum: Date): Date {
  const candidate = new Date(date.getFullYear(), date.getMonth(), 1);
  const min = new Date(minimum.getFullYear(), minimum.getMonth(), 1);
  const max = new Date(maximum.getFullYear(), maximum.getMonth(), 1);
  if (candidate < min) return min;
  if (candidate > max) return max;
  return candidate;
}
