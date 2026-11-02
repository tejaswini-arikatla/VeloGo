/**
 * Versioned browser storage for the customer feature suite.
 * The existing ride API remains the source of truth for actual bookings.
 * This store holds optional planning records and demo workflows per user.
 */
import {
  Conversation,
  FeatureAuditEntry,
  FeatureId,
  FeatureNotice,
  FeatureStoreSnapshot,
  LostItemReport,
  MultiStopRoute,
  PoolInterest,
  PoolRequest,
  RewardProfile,
  ScheduledRideRecord,
  TrustedContact,
  emptyRewardProfile,
} from './featureModels';

const CURRENT_SCHEMA_VERSION = 1;
const STORAGE_PREFIX = 'velogo_feature_suite_v1';
const MAX_AUDIT_ENTRIES = 150;
const MAX_NOTICES = 30;

type CollectionName =
  | 'scheduledRides'
  | 'routes'
  | 'poolRequests'
  | 'poolInterests'
  | 'conversations'
  | 'lostItems'
  | 'contacts';

export interface FeatureCollections {
  scheduledRides: ScheduledRideRecord[];
  routes: MultiStopRoute[];
  poolRequests: PoolRequest[];
  poolInterests: PoolInterest[];
  conversations: Conversation[];
  lostItems: LostItemReport[];
  rewards: RewardProfile;
  contacts: TrustedContact[];
}

export interface StoreChange<T> {
  previous: T;
  current: T;
  changedAt: string;
}

export type StoreListener = (event: { userId: string; collection: string; changedAt: string }) => void;

function storageKey(userId: string, collection: string): string {
  return `${STORAGE_PREFIX}:${encodeURIComponent(userId)}:${collection}`;
}

function auditKey(userId: string): string {
  return storageKey(userId, 'audit');
}

function noticeKey(userId: string): string {
  return storageKey(userId, 'notices');
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function emitChange(userId: string, collection: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('velogo-feature-store-change', {
    detail: { userId, collection, changedAt: new Date().toISOString() },
  }));
}

export function readCollection<K extends keyof FeatureCollections>(
  userId: string,
  collection: K,
): FeatureCollections[K] {
  if (!userId) return collection === 'rewards' ? emptyRewardProfile() as FeatureCollections[K] : [] as FeatureCollections[K];
  const fallback = collection === 'rewards' ? emptyRewardProfile() : [];
  return safeParse<FeatureCollections[K]>(localStorage.getItem(storageKey(userId, collection)), fallback as FeatureCollections[K]);
}

export function writeCollection<K extends keyof FeatureCollections>(
  userId: string,
  collection: K,
  value: FeatureCollections[K],
): void {
  if (!userId) throw new Error('A signed-in user is required to save feature data.');
  localStorage.setItem(storageKey(userId, collection), JSON.stringify(value));
  emitChange(userId, collection);
}

export function updateCollection<K extends keyof FeatureCollections>(
  userId: string,
  collection: K,
  updater: (current: FeatureCollections[K]) => FeatureCollections[K],
): FeatureCollections[K] {
  const current = readCollection(userId, collection);
  const next = updater(current);
  writeCollection(userId, collection, next);
  return next;
}

export function appendRecord<K extends Exclude<keyof FeatureCollections, 'rewards'>>(
  userId: string,
  collection: K,
  record: FeatureCollections[K] extends Array<infer T> ? T : never,
): void {
  updateCollection(userId, collection, (current) => [record, ...current] as FeatureCollections[K]);
}

export function removeRecord<K extends Exclude<keyof FeatureCollections, 'rewards'>>(
  userId: string,
  collection: K,
  recordId: string,
): boolean {
  let removed = false;
  updateCollection(userId, collection, (current) => {
    const next = current.filter((record) => record.id !== recordId);
    removed = next.length !== current.length;
    return next as FeatureCollections[K];
  });
  return removed;
}

export function replaceRecord<K extends Exclude<keyof FeatureCollections, 'rewards'>>(
  userId: string,
  collection: K,
  recordId: string,
  patch: Partial<FeatureCollections[K] extends Array<infer T> ? T : never>,
): boolean {
  let updated = false;
  updateCollection(userId, collection, (current) => current.map((record) => {
    if (record.id !== recordId) return record;
    updated = true;
    return { ...record, ...patch, updatedAt: new Date().toISOString(), version: record.version + 1 };
  }) as FeatureCollections[K]);
  return updated;
}

export function readAudit(userId: string): FeatureAuditEntry[] {
  return safeParse<FeatureAuditEntry[]>(localStorage.getItem(auditKey(userId)), []);
}

export function recordAudit(userId: string, feature: FeatureId, action: string, summary: string, recordId?: string): void {
  if (!userId) return;
  const entry: FeatureAuditEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    feature,
    action,
    recordId,
    timestamp: new Date().toISOString(),
    summary,
  };
  const next = [entry, ...readAudit(userId)].slice(0, MAX_AUDIT_ENTRIES);
  localStorage.setItem(auditKey(userId), JSON.stringify(next));
  emitChange(userId, 'audit');
}

export function readNotices(userId: string): FeatureNotice[] {
  return safeParse<FeatureNotice[]>(localStorage.getItem(noticeKey(userId)), []);
}

export function addNotice(userId: string, tone: FeatureNotice['tone'], title: string, message: string): FeatureNotice {
  const notice: FeatureNotice = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tone,
    title,
    message,
    createdAt: new Date().toISOString(),
    dismissed: false,
  };
  const next = [notice, ...readNotices(userId)].slice(0, MAX_NOTICES);
  localStorage.setItem(noticeKey(userId), JSON.stringify(next));
  emitChange(userId, 'notices');
  return notice;
}

export function dismissNotice(userId: string, noticeId: string): void {
  const next = readNotices(userId).map((notice) => notice.id === noticeId ? { ...notice, dismissed: true } : notice);
  localStorage.setItem(noticeKey(userId), JSON.stringify(next));
  emitChange(userId, 'notices');
}

export function createSnapshot(userId: string): FeatureStoreSnapshot {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    userId,
    exportedAt: new Date().toISOString(),
    scheduledRides: readCollection(userId, 'scheduledRides'),
    routes: readCollection(userId, 'routes'),
    poolRequests: readCollection(userId, 'poolRequests'),
    poolInterests: readCollection(userId, 'poolInterests'),
    conversations: readCollection(userId, 'conversations'),
    lostItems: readCollection(userId, 'lostItems'),
    rewards: readCollection(userId, 'rewards'),
    contacts: readCollection(userId, 'contacts'),
  };
}

export function validateSnapshot(value: unknown): value is FeatureStoreSnapshot {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<FeatureStoreSnapshot>;
  if (candidate.schemaVersion !== CURRENT_SCHEMA_VERSION) return false;
  if (typeof candidate.userId !== 'string') return false;
  const arrays: Array<keyof FeatureStoreSnapshot> = [
    'scheduledRides', 'routes', 'poolRequests', 'poolInterests', 'conversations', 'lostItems', 'contacts',
  ];
  if (arrays.some((key) => !Array.isArray(candidate[key] as unknown[]))) return false;
  return Boolean(candidate.rewards && typeof candidate.rewards === 'object');
}

export function restoreSnapshot(userId: string, snapshot: FeatureStoreSnapshot): void {
  if (!validateSnapshot(snapshot)) throw new Error('The selected backup is not a supported VeloGo feature backup.');
  if (snapshot.userId !== userId) throw new Error('This backup belongs to a different account.');
  const collections: CollectionName[] = [
    'scheduledRides', 'routes', 'poolRequests', 'poolInterests', 'conversations', 'lostItems', 'contacts',
  ];
  collections.forEach((collection) => {
    const value = snapshot[collection];
    localStorage.setItem(storageKey(userId, collection), JSON.stringify(value));
  });
  localStorage.setItem(storageKey(userId, 'rewards'), JSON.stringify(snapshot.rewards));
  emitChange(userId, 'restore');
}

export function clearFeatureData(userId: string): void {
  const collections = [
    'scheduledRides', 'routes', 'poolRequests', 'poolInterests', 'conversations', 'lostItems',
    'rewards', 'contacts', 'audit', 'notices',
  ];
  collections.forEach((collection) => localStorage.removeItem(storageKey(userId, collection)));
  emitChange(userId, 'clear');
}

export function subscribeToFeatureStore(listener: StoreListener): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handler = (event: Event) => {
    const custom = event as CustomEvent<{ userId: string; collection: string; changedAt: string }>;
    listener(custom.detail);
  };
  window.addEventListener('velogo-feature-store-change', handler);
  window.addEventListener('storage', (event) => {
    if (event.key?.startsWith(STORAGE_PREFIX)) {
      listener({ userId: '', collection: event.key, changedAt: new Date().toISOString() });
    }
  });
  return () => window.removeEventListener('velogo-feature-store-change', handler);
}

export function getFeatureStorageUsage(userId: string): { keys: number; bytes: number; kilobytes: number } {
  let keys = 0;
  let bytes = 0;
  const prefix = `${STORAGE_PREFIX}:${encodeURIComponent(userId)}:`;
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(prefix)) {
      keys += 1;
      bytes += (key.length + (localStorage.getItem(key) || '').length) * 2;
    }
  }
  return { keys, bytes, kilobytes: Math.round(bytes / 1024 * 10) / 10 };
}

export function exportSnapshotAsJson(userId: string): string {
  return JSON.stringify(createSnapshot(userId), null, 2);
}

export function importSnapshotFromJson(userId: string, raw: string): FeatureStoreSnapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }
  if (!validateSnapshot(parsed)) throw new Error('The selected file is not a valid VeloGo feature backup.');
  if (parsed.userId !== userId) throw new Error('The backup account does not match the signed-in account.');
  restoreSnapshot(userId, parsed);
  return parsed;
}
