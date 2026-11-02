/**
 * Optional cloud backup/restore for the VeloGo customer feature suite.
 *
 * Core ride operations already use the Spring Boot API. This helper lets a
 * signed-in user keep a portable feature-suite snapshot in their account too.
 * It is explicit (not background sync), so local data is never overwritten
 * without the user choosing to restore it.
 */
import { api } from '../services/api';
import { createSnapshot, restoreSnapshot, validateSnapshot } from './featureStorage';
import type { FeatureStoreSnapshot } from './featureModels';

const BACKUP_KEY = 'feature-suite-backup';
const BACKUP_TITLE = 'VeloGo feature suite backup';

export async function saveFeatureSuiteToCloud(userId: string): Promise<void> {
  if (!userId) throw new Error('Sign in before saving a cloud backup.');
  const payload = createSnapshot(userId);
  const existing = await api.features.listData(BACKUP_KEY);
  const current = existing[0];

  if (current) {
    await api.features.updateData(current.id, {
      featureKey: BACKUP_KEY,
      title: BACKUP_TITLE,
      payload,
    });
    await Promise.all(existing.slice(1).map((record) => api.features.deleteData(record.id)));
    return;
  }

  await api.features.createData({
    featureKey: BACKUP_KEY,
    title: BACKUP_TITLE,
    payload,
  });
}

export async function restoreFeatureSuiteFromCloud(userId: string): Promise<void> {
  if (!userId) throw new Error('Sign in before restoring a cloud backup.');
  const backups = await api.features.listData(BACKUP_KEY);
  const latest = backups[0];
  if (!latest) throw new Error('No VeloGo feature-suite backup was found in this account.');

  const snapshot = latest.payload as FeatureStoreSnapshot;
  if (!validateSnapshot(snapshot)) {
    throw new Error('The cloud backup is not a supported VeloGo feature-suite snapshot.');
  }
  if (snapshot.userId !== userId) {
    throw new Error('This cloud backup belongs to a different account.');
  }
  restoreSnapshot(userId, snapshot);
}
