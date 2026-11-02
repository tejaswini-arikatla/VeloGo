/**
 * Local date helpers used by planning screens.
 * Calendar dates are kept as YYYY-MM-DD strings to avoid accidental UTC shifts.
 */
export interface CalendarDay {
  date: string;
  dayOfMonth: number;
  weekday: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  isPast: boolean;
  isSelected: boolean;
}

export interface DateRange {
  start: string;
  end: string;
}

const pad = (value: number) => String(value).padStart(2, '0');

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseLocalDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;
  return parsed;
}

export function addCalendarDays(value: string, amount: number): string | null {
  const parsed = parseLocalDate(value);
  if (!parsed || !Number.isInteger(amount)) return null;
  parsed.setDate(parsed.getDate() + amount);
  return localDateKey(parsed);
}

export function addCalendarMonths(value: string, amount: number): string | null {
  const parsed = parseLocalDate(value);
  if (!parsed || !Number.isInteger(amount)) return null;
  const originalDay = parsed.getDate();
  parsed.setDate(1);
  parsed.setMonth(parsed.getMonth() + amount);
  const lastDay = new Date(parsed.getFullYear(), parsed.getMonth() + 1, 0).getDate();
  parsed.setDate(Math.min(originalDay, lastDay));
  return localDateKey(parsed);
}

export function startOfWeek(value: string, weekStartsOn: number = 1): string | null {
  const parsed = parseLocalDate(value);
  if (!parsed || weekStartsOn < 0 || weekStartsOn > 6) return null;
  const offset = (parsed.getDay() - weekStartsOn + 7) % 7;
  parsed.setDate(parsed.getDate() - offset);
  return localDateKey(parsed);
}

export function endOfWeek(value: string, weekStartsOn: number = 1): string | null {
  const start = startOfWeek(value, weekStartsOn);
  return start ? addCalendarDays(start, 6) : null;
}

export function startOfMonth(value: string): string | null {
  const parsed = parseLocalDate(value);
  if (!parsed) return null;
  parsed.setDate(1);
  return localDateKey(parsed);
}

export function endOfMonth(value: string): string | null {
  const parsed = parseLocalDate(value);
  if (!parsed) return null;
  parsed.setMonth(parsed.getMonth() + 1, 0);
  return localDateKey(parsed);
}

export function enumerateDateRange(range: DateRange, maximumDays = 366): string[] {
  const start = parseLocalDate(range.start);
  const end = parseLocalDate(range.end);
  if (!start || !end || end < start || maximumDays < 1) return [];
  const days: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end && days.length < maximumDays) {
    days.push(localDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function buildCalendarMonth(
  year: number,
  monthIndex: number,
  options: { weekStartsOn?: number; selectedDate?: string; today?: Date } = {},
): CalendarDay[] {
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) return [];
  const weekStartsOn = options.weekStartsOn ?? 1;
  if (weekStartsOn < 0 || weekStartsOn > 6) return [];
  const first = new Date(year, monthIndex, 1);
  const leading = (first.getDay() - weekStartsOn + 7) % 7;
  const start = new Date(year, monthIndex, 1 - leading);
  const todayKey = localDateKey(options.today || new Date());
  const days: CalendarDay[] = [];
  for (let index = 0; index < 42; index += 1) {
    const cursor = new Date(start);
    cursor.setDate(start.getDate() + index);
    const date = localDateKey(cursor);
    days.push({
      date,
      dayOfMonth: cursor.getDate(),
      weekday: cursor.getDay(),
      inCurrentMonth: cursor.getMonth() === monthIndex,
      isToday: date === todayKey,
      isWeekend: cursor.getDay() === 0 || cursor.getDay() === 6,
      isPast: date < todayKey,
      isSelected: date === options.selectedDate,
    });
  }
  return days;
}

export function compareDateKeys(first: string, second: string): number {
  const a = parseLocalDate(first);
  const b = parseLocalDate(second);
  if (!a || !b) return Number.NaN;
  return a.getTime() - b.getTime();
}

export function isDateWithinRange(value: string, range: DateRange): boolean {
  const candidate = parseLocalDate(value);
  const start = parseLocalDate(range.start);
  const end = parseLocalDate(range.end);
  return Boolean(candidate && start && end && candidate >= start && candidate <= end);
}

export function weekdayName(value: string, style: 'long' | 'short' = 'long'): string {
  const parsed = parseLocalDate(value);
  if (!parsed) return 'Unknown';
  return new Intl.DateTimeFormat('en-IN', { weekday: style }).format(parsed);
}

export function monthName(year: number, monthIndex: number, style: 'long' | 'short' = 'long'): string {
  if (!Number.isInteger(year) || monthIndex < 0 || monthIndex > 11) return 'Unknown';
  return new Intl.DateTimeFormat('en-IN', { month: style, year: 'numeric' }).format(new Date(year, monthIndex, 1));
}

export function daysBetween(first: string, second: string): number | null {
  const a = parseLocalDate(first);
  const b = parseLocalDate(second);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function clampDate(value: string, minimum: string, maximum: string): string | null {
  const parsed = parseLocalDate(value);
  const min = parseLocalDate(minimum);
  const max = parseLocalDate(maximum);
  if (!parsed || !min || !max || max < min) return null;
  if (parsed < min) return localDateKey(min);
  if (parsed > max) return localDateKey(max);
  return localDateKey(parsed);
}

export function getRelativeDateLabel(value: string, now = new Date()): string {
  const parsed = parseLocalDate(value);
  if (!parsed) return 'Date unavailable';
  const today = localDateKey(now);
  const difference = daysBetween(today, value);
  if (difference === 0) return 'Today';
  if (difference === 1) return 'Tomorrow';
  if (difference === -1) return 'Yesterday';
  if (difference == null) return 'Date unavailable';
  if (difference > 1 && difference <= 7) return `In ${difference} days`;
  if (difference < -1 && difference >= -7) return `${Math.abs(difference)} days ago`;
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed);
}

export function getMonthBounds(month: string): DateRange | null {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  const [year, monthNumber] = month.split('-').map(Number);
  const first = new Date(year, monthNumber - 1, 1);
  const last = new Date(year, monthNumber, 0);
  return { start: localDateKey(first), end: localDateKey(last) };
}

export function isValidTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function combineLocalDateAndTime(date: string, time: string): Date | null {
  if (!parseLocalDate(date) || !isValidTime(time)) return null;
  const result = new Date(`${date}T${time}:00`);
  return Number.isNaN(result.getTime()) ? null : result;
}

export function formatTimeRange(start: string, end: string): string {
  if (!isValidTime(start) || !isValidTime(end)) return 'Time unavailable';
  return `${start} – ${end}`;
}
