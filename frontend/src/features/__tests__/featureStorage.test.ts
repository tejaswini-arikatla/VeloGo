import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addNotice,
  appendRecord,
  clearFeatureData,
  createSnapshot,
  dismissNotice,
  getFeatureStorageUsage,
  readAudit,
  readCollection,
  readNotices,
  recordAudit,
  removeRecord,
  replaceRecord,
  restoreSnapshot,
  updateCollection,
  validateSnapshot,
  writeCollection,
} from '../featureStorage';
import { createFeatureRecord, ScheduledRideRecord, TrustedContact } from '../featureModels';

const userId = 'storage-test-user';
const createScheduled = (id: string): ScheduledRideRecord => ({
  id, pickup: 'College', destination: 'Station', vehicle: 'BIKE', scheduledAt: new Date(Date.now() + 60 * 60_000).toISOString(),
  passengerCount: 1, note: '', estimatedFare: null, status: 'SCHEDULED', reminderMinutes: 15,
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: 1,
});

beforeEach(() => {
  localStorage.clear();
});

describe('versioned feature storage', () => {
  it('returns an empty collection for a new user', () => {
    expect(readCollection(userId, 'scheduledRides')).toEqual([]);
  });

  it('writes and reads a collection', () => {
    const record = createScheduled('ride-a');
    writeCollection(userId, 'scheduledRides', [record]);
    expect(readCollection(userId, 'scheduledRides')).toEqual([record]);
  });

  it('rejects writes without a user id', () => {
    expect(() => writeCollection('', 'scheduledRides', [])).toThrow('signed-in user');
  });

  it('appends a record to the beginning of a collection', () => {
    appendRecord(userId, 'scheduledRides', createScheduled('first'));
    appendRecord(userId, 'scheduledRides', createScheduled('second'));
    expect(readCollection(userId, 'scheduledRides').map((item) => item.id)).toEqual(['second', 'first']);
  });

  it('updates a collection through an updater callback', () => {
    appendRecord(userId, 'scheduledRides', createScheduled('first'));
    updateCollection(userId, 'scheduledRides', (items) => items.map((item) => ({ ...item, note: 'Updated' })));
    expect(readCollection(userId, 'scheduledRides')[0].note).toBe('Updated');
  });

  it('removes a record by id and reports whether it existed', () => {
    appendRecord(userId, 'scheduledRides', createScheduled('first'));
    expect(removeRecord(userId, 'scheduledRides', 'first')).toBe(true);
    expect(removeRecord(userId, 'scheduledRides', 'missing')).toBe(false);
  });

  it('replaces a record and increments its version', () => {
    appendRecord(userId, 'scheduledRides', createScheduled('first'));
    expect(replaceRecord(userId, 'scheduledRides', 'first', { note: 'Changed' })).toBe(true);
    const result = readCollection(userId, 'scheduledRides')[0];
    expect(result.note).toBe('Changed');
    expect(result.version).toBe(2);
  });

  it('records a bounded audit trail', () => {
    for (let index = 0; index < 160; index += 1) recordAudit(userId, 'scheduled', 'TEST', `Entry ${index}`);
    expect(readAudit(userId)).toHaveLength(150);
    expect(readAudit(userId)[0].summary).toBe('Entry 159');
  });

  it('stores and dismisses in-app notices', () => {
    const notice = addNotice(userId, 'success', 'Saved', 'Your route was saved.');
    expect(readNotices(userId)[0].dismissed).toBe(false);
    dismissNotice(userId, notice.id);
    expect(readNotices(userId)[0].dismissed).toBe(true);
  });

  it('creates a snapshot containing each feature collection', () => {
    const snapshot = createSnapshot(userId);
    expect(validateSnapshot(snapshot)).toBe(true);
    expect(snapshot.schemaVersion).toBe(1);
    expect(snapshot.userId).toBe(userId);
  });

  it('rejects unsupported snapshot schema versions', () => {
    const snapshot = createSnapshot(userId);
    expect(validateSnapshot({ ...snapshot, schemaVersion: 999 })).toBe(false);
  });

  it('restores data only for the matching user', () => {
    const contact = createFeatureRecord({ name: 'Asha', phone: '+919876543210', relationship: 'FAMILY' as const, isPrimary: false, shareTripByDefault: true, notes: '' }) as TrustedContact;
    const snapshot = { ...createSnapshot(userId), contacts: [contact] };
    restoreSnapshot(userId, snapshot);
    expect(readCollection(userId, 'contacts')).toHaveLength(1);
    expect(() => restoreSnapshot('another-user', snapshot)).toThrow('different account');
  });

  it('reports storage usage for the current user', () => {
    writeCollection(userId, 'scheduledRides', [createScheduled('first')]);
    const usage = getFeatureStorageUsage(userId);
    expect(usage.keys).toBeGreaterThan(0);
    expect(usage.bytes).toBeGreaterThan(0);
  });

  it('clears feature data without touching unrelated keys', () => {
    localStorage.setItem('velogo_token', 'keep-me');
    writeCollection(userId, 'scheduledRides', [createScheduled('first')]);
    clearFeatureData(userId);
    expect(readCollection(userId, 'scheduledRides')).toEqual([]);
    expect(localStorage.getItem('velogo_token')).toBe('keep-me');
  });

  it('dispatches a store change event after writes', () => {
    const handler = vi.fn();
    window.addEventListener('velogo-feature-store-change', handler);
    writeCollection(userId, 'scheduledRides', [createScheduled('first')]);
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener('velogo-feature-store-change', handler);
  });
});
