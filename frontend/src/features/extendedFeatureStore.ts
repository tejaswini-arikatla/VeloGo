/**
 * Independent, versioned persistence layer for the VeloGo expansion modules.
 *
 * This store deliberately does not change the original feature-suite collections.
 * Each new module gets a separate key, user namespace, schema version and event.
 * The browser store is a demonstration adapter; production deployments should
 * replace it with authenticated Spring Boot endpoints and server-side ownership.
 */
export type ExtendedCollection =
  | 'fare-splits'
  | 'eco-journeys'
  | 'accessibility-profiles'
  | 'commute-plans'
  | 'receipt-notes'
  | 'trip-checklists'
  | 'vehicle-comparisons'
  | 'travel-budgets'
  | 'budget-expenses'
  | 'favorite-places'
  | 'safety-checkins'
  | 'group-trips'
  | 'airport-plans'
  | 'ride-reminders';

export interface StoredRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface StoreEnvelope<T> {
  schemaVersion: number;
  userId: string;
  collection: ExtendedCollection;
  updatedAt: string;
  records: T[];
}

export interface StoreResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
}

export interface StoreAuditEvent {
  id: string;
  collection: ExtendedCollection;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'IMPORT' | 'EXPORT' | 'RESET';
  recordId?: string;
  message: string;
  timestamp: string;
}

const SCHEMA_VERSION = 1;
const PREFIX = 'velogo_expansion_v1';
const AUDIT_LIMIT = 250;
const MAX_RECORDS = 2000;

function keyFor(userId: string, collection: ExtendedCollection): string {
  return `${PREFIX}:${encodeURIComponent(userId)}:${collection}`;
}

function auditKey(userId: string): string {
  return `${PREFIX}:${encodeURIComponent(userId)}:audit`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function makeId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

function isBrowserStorageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function dispatchStoreEvent(userId: string, collection: ExtendedCollection): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('velogo-expansion-store-change', {
    detail: { userId, collection, changedAt: nowIso() },
  }));
}

export function createStoredRecord<T extends object>(data: T): T & StoredRecord {
  const timestamp = nowIso();
  return {
    ...data,
    id: makeId('vgx'),
    createdAt: timestamp,
    updatedAt: timestamp,
    version: 1,
  };
}

export function readExtendedCollection<T extends StoredRecord>(
  userId: string,
  collection: ExtendedCollection,
): T[] {
  if (!userId || !isBrowserStorageAvailable()) return [];
  const parsed = parseJson<unknown>(window.localStorage.getItem(keyFor(userId, collection)), []);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item): item is T => {
    return Boolean(
      item &&
      typeof item === 'object' &&
      typeof (item as StoredRecord).id === 'string' &&
      typeof (item as StoredRecord).createdAt === 'string',
    );
  });
}

export function writeExtendedCollection<T extends StoredRecord>(
  userId: string,
  collection: ExtendedCollection,
  records: T[],
): StoreResult<T[]> {
  if (!userId) return { ok: false, error: 'Sign in to save this information.' };
  if (!isBrowserStorageAvailable()) return { ok: false, error: 'Browser storage is unavailable.' };
  if (records.length > MAX_RECORDS) {
    return { ok: false, error: `A collection can contain at most ${MAX_RECORDS} records.` };
  }

  try {
    const envelope: StoreEnvelope<T> = {
      schemaVersion: SCHEMA_VERSION,
      userId,
      collection,
      updatedAt: nowIso(),
      records,
    };
    window.localStorage.setItem(keyFor(userId, collection), JSON.stringify(envelope.records));
    dispatchStoreEvent(userId, collection);
    return { ok: true, value: records };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown storage error.';
    return { ok: false, error: `Could not save data: ${message}` };
  }
}

export function appendExtendedRecord<T extends StoredRecord>(
  userId: string,
  collection: ExtendedCollection,
  record: T,
): StoreResult<T[]> {
  const current = readExtendedCollection<T>(userId, collection);
  return writeExtendedCollection(userId, collection, [record, ...current]);
}

export function updateExtendedRecord<T extends StoredRecord>(
  userId: string,
  collection: ExtendedCollection,
  recordId: string,
  patch: Partial<T>,
): StoreResult<T[]> {
  const current = readExtendedCollection<T>(userId, collection);
  let found = false;
  const next = current.map((record) => {
    if (record.id !== recordId) return record;
    found = true;
    return {
      ...record,
      ...patch,
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: nowIso(),
      version: record.version + 1,
    };
  });
  if (!found) return { ok: false, error: 'The record no longer exists. Refresh and try again.' };
  return writeExtendedCollection(userId, collection, next);
}

export function removeExtendedRecord<T extends StoredRecord>(
  userId: string,
  collection: ExtendedCollection,
  recordId: string,
): StoreResult<T[]> {
  const current = readExtendedCollection<T>(userId, collection);
  const next = current.filter((record) => record.id !== recordId);
  if (next.length === current.length) {
    return { ok: false, error: 'The record could not be found.' };
  }
  return writeExtendedCollection(userId, collection, next);
}

export function findExtendedRecord<T extends StoredRecord>(
  userId: string,
  collection: ExtendedCollection,
  recordId: string,
): T | undefined {
  return readExtendedCollection<T>(userId, collection).find((record) => record.id === recordId);
}

export function recordExtendedAudit(
  userId: string,
  event: Omit<StoreAuditEvent, 'id' | 'timestamp'>,
): void {
  if (!userId || !isBrowserStorageAvailable()) return;
  const current = parseJson<StoreAuditEvent[]>(window.localStorage.getItem(auditKey(userId)), []);
  const next: StoreAuditEvent[] = [{
    ...event,
    id: makeId('audit'),
    timestamp: nowIso(),
  }, ...current].slice(0, AUDIT_LIMIT);
  try {
    window.localStorage.setItem(auditKey(userId), JSON.stringify(next));
  } catch {
    // Audit history is best-effort and must never block the primary action.
  }
}

export function readExtendedAudit(userId: string): StoreAuditEvent[] {
  if (!userId || !isBrowserStorageAvailable()) return [];
  const records = parseJson<StoreAuditEvent[]>(window.localStorage.getItem(auditKey(userId)), []);
  return Array.isArray(records) ? records.slice(0, AUDIT_LIMIT) : [];
}

export interface ExtendedBackup {
  format: 'velogo-expansion-backup';
  schemaVersion: number;
  userId: string;
  exportedAt: string;
  collections: Partial<Record<ExtendedCollection, StoredRecord[]>>;
}

export const EXTENDED_COLLECTIONS: ExtendedCollection[] = [
  'fare-splits',
  'eco-journeys',
  'accessibility-profiles',
  'commute-plans',
  'receipt-notes',
  'trip-checklists',
  'vehicle-comparisons',
  'travel-budgets',
  'budget-expenses',
  'favorite-places',
  'safety-checkins',
  'group-trips',
  'airport-plans',
  'ride-reminders',
];

export function createExtendedBackup(userId: string): ExtendedBackup {
  const collections: ExtendedBackup['collections'] = {};
  EXTENDED_COLLECTIONS.forEach((collection) => {
    collections[collection] = readExtendedCollection<StoredRecord>(userId, collection);
  });
  recordExtendedAudit(userId, {
    collection: 'fare-splits',
    action: 'EXPORT',
    message: 'Exported expansion feature data.',
  });
  return {
    format: 'velogo-expansion-backup',
    schemaVersion: SCHEMA_VERSION,
    userId,
    exportedAt: nowIso(),
    collections,
  };
}

export function validateExtendedBackup(value: unknown, expectedUserId?: string): value is ExtendedBackup {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ExtendedBackup>;
  if (candidate.format !== 'velogo-expansion-backup') return false;
  if (candidate.schemaVersion !== SCHEMA_VERSION) return false;
  if (typeof candidate.userId !== 'string' || !candidate.userId) return false;
  if (expectedUserId && candidate.userId !== expectedUserId) return false;
  if (!candidate.collections || typeof candidate.collections !== 'object') return false;

  return Object.entries(candidate.collections).every(([name, records]) => {
    if (!EXTENDED_COLLECTIONS.includes(name as ExtendedCollection)) return false;
    if (!Array.isArray(records)) return false;
    return records.every((record) => (
      Boolean(record) &&
      typeof record.id === 'string' &&
      typeof record.createdAt === 'string' &&
      typeof record.updatedAt === 'string' &&
      Number.isInteger(record.version)
    ));
  });
}

export function restoreExtendedBackup(userId: string, backup: ExtendedBackup): StoreResult<boolean> {
  if (!validateExtendedBackup(backup, userId)) {
    return { ok: false, error: 'The backup is invalid or belongs to another account.' };
  }
  try {
    EXTENDED_COLLECTIONS.forEach((collection) => {
      const records = backup.collections[collection] || [];
      window.localStorage.setItem(keyFor(userId, collection), JSON.stringify(records));
      dispatchStoreEvent(userId, collection);
    });
    recordExtendedAudit(userId, {
      collection: 'fare-splits',
      action: 'IMPORT',
      message: 'Restored expansion feature data from a backup.',
    });
    return { ok: true, value: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Could not restore the backup.',
    };
  }
}

export function clearExtendedCollection(userId: string, collection: ExtendedCollection): void {
  if (!userId || !isBrowserStorageAvailable()) return;
  window.localStorage.removeItem(keyFor(userId, collection));
  recordExtendedAudit(userId, {
    collection,
    action: 'RESET',
    message: `Cleared ${collection} records.`,
  });
  dispatchStoreEvent(userId, collection);
}

export function getExtendedStorageSummary(userId: string): {
  keys: number;
  bytes: number;
  kilobytes: number;
  collections: Array<{ collection: ExtendedCollection; records: number; bytes: number }>;
} {
  const collections = EXTENDED_COLLECTIONS.map((collection) => {
    const records = readExtendedCollection<StoredRecord>(userId, collection);
    const bytes = new Blob([JSON.stringify(records)]).size;
    return { collection, records: records.length, bytes };
  });
  const bytes = collections.reduce((sum, item) => sum + item.bytes, 0);
  return {
    keys: collections.filter((item) => item.records > 0).length,
    bytes,
    kilobytes: Math.round((bytes / 1024) * 10) / 10,
    collections,
  };
}

export function subscribeToExtendedStore(
  callback: (detail: { userId: string; collection: ExtendedCollection }) => void,
): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handler = (event: Event) => {
    const custom = event as CustomEvent<{ userId: string; collection: ExtendedCollection }>;
    if (custom.detail?.userId && custom.detail?.collection) callback(custom.detail);
  };
  window.addEventListener('velogo-expansion-store-change', handler);
  return () => window.removeEventListener('velogo-expansion-store-change', handler);
}

export function exportCollectionAsJson<T extends StoredRecord>(
  collection: ExtendedCollection,
  records: T[],
): string {
  return JSON.stringify({
    format: 'velogo-expansion-collection',
    schemaVersion: SCHEMA_VERSION,
    collection,
    exportedAt: nowIso(),
    records,
  }, null, 2);
}

export function downloadTextFile(filename: string, content: string, mime = 'text/plain;charset=utf-8'): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function formatIndianCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatShortDate(value: string): string {
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
