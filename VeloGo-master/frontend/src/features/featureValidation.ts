/** Shared validation and formatting rules for the optional customer feature suite. */
import {
  ContactRelationship,
  LostItemReport,
  PoolRequest,
  RouteStop,
  ScheduledRideRecord,
  TrustedContact,
  VehicleChoice,
} from './featureModels';

export interface ValidationIssue {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

const issue = (field: string, message: string): ValidationIssue => ({ field, message });
const clean = (value: string) => value.trim().replace(/\s+/g, ' ');

export function validateRequiredText(value: string, label: string, maxLength = 160): ValidationIssue[] {
  const normalized = clean(value || '');
  if (!normalized) return [issue(label, `${label} is required.`)];
  if (normalized.length > maxLength) return [issue(label, `${label} must be ${maxLength} characters or fewer.`)];
  return [];
}

export function validatePhone(phone: string): ValidationIssue[] {
  const normalized = (phone || '').replace(/[\s()-]/g, '');
  if (!/^\+?[0-9]{8,15}$/.test(normalized)) {
    return [issue('phone', 'Enter a valid phone number with 8 to 15 digits.')];
  }
  return [];
}

export function validateFutureDateTime(value: string, minimumLeadMinutes = 15): ValidationIssue[] {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) return [issue('scheduledAt', 'Choose a valid date and time.')];
  const earliest = Date.now() + minimumLeadMinutes * 60_000;
  if (parsed.getTime() < earliest) return [issue('scheduledAt', `Choose a time at least ${minimumLeadMinutes} minutes from now.`)];
  const maximum = Date.now() + 90 * 24 * 60 * 60_000;
  if (parsed.getTime() > maximum) return [issue('scheduledAt', 'Scheduled rides can be planned up to 90 days ahead.')];
  return [];
}

export function validateScheduledRide(input: Partial<ScheduledRideRecord>): ValidationResult {
  const issues = [
    ...validateRequiredText(input.pickup || '', 'Pickup', 240),
    ...validateRequiredText(input.destination || '', 'Destination', 240),
    ...validateFutureDateTime(input.scheduledAt || ''),
  ];
  if (!input.vehicle) issues.push(issue('vehicle', 'Choose a vehicle category.'));
  if (!Number.isInteger(input.passengerCount) || (input.passengerCount || 0) < 1 || (input.passengerCount || 0) > 6) {
    issues.push(issue('passengerCount', 'Passenger count must be between 1 and 6.'));
  }
  if (!Number.isInteger(input.reminderMinutes) || (input.reminderMinutes || 0) < 0 || (input.reminderMinutes || 0) > 1440) {
    issues.push(issue('reminderMinutes', 'Reminder must be between 0 and 1,440 minutes.'));
  }
  if (input.estimatedFare != null && (!Number.isFinite(input.estimatedFare) || input.estimatedFare < 0)) {
    issues.push(issue('estimatedFare', 'Estimated fare cannot be negative.'));
  }
  return { valid: issues.length === 0, issues };
}

export function validateRouteStops(stops: RouteStop[]): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (stops.length < 2) issues.push(issue('stops', 'A route needs at least a pickup and a drop-off.'));
  if (stops.length > 12) issues.push(issue('stops', 'A route can contain at most 12 stops.'));
  const pickupCount = stops.filter((stop) => stop.kind === 'PICKUP').length;
  const dropoffCount = stops.filter((stop) => stop.kind === 'DROPOFF').length;
  if (pickupCount !== 1) issues.push(issue('stops', 'A route must contain exactly one pickup.'));
  if (dropoffCount !== 1) issues.push(issue('stops', 'A route must contain exactly one drop-off.'));
  if (stops.length && stops[0].kind !== 'PICKUP') issues.push(issue('stops', 'The pickup must be the first stop.'));
  if (stops.length && stops[stops.length - 1].kind !== 'DROPOFF') issues.push(issue('stops', 'The drop-off must be the last stop.'));
  stops.forEach((stop, index) => {
    if (!clean(stop.address)) issues.push(issue(`stops.${index}.address`, `Enter an address for stop ${index + 1}.`));
    if (!Number.isInteger(stop.dwellMinutes) || stop.dwellMinutes < 0 || stop.dwellMinutes > 240) {
      issues.push(issue(`stops.${index}.dwellMinutes`, 'Stop time must be between 0 and 240 minutes.'));
    }
  });
  return { valid: issues.length === 0, issues };
}

export function validatePoolRequest(input: Partial<PoolRequest>): ValidationResult {
  const issues = [
    ...validateRequiredText(input.origin || '', 'Origin', 240),
    ...validateRequiredText(input.destination || '', 'Destination', 240),
  ];
  const departure = new Date(input.departureAt || '');
  if (!input.departureAt || Number.isNaN(departure.getTime())) issues.push(issue('departureAt', 'Choose a departure date and time.'));
  else if (departure.getTime() < Date.now() + 10 * 60_000) issues.push(issue('departureAt', 'Departure must be at least 10 minutes in the future.'));
  if (!Number.isInteger(input.seatsRequested) || (input.seatsRequested || 0) < 1 || (input.seatsRequested || 0) > 5) {
    issues.push(issue('seatsRequested', 'Choose between 1 and 5 seats.'));
  }
  if (!input.vehicle) issues.push(issue('vehicle', 'Choose a vehicle category.'));
  if (input.contributionLimit != null && (!Number.isFinite(input.contributionLimit) || input.contributionLimit < 0)) {
    issues.push(issue('contributionLimit', 'Contribution limit cannot be negative.'));
  }
  return { valid: issues.length === 0, issues };
}

export function validateTrustedContact(input: Partial<TrustedContact>, existing: TrustedContact[] = []): ValidationResult {
  const issues = [
    ...validateRequiredText(input.name || '', 'Name', 80),
    ...validatePhone(input.phone || ''),
  ];
  if (!input.relationship) issues.push(issue('relationship', 'Choose a relationship.'));
  const normalizeDigits = (val: string) => {
    const digits = val.replace(/\D/g, '');
    return digits.length > 10 ? digits.slice(-10) : digits;
  };
  const normalized = normalizeDigits(input.phone || '');
  const duplicate = existing.some((contact) => contact.id !== input.id && normalizeDigits(contact.phone) === normalized);
  if (duplicate) issues.push(issue('phone', 'This phone number is already in your trusted contacts.'));
  return { valid: issues.length === 0, issues };
}

export function validateLostItem(input: Partial<LostItemReport>): ValidationResult {
  const issues = [
    ...validateRequiredText(input.itemName || '', 'Item name', 100),
    ...validateRequiredText(input.description || '', 'Description', 1000),
    ...validateRequiredText(input.pickupArea || '', 'Location', 240),
    ...validatePhone(input.contactPhone || ''),
  ];
  if (!input.category) issues.push(issue('category', 'Choose an item category.'));
  if (!input.lostAt || Number.isNaN(new Date(input.lostAt).getTime())) issues.push(issue('lostAt', 'Choose when the item was lost.'));
  if (input.approximateValue != null && (!Number.isFinite(input.approximateValue) || input.approximateValue < 0)) {
    issues.push(issue('approximateValue', 'Approximate value cannot be negative.'));
  }
  return { valid: issues.length === 0, issues };
}

export function isVehicleChoice(value: string): value is VehicleChoice {
  return ['BIKE', 'AUTO', 'CAB', 'WOMEN_BIKE'].includes(value);
}

export function isRelationship(value: string): value is ContactRelationship {
  return ['FAMILY', 'FRIEND', 'COLLEAGUE', 'OTHER'].includes(value);
}

export function firstIssue(result: ValidationResult): string | undefined {
  return result.issues[0]?.message;
}

export function normalizePhone(value: string): string {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');
  return trimmed.startsWith('+') ? `+${digits}` : digits;
}

export function formatCurrency(value: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value || 0);
}

export function formatDateTime(value: string, includeTime = true): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return new Intl.DateTimeFormat('en-IN', includeTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(date);
}

export function formatRelativeTime(value: string, now = Date.now()): string {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return 'Unknown time';
  const difference = timestamp - now;
  const minutes = Math.round(Math.abs(difference) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return difference > 0 ? `In ${minutes} min` : `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return difference > 0 ? `In ${hours} hr` : `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return difference > 0 ? `In ${days} days` : `${days} days ago`;
}

export function getLocalDateTimeInputValue(date = new Date()): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function getVehicleLabel(vehicle: VehicleChoice): string {
  const labels: Record<VehicleChoice, string> = {
    BIKE: 'Bike taxi', AUTO: 'Auto rickshaw', CAB: 'Cab', WOMEN_BIKE: 'Women-only bike',
  };
  return labels[vehicle];
}

export function getRelationshipLabel(value: ContactRelationship): string {
  const labels: Record<ContactRelationship, string> = {
    FAMILY: 'Family', FRIEND: 'Friend', COLLEAGUE: 'Colleague', OTHER: 'Other',
  };
  return labels[value];
}

export function calculateStopDwellTime(stops: RouteStop[]): number {
  return stops.reduce((total, stop) => total + Math.max(0, stop.dwellMinutes || 0), 0);
}

export function makeReferenceCode(prefix = 'VG'): string {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${datePart}-${randomPart}`;
}

export function sanitizePlainText(value: string, maximum = 1000): string {
  return (value || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, maximum);
}
