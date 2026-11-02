import { beforeEach, describe, expect, it } from 'vitest';
import {
  appendExtendedRecord,
  createExtendedBackup,
  createStoredRecord,
  getExtendedStorageSummary,
  readExtendedAudit,
  readExtendedCollection,
  recordExtendedAudit,
  removeExtendedRecord,
  restoreExtendedBackup,
  validateExtendedBackup,
  writeExtendedCollection,
} from '../extendedFeatureStore';

interface TestRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  title: string;
}

const userId = 'expansion-store-test';

function record(title: string): TestRecord {
  return createStoredRecord({ title }) as TestRecord;
}

beforeEach(() => {
  localStorage.clear();
});

describe('independent expansion storage', () => {
  it('starts with an empty collection for a new user', () => {
    expect(readExtendedCollection<TestRecord>(userId, 'fare-splits')).toEqual([]);
  });

  it('appends records to the front of the collection', () => {
    appendExtendedRecord(userId, 'fare-splits', record('First'));
    appendExtendedRecord(userId, 'fare-splits', record('Second'));
    expect(readExtendedCollection<TestRecord>(userId, 'fare-splits').map((item) => item.title)).toEqual(['Second', 'First']);
  });

  it('does not mix records between accounts', () => {
    appendExtendedRecord(userId, 'fare-splits', record('Private record'));
    expect(readExtendedCollection<TestRecord>('another-user', 'fare-splits')).toEqual([]);
  });

  it('updates a collection and preserves record metadata', () => {
    const first = record('Initial');
    writeExtendedCollection(userId, 'fare-splits', [first]);
    const updated = { ...first, title: 'Changed', version: 2 };
    writeExtendedCollection(userId, 'fare-splits', [updated]);
    expect(readExtendedCollection<TestRecord>(userId, 'fare-splits')[0].title).toBe('Changed');
  });

  it('removes a record by identifier', () => {
    const first = record('Initial');
    writeExtendedCollection(userId, 'fare-splits', [first]);
    expect(removeExtendedRecord(userId, 'fare-splits', first.id).ok).toBe(true);
    expect(readExtendedCollection<TestRecord>(userId, 'fare-splits')).toEqual([]);
  });

  it('rejects writes without a user id', () => {
    expect(writeExtendedCollection('', 'fare-splits', []).ok).toBe(false);
  });

  it('records a bounded audit history', () => {
    for (let index = 0; index < 300; index += 1) {
      recordExtendedAudit(userId, {
        collection: 'fare-splits',
        action: 'CREATE',
        message: `Entry ${index}`,
      });
    }
    expect(readExtendedAudit(userId)).toHaveLength(250);
    expect(readExtendedAudit(userId)[0].message).toBe('Entry 299');
  });

  it('creates a backup for all registered expansion collections', () => {
    const backup = createExtendedBackup(userId);
    expect(validateExtendedBackup(backup, userId)).toBe(true);
    expect(Object.keys(backup.collections).length).toBeGreaterThanOrEqual(10);
  });

  it('rejects a backup that belongs to a different user', () => {
    const backup = createExtendedBackup(userId);
    expect(validateExtendedBackup(backup, 'someone-else')).toBe(false);
  });

  it('restores a backup for the same user', () => {
    const first = record('Saved split');
    writeExtendedCollection(userId, 'fare-splits', [first]);
    const backup = createExtendedBackup(userId);
    writeExtendedCollection(userId, 'fare-splits', []);
    expect(restoreExtendedBackup(userId, backup).ok).toBe(true);
    expect(readExtendedCollection<TestRecord>(userId, 'fare-splits')).toHaveLength(1);
  });

  it('rejects a backup with an unsupported schema version', () => {
    const backup = createExtendedBackup(userId);
    expect(validateExtendedBackup({ ...backup, schemaVersion: 999 })).toBe(false);
  });

  it('summarizes record counts and storage size', () => {
    writeExtendedCollection(userId, 'fare-splits', [record('Example')]);
    const summary = getExtendedStorageSummary(userId);
    expect(summary.keys).toBe(1);
    expect(summary.bytes).toBeGreaterThan(0);
  });
});
