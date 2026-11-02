/**
 * Privacy helpers for locally stored customer-created travel data.
 * These helpers support data minimisation; they do not replace server security controls.
 */
export interface PrivacyReview {
  field: string;
  severity: 'INFO' | 'WARNING' | 'HIGH';
  message: string;
}

const PHONE_PATTERN = /(\+?\d[\d\s()-]{7,}\d)/g;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const LONG_NUMBER_PATTERN = /\b\d{10,16}\b/g;

export function maskPhoneNumber(value: string): string {
  const compact = (value || '').replace(/\s/g, '');
  if (compact.length < 5) return compact ? '••••' : '';
  return `${compact.slice(0, 2)}${'•'.repeat(Math.max(4, compact.length - 4))}${compact.slice(-2)}`;
}

export function maskEmailAddress(value: string): string {
  const [local, domain] = (value || '').split('@');
  if (!local || !domain) return value;
  const visible = local.length <= 2 ? local[0] : `${local[0]}${'•'.repeat(Math.max(1, local.length - 2))}${local.slice(-1)}`;
  return `${visible}@${domain}`;
}

export function redactContactDetails(value: string): string {
  return (value || '')
    .replace(EMAIL_PATTERN, (email) => maskEmailAddress(email))
    .replace(PHONE_PATTERN, (phone) => maskPhoneNumber(phone))
    .replace(LONG_NUMBER_PATTERN, (number) => maskPhoneNumber(number));
}

export function reviewFreeText(value: string, field = 'text'): PrivacyReview[] {
  const reviews: PrivacyReview[] = [];
  if (EMAIL_PATTERN.test(value)) {
    reviews.push({ field, severity: 'WARNING', message: 'This text appears to contain an email address.' });
  }
  EMAIL_PATTERN.lastIndex = 0;
  if (PHONE_PATTERN.test(value)) {
    reviews.push({ field, severity: 'WARNING', message: 'This text appears to contain a phone number.' });
  }
  PHONE_PATTERN.lastIndex = 0;
  if (/\b(password|otp|one.time.password|pin code|cvv)\b/i.test(value)) {
    reviews.push({ field, severity: 'HIGH', message: 'Avoid saving passwords, one-time codes, PINs or card security codes.' });
  }
  if (/\b(diagnosis|medical history|prescription|disability certificate)\b/i.test(value)) {
    reviews.push({ field, severity: 'HIGH', message: 'Avoid storing sensitive medical information in a general travel note.' });
  }
  return reviews;
}

export function reviewRecordForPrivacy(record: Record<string, unknown>): PrivacyReview[] {
  const reviews: PrivacyReview[] = [];
  Object.entries(record).forEach(([field, value]) => {
    if (typeof value !== 'string' || !value.trim()) return;
    reviews.push(...reviewFreeText(value, field));
  });
  return reviews;
}

export function minimiseRecord<T extends Record<string, unknown>>(
  record: T,
  fieldsToRemove: string[],
): Partial<T> {
  const result = { ...record };
  fieldsToRemove.forEach((field) => {
    delete result[field];
  });
  return result;
}

export function removeEmptyFields<T extends Record<string, unknown>>(record: T): Partial<T> {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => {
    if (value == null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  })) as Partial<T>;
}

export function getDataRetentionReview(
  createdAt: string,
  now = new Date(),
  retentionDays = 365,
): { ageDays: number; shouldReview: boolean; message: string } {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) {
    return { ageDays: 0, shouldReview: true, message: 'Creation date is unavailable; review this record.' };
  }
  const ageDays = Math.max(0, Math.floor((now.getTime() - created.getTime()) / 86_400_000));
  const shouldReview = ageDays >= retentionDays;
  return {
    ageDays,
    shouldReview,
    message: shouldReview
      ? `This record is ${ageDays} days old. Consider deleting it if it is no longer needed.`
      : `Review suggested after ${retentionDays} days.`,
  };
}

export function createPrivacyExportNotice(): string[] {
  return [
    'Export files may contain personal addresses, phone numbers, trip notes and expense details.',
    'Store downloaded backups in a private location.',
    'Do not upload personal travel records to a public repository.',
    'Remove local records when they are no longer needed.',
    'A browser-local record is not encrypted by this feature module.',
  ];
}

export function canShareRecord(
  record: { containsContactDetails?: boolean; containsPreciseLocation?: boolean },
  explicitConsent: boolean,
): { allowed: boolean; reason?: string } {
  if (!explicitConsent) return { allowed: false, reason: 'Ask the record owner for permission before sharing.' };
  if (record.containsContactDetails || record.containsPreciseLocation) {
    return { allowed: true, reason: 'Share only the minimum information required and use a trusted channel.' };
  }
  return { allowed: true };
}

export function normaliseConsent(value: unknown): boolean {
  return value === true;
}

export function formatPrivacyReview(reviews: PrivacyReview[]): string[] {
  return reviews.map((review) => `${review.severity}: ${review.field} — ${review.message}`);
}
