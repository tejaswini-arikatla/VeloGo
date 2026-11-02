import { describe, expect, it } from 'vitest';
import {
  firstIssue,
  formatCurrency,
  formatDateTime,
  getLocalDateTimeInputValue,
  normalizePhone,
  sanitizePlainText,
  validateFutureDateTime,
  validateLostItem,
  validatePhone,
  validatePoolRequest,
  validateRequiredText,
  validateRouteStops,
  validateScheduledRide,
  validateTrustedContact,
} from '../featureValidation';
import { createFeatureRecord, RouteStop, TrustedContact } from '../featureModels';

const future = (minutes = 90) => new Date(Date.now() + minutes * 60_000).toISOString();
const validScheduled = () => ({
  pickup: 'VVIT, Guntur',
  destination: 'Railway Station',
  vehicle: 'AUTO' as const,
  scheduledAt: future(),
  passengerCount: 2,
  reminderMinutes: 30,
  estimatedFare: 120,
});

const routeStops = (): RouteStop[] => [
  { id: 'a', label: 'Pickup', address: 'College', kind: 'PICKUP', dwellMinutes: 0, completed: false },
  { id: 'b', label: 'Stop 1', address: 'Library', kind: 'WAYPOINT', dwellMinutes: 10, completed: false },
  { id: 'c', label: 'Drop-off', address: 'Station', kind: 'DROPOFF', dwellMinutes: 0, completed: false },
];

describe('feature form validation', () => {
  it('accepts a valid future scheduled ride', () => {
    expect(validateScheduledRide(validScheduled()).valid).toBe(true);
  });

  it('rejects an empty pickup', () => {
    const result = validateScheduledRide({ ...validScheduled(), pickup: '  ' });
    expect(result.valid).toBe(false);
    expect(firstIssue(result)).toContain('Pickup');
  });

  it('rejects a past scheduled time', () => {
    expect(validateFutureDateTime(new Date(Date.now() - 60_000).toISOString()).length).toBeGreaterThan(0);
  });

  it('rejects a scheduled time beyond the planning horizon', () => {
    const farFuture = new Date(Date.now() + 100 * 86_400_000).toISOString();
    expect(validateFutureDateTime(farFuture)[0].message).toContain('90 days');
  });

  it('checks passenger count boundaries', () => {
    expect(validateScheduledRide({ ...validScheduled(), passengerCount: 0 }).valid).toBe(false);
    expect(validateScheduledRide({ ...validScheduled(), passengerCount: 7 }).valid).toBe(false);
    expect(validateScheduledRide({ ...validScheduled(), passengerCount: 6 }).valid).toBe(true);
  });

  it('rejects invalid route endpoint order', () => {
    const stops = routeStops();
    stops[0] = { ...stops[0], kind: 'WAYPOINT' };
    expect(validateRouteStops(stops).valid).toBe(false);
  });

  it('requires at least a pickup and drop-off', () => {
    expect(validateRouteStops([routeStops()[0]]).valid).toBe(false);
  });

  it('accepts a valid route with one waypoint', () => {
    expect(validateRouteStops(routeStops()).valid).toBe(true);
  });

  it('rejects empty addresses in route stops', () => {
    const stops = routeStops();
    stops[1] = { ...stops[1], address: '' };
    expect(validateRouteStops(stops).issues.some((item) => item.field.includes('address'))).toBe(true);
  });

  it('validates pool request date, route and seat count', () => {
    const request = {
      origin: 'Guntur', destination: 'Vijayawada', departureAt: future(),
      seatsRequested: 2, vehicle: 'AUTO' as const, contributionLimit: 100,
    };
    expect(validatePoolRequest(request).valid).toBe(true);
    expect(validatePoolRequest({ ...request, seatsRequested: 0 }).valid).toBe(false);
  });

  it('rejects invalid phone numbers', () => {
    expect(validatePhone('123').length).toBeGreaterThan(0);
    expect(validatePhone('+919876543210')).toHaveLength(0);
  });

  it('normalizes phone number punctuation', () => {
    expect(normalizePhone('+91 98765-43210')).toBe('+919876543210');
  });

  it('prevents duplicate trusted contact numbers', () => {
    const existing = [createFeatureRecord({ name: 'Asha', phone: '+919876543210', relationship: 'FAMILY' as const, isPrimary: true, shareTripByDefault: false, notes: '' }) as TrustedContact];
    const result = validateTrustedContact({ name: 'Asha 2', phone: '9876543210', relationship: 'FRIEND' }, existing);
    expect(result.valid).toBe(false);
  });

  it('validates lost item report fields', () => {
    const valid = {
      itemName: 'Backpack', category: 'BAG' as const, description: 'Black backpack with a blue tag.',
      lostAt: new Date().toISOString(), pickupArea: 'Guntur', contactPhone: '+919876543210',
      approximateValue: 1200,
    };
    expect(validateLostItem(valid).valid).toBe(true);
    expect(validateLostItem({ ...valid, contactPhone: 'bad' }).valid).toBe(false);
  });

  it('limits required text length', () => {
    expect(validateRequiredText('a'.repeat(20), 'Name', 10)[0].message).toContain('10 characters');
  });

  it('removes unsafe angle brackets and trims text', () => {
    expect(sanitizePlainText('  <hello>   world  ')).toBe('hello world');
  });

  it('formats currency using Indian numbering conventions', () => {
    expect(formatCurrency(12500)).toContain('12,500');
  });

  it('formats valid dates and handles invalid values', () => {
    expect(formatDateTime(new Date().toISOString())).not.toBe('Not available');
    expect(formatDateTime('not-a-date')).toBe('Not available');
  });

  it('creates a valid local datetime input string', () => {
    const value = getLocalDateTimeInputValue(new Date('2026-01-01T10:00:00Z'));
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
});
