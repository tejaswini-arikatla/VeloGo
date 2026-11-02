import { describe, expect, it } from 'vitest';
import {
  combineValidation,
  firstValidationMessage,
  normalizeHumanText,
  safeFilename,
  sanitizeCsvText,
  validateCoordinate,
  validateDateRange,
  validateDateString,
  validateEmailAddress,
  validateFareSplit,
  validateFutureDateTime,
  validateInteger,
  validatePhoneNumber,
  validatePositiveNumber,
  validateText,
  validateTravelBudget,
  validateVehicleEstimate,
} from '../extendedFeatureValidation';

describe('text and number validation', () => {
  it('normalizes repeated whitespace', () => {
    expect(normalizeHumanText('  Home   to   Office ')).toBe('Home to Office');
  });

  it('requires non-empty text when configured', () => {
    expect(validateText('', 'Title', { required: true })).toHaveLength(1);
  });

  it('rejects text above its maximum length', () => {
    expect(validateText('x'.repeat(20), 'Title', { max: 10 })[0].code).toBe('TOO_LONG');
  });

  it('accepts zero only when explicitly allowed', () => {
    expect(validatePositiveNumber(0, 'Fare')).toHaveLength(1);
    expect(validatePositiveNumber(0, 'Fare', { allowZero: true })).toHaveLength(0);
  });

  it('rejects numbers beyond their maximum', () => {
    expect(validatePositiveNumber(101, 'Fare', { maximum: 100 })[0].code).toBe('OUT_OF_RANGE');
  });

  it('validates whole number ranges', () => {
    expect(validateInteger(3, 'Seats', 1, 6)).toHaveLength(0);
    expect(validateInteger(3.5, 'Seats', 1, 6)).toHaveLength(1);
  });

  it('validates phone numbers', () => {
    expect(validatePhoneNumber('+919876543210')).toHaveLength(0);
    expect(validatePhoneNumber('abc')).toHaveLength(1);
  });

  it('validates email addresses', () => {
    expect(validateEmailAddress('person@example.com')).toHaveLength(0);
    expect(validateEmailAddress('not-an-email')).toHaveLength(1);
  });
});

describe('domain validation', () => {
  it('rejects invalid dates', () => {
    expect(validateDateString('2026-02-31', 'Date')).toHaveLength(1);
  });

  it('validates ordered date ranges', () => {
    expect(validateDateRange('2026-11-01', '2026-11-02')).toHaveLength(0);
    expect(validateDateRange('2026-11-03', '2026-11-02')).toHaveLength(1);
  });

  it('validates a future date time against a supplied clock', () => {
    const now = new Date('2026-11-02T08:00:00');
    expect(validateFutureDateTime('2026-11-02T09:00:00', { now })).toHaveLength(0);
    expect(validateFutureDateTime('2026-11-02T07:00:00', { now })).toHaveLength(1);
  });

  it('validates fare split participant names and shares', () => {
    expect(validateFareSplit('Cab fare', 100, ['Asha', 'Ravi'], [50, 50]).valid).toBe(true);
    expect(validateFareSplit('Cab fare', 100, ['Asha', 'Asha']).valid).toBe(false);
  });

  it('validates travel budget details', () => {
    expect(validateTravelBudget('Commute', '2026-11', 2000, 80).valid).toBe(true);
    expect(validateTravelBudget('Commute', '2026-13', 2000, 80).valid).toBe(false);
  });

  it('validates vehicle estimate fields', () => {
    expect(validateVehicleEstimate({ name: 'Bike', fare: 50, minutes: 20, capacity: 1, comfort: 3, emissions: 42 }).valid).toBe(true);
  });

  it('combines multiple validation results', () => {
    const combined = combineValidation(
      { valid: false, issues: [{ field: 'a', code: 'A', message: 'First issue' }] },
      { valid: false, issues: [{ field: 'b', code: 'B', message: 'Second issue' }] },
    );
    expect(combined.issues).toHaveLength(2);
    expect(firstValidationMessage(combined)).toBe('First issue');
  });

  it('protects CSV exports from formula-leading text', () => {
    expect(sanitizeCsvText('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
  });

  it('creates safe export filenames', () => {
    expect(safeFilename('My Travel Report!')).toBe('my-travel-report');
  });

  it('validates geographic coordinate ranges', () => {
    expect(validateCoordinate(16.3, 80.4).valid).toBe(true);
    expect(validateCoordinate(120, 80).valid).toBe(false);
  });
});
