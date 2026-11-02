/**
 * Validation rules for the expansion modules.
 *
 * These functions are intentionally pure. UI forms use them for immediate
 * feedback, while a production API must repeat the same checks on the server.
 */
export interface FieldIssue {
  field: string;
  code: string;
  message: string;
}

export interface ValidationSummary {
  valid: boolean;
  issues: FieldIssue[];
}

const issue = (field: string, code: string, message: string): FieldIssue => ({ field, code, message });

export function normalizeHumanText(value: unknown): string {
  return typeof value === 'string'
    ? value.normalize('NFKC').replace(/\s+/g, ' ').trim()
    : '';
}

export function validateText(
  value: unknown,
  field: string,
  options: { required?: boolean; min?: number; max?: number } = {},
): FieldIssue[] {
  const normalized = normalizeHumanText(value);
  const min = options.min ?? 0;
  const max = options.max ?? 240;
  if (options.required && !normalized) return [issue(field, 'REQUIRED', `${field} is required.`)];
  if (normalized.length < min) return [issue(field, 'TOO_SHORT', `${field} must contain at least ${min} characters.`)];
  if (normalized.length > max) return [issue(field, 'TOO_LONG', `${field} must contain no more than ${max} characters.`)];
  return [];
}

export function validatePositiveNumber(
  value: unknown,
  field: string,
  options: { allowZero?: boolean; maximum?: number } = {},
): FieldIssue[] {
  const numeric = typeof value === 'number' ? value : Number(value);
  const minimum = options.allowZero ? 0 : Number.EPSILON;
  if (!Number.isFinite(numeric) || numeric < minimum) {
    return [issue(field, 'INVALID_NUMBER', `${field} must be ${options.allowZero ? 'zero or greater' : 'greater than zero'}.`)];
  }
  if (options.maximum != null && numeric > options.maximum) {
    return [issue(field, 'OUT_OF_RANGE', `${field} must not exceed ${options.maximum}.`)];
  }
  return [];
}

export function validateInteger(
  value: unknown,
  field: string,
  minimum: number,
  maximum: number,
): FieldIssue[] {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < minimum || numeric > maximum) {
    return [issue(field, 'INVALID_INTEGER', `${field} must be a whole number between ${minimum} and ${maximum}.`)];
  }
  return [];
}

export function validatePhoneNumber(value: string): FieldIssue[] {
  const compact = (value || '').replace(/[\s()-]/g, '');
  if (!/^\+?[1-9]\d{7,14}$/.test(compact)) {
    return [issue('phone', 'INVALID_PHONE', 'Enter a phone number with 8 to 15 digits.')];
  }
  return [];
}

export function validateEmailAddress(value: string): FieldIssue[] {
  const normalized = normalizeHumanText(value).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized)) {
    return [issue('email', 'INVALID_EMAIL', 'Enter a valid email address.')];
  }
  return [];
}

export function validateDateString(value: string, field: string): FieldIssue[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return [issue(field, 'INVALID_DATE', `${field} must use YYYY-MM-DD format.`)];
  }
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return [issue(field, 'INVALID_DATE', `${field} is not a real calendar date.`)];
  }
  return [];
}

export function validateDateRange(start: string, end: string): FieldIssue[] {
  const issues = [
    ...validateDateString(start, 'Start date'),
    ...validateDateString(end, 'End date'),
  ];
  if (!issues.length && end < start) {
    issues.push(issue('endDate', 'INVALID_RANGE', 'End date must be on or after the start date.'));
  }
  return issues;
}

export function validateFutureDateTime(
  value: string,
  options: { minimumLeadMinutes?: number; maximumDays?: number; now?: Date } = {},
): FieldIssue[] {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) {
    return [issue('dateTime', 'INVALID_DATETIME', 'Choose a valid date and time.')];
  }
  const now = options.now || new Date();
  const minimum = now.getTime() + (options.minimumLeadMinutes ?? 0) * 60_000;
  const maximum = now.getTime() + (options.maximumDays ?? 365) * 86_400_000;
  if (parsed.getTime() < minimum) {
    return [issue('dateTime', 'TOO_SOON', 'Choose a time in the future.')];
  }
  if (parsed.getTime() > maximum) {
    return [issue('dateTime', 'TOO_FAR', 'Choose a date within the allowed planning window.')];
  }
  return [];
}

export function validateFareSplit(
  title: string,
  total: number,
  participantNames: string[],
  shares?: number[],
): ValidationSummary {
  const issues = [
    ...validateText(title, 'Split name', { required: true, max: 80 }),
    ...validatePositiveNumber(total, 'Total fare'),
  ];
  if (participantNames.length < 2) issues.push(issue('participants', 'TOO_FEW', 'Add at least two participants.'));
  if (participantNames.length > 12) issues.push(issue('participants', 'TOO_MANY', 'A split can contain up to 12 participants.'));
  const normalized = participantNames.map((name) => normalizeHumanText(name).toLowerCase());
  if (normalized.some((name) => !name)) issues.push(issue('participants', 'EMPTY_NAME', 'Every participant needs a name.'));
  if (new Set(normalized).size !== normalized.length) issues.push(issue('participants', 'DUPLICATE_NAME', 'Participant names must be unique.'));
  if (shares) {
    if (shares.some((share) => !Number.isFinite(share) || share < 0)) {
      issues.push(issue('shares', 'INVALID_SHARE', 'Shares must be non-negative numbers.'));
    }
    const sum = shares.reduce((value, share) => value + share, 0);
    if (Math.abs(sum - total) > 0.01) issues.push(issue('shares', 'SHARE_TOTAL_MISMATCH', 'Participant shares must add up to the total.'));
  }
  return { valid: issues.length === 0, issues };
}

export function validateEcoJourney(
  name: string,
  date: string,
  distanceKm: number,
  passengers: number,
): ValidationSummary {
  const issues = [
    ...validateText(name, 'Journey name', { required: true, max: 70 }),
    ...validateDateString(date, 'Journey date'),
    ...validatePositiveNumber(distanceKm, 'Distance', { maximum: 2000 }),
    ...validateInteger(passengers, 'Passengers', 1, 8),
  ];
  return { valid: issues.length === 0, issues };
}

export function validateTravelBudget(
  name: string,
  month: string,
  amount: number,
  warningPercent: number,
): ValidationSummary {
  const issues = [
    ...validateText(name, 'Budget name', { required: true, max: 80 }),
    ...validatePositiveNumber(amount, 'Budget amount', { maximum: 10_000_000 }),
    ...validateInteger(warningPercent, 'Warning percentage', 1, 100),
  ];
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    issues.push(issue('month', 'INVALID_MONTH', 'Choose a valid month.'));
  }
  return { valid: issues.length === 0, issues };
}

export function validateChecklistItems(items: Array<{ title: string; required: boolean }>): ValidationSummary {
  const issues: FieldIssue[] = [];
  if (!items.length) issues.push(issue('items', 'EMPTY_CHECKLIST', 'Add at least one checklist item.'));
  if (items.length > 40) issues.push(issue('items', 'TOO_MANY_ITEMS', 'A checklist can contain at most 40 items.'));
  items.forEach((item, index) => {
    issues.push(...validateText(item.title, `Item ${index + 1}`, { required: true, max: 100 }));
  });
  return { valid: issues.length === 0, issues };
}

export function validateVehicleEstimate(option: {
  name: string;
  fare: number;
  minutes: number;
  capacity: number;
  comfort: number;
  emissions: number;
}): ValidationSummary {
  const issues = [
    ...validateText(option.name, 'Vehicle name', { required: true, max: 40 }),
    ...validatePositiveNumber(option.fare, 'Estimated fare', { allowZero: true, maximum: 100_000 }),
    ...validateInteger(option.minutes, 'Estimated duration', 1, 1440),
    ...validateInteger(option.capacity, 'Capacity', 1, 20),
    ...validateInteger(option.comfort, 'Comfort rating', 1, 5),
    ...validatePositiveNumber(option.emissions, 'Emissions estimate', { allowZero: true, maximum: 100_000 }),
  ];
  return { valid: issues.length === 0, issues };
}

export function firstValidationMessage(result: ValidationSummary): string | null {
  return result.issues[0]?.message || null;
}

export function combineValidation(...results: ValidationSummary[]): ValidationSummary {
  const issues = results.flatMap((result) => result.issues);
  return { valid: issues.length === 0, issues };
}

export function validateUniqueName(value: string, existing: string[], field = 'Name'): FieldIssue[] {
  const candidate = normalizeHumanText(value).toLocaleLowerCase();
  if (!candidate) return [issue(field, 'REQUIRED', `${field} is required.`)];
  const duplicate = existing.some((item) => normalizeHumanText(item).toLocaleLowerCase() === candidate);
  return duplicate ? [issue(field, 'DUPLICATE', `${field} already exists.`)] : [];
}

export function validateCoordinate(latitude: number, longitude: number): ValidationSummary {
  const issues: FieldIssue[] = [];
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    issues.push(issue('latitude', 'INVALID_LATITUDE', 'Latitude must be between -90 and 90.'));
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    issues.push(issue('longitude', 'INVALID_LONGITUDE', 'Longitude must be between -180 and 180.'));
  }
  return { valid: issues.length === 0, issues };
}

export function validateSearchQuery(value: string, maximumLength = 100): FieldIssue[] {
  if (value.length > maximumLength) {
    return [issue('search', 'QUERY_TOO_LONG', `Search must be ${maximumLength} characters or fewer.`)];
  }
  return [];
}

export function sanitizeCsvText(value: unknown): string {
  const text = value == null ? '' : String(value);
  // Prefix formula-leading text to reduce spreadsheet formula injection risk.
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

export function safeFilename(value: string, fallback = 'velogo-export'): string {
  const normalized = normalizeHumanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return normalized || fallback;
}
