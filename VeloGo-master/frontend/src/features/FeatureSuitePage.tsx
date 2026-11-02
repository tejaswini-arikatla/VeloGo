import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowLeft, Award, CalendarClock, ChartNoAxesCombined, CheckCircle2, Download, FileUp, Heart, LifeBuoy, MapPinned, MessageCircle, PackageSearch, Route, ShieldCheck, Sparkles, Users, Calculator, Leaf, Accessibility, Repeat2, ReceiptText, ClipboardList, CarFront, Target, Bookmark, ShieldCheck as SafetyIcon, Plane, BellRing } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Ride } from '../types';
import { FEATURE_MODULES, FeatureId, FeatureNotice } from './featureModels';
import { addNotice, createSnapshot, dismissNotice, exportSnapshotAsJson, getFeatureStorageUsage, importSnapshotFromJson, readAudit, readNotices, restoreSnapshot, validateSnapshot } from './featureStorage';
import { ScheduledRidesModule } from './modules/ScheduledRidesModule';
import { MultiStopPlannerModule } from './modules/MultiStopPlannerModule';
import { RidePoolingModule } from './modules/RidePoolingModule';
import { TripMessagesModule } from './modules/TripMessagesModule';
import { LostFoundModule } from './modules/LostFoundModule';
import { RewardsModule } from './modules/RewardsModule';
import { TrustedContactsModule } from './modules/TrustedContactsModule';
import { TravelAnalyticsModule } from './modules/TravelAnalyticsModule';
import { FeatureNotificationSettings } from './FeatureNotificationSettings';
import { createExtendedBackup, restoreExtendedBackup, validateExtendedBackup } from './extendedFeatureStore';
import { restoreFeatureSuiteFromCloud, saveFeatureSuiteToCloud } from './featureCloudSync';
import { FareSplitModule } from './modules/FareSplitModule';
import { EcoImpactModule } from './modules/EcoImpactModule';
import { AccessibilityProfileModule } from './modules/AccessibilityProfileModule';
import { CommutePassModule } from './modules/CommutePassModule';
import { ReceiptVaultModule } from './modules/ReceiptVaultModule';
import { TripChecklistModule } from './modules/TripChecklistModule';
import { VehicleCompareModule } from './modules/VehicleCompareModule';
import { TravelBudgetModule } from './modules/TravelBudgetModule';
import { FavoritePlacesModule } from './modules/FavoritePlacesModule';
import { SafetyCheckInModule } from './modules/SafetyCheckInModule';
import { GroupTripOrganizerModule } from './modules/GroupTripOrganizerModule';
import { AirportTransferPlannerModule } from './modules/AirportTransferPlannerModule';
import { RideReminderCenterModule } from './modules/RideReminderCenterModule';

const iconMap: Record<FeatureId, React.ElementType> = {
  scheduled: CalendarClock,
  stops: Route,
  pooling: Users,
  messages: MessageCircle,
  'lost-found': PackageSearch,
  rewards: Award,
  contacts: ShieldCheck,
  analytics: ChartNoAxesCombined,
  'fare-split': Calculator,
  'eco-impact': Leaf,
  accessibility: Accessibility,
  commute: Repeat2,
  receipts: ReceiptText,
  checklists: ClipboardList,
  'vehicle-compare': CarFront,
  'travel-budget': Target,
  'favorite-places': Bookmark,
  'safety-checkins': SafetyIcon,
  'group-trips': Users,
  'airport-plans': Plane,
  reminders: BellRing,
};

export const FeatureSuitePage: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id || 'guest';
  const [active, setActive] = useState<FeatureId>('scheduled');
  const [notice, setNotice] = useState<FeatureNotice | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [loadingRides, setLoadingRides] = useState(true);
  const [audit, setAudit] = useState(() => readAudit(userId));
  const [notices, setNotices] = useState(() => readNotices(userId));
  const [storageUsage, setStorageUsage] = useState(() => getFeatureStorageUsage(userId));
  const [showDataTools, setShowDataTools] = useState(false);
  const [backupError, setBackupError] = useState('');
  const [backupSuccess, setBackupSuccess] = useState('');
  const [cloudBusy, setCloudBusy] = useState(false);

  const current = FEATURE_MODULES.find((module) => module.id === active)!;
  const completedRideCount = rides.filter((ride) => ride.status === 'COMPLETED').length;
  const activeNotices = notices.filter((item) => !item.dismissed).slice(0, 3);
  const recentAudit = useMemo(() => audit.slice(0, 8), [audit]);

  useEffect(() => {
    let mounted = true;
    api.rides.getMyHistory()
      .then((result) => { if (mounted) setRides(result || []); })
      .catch(() => { if (mounted) setRides([]); })
      .finally(() => { if (mounted) setLoadingRides(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const refresh = () => {
      setAudit(readAudit(userId));
      setNotices(readNotices(userId));
      setStorageUsage(getFeatureStorageUsage(userId));
    };
    window.addEventListener('velogo-feature-store-change', refresh);
    return () => window.removeEventListener('velogo-feature-store-change', refresh);
  }, [userId]);

  const showNotice = (message: string, tone: 'success' | 'error' | 'info' = 'success') => {
    const created = addNotice(userId, tone, tone === 'error' ? 'Something needs attention' : tone === 'info' ? 'Information' : 'Saved', message);
    setNotice(created);
    setNotices(readNotices(userId));
    window.setTimeout(() => setNotice((currentNotice) => currentNotice?.id === created.id ? null : currentNotice), 4200);
  };

  const exportBackup = () => {
    try {
      const content = exportSnapshotAsJson(userId);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `velogo-feature-backup-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setBackupSuccess('Backup exported successfully.'); setBackupError('');
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : 'Could not export backup.'); setBackupSuccess('');
    }
  };

  const saveCloudBackup = async () => {
    if (!user?.id) {
      setBackupError('Sign in to save a cloud backup.'); setBackupSuccess('');
      return;
    }
    setCloudBusy(true);
    try {
      await saveFeatureSuiteToCloud(user.id);
      setBackupSuccess('Feature-suite backup saved to your VeloGo account.'); setBackupError('');
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : 'Could not save cloud backup.'); setBackupSuccess('');
    } finally {
      setCloudBusy(false);
    }
  };

  const restoreCloudBackup = async () => {
    if (!user?.id) {
      setBackupError('Sign in to restore a cloud backup.'); setBackupSuccess('');
      return;
    }
    if (!window.confirm('Restoring the cloud backup replaces the current core feature-suite records on this browser. Continue?')) return;
    setCloudBusy(true);
    try {
      await restoreFeatureSuiteFromCloud(user.id);
      setAudit(readAudit(userId)); setNotices(readNotices(userId)); setStorageUsage(getFeatureStorageUsage(userId));
      setBackupSuccess('Cloud backup restored to this browser.'); setBackupError('');
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : 'Could not restore cloud backup.'); setBackupSuccess('');
    } finally {
      setCloudBusy(false);
    }
  };

  const exportExpansionBackup = () => {
    try {
      const content = JSON.stringify(createExtendedBackup(userId), null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `velogo-expansion-backup-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setBackupSuccess('Expanded feature backup exported successfully.'); setBackupError('');
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : 'Could not export expanded backup.'); setBackupSuccess('');
    }
  };

  const importExpansionBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const raw = await file.text();
      const parsed: unknown = JSON.parse(raw);
      if (!validateExtendedBackup(parsed, userId)) throw new Error('This is not a valid expanded feature backup for this account.');
      if (!window.confirm('Restoring this backup replaces all records in the expanded feature modules. Continue?')) return;
      const result = restoreExtendedBackup(userId, parsed);
      if (!result.ok) throw new Error(result.error || 'Could not restore expanded backup.');
      setBackupSuccess('Expanded feature backup restored.'); setBackupError('');
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : 'Could not import expanded backup.'); setBackupSuccess('');
    } finally {
      event.target.value = '';
    }
  };

  const importBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const raw = await file.text();
      const parsed: unknown = JSON.parse(raw);
      if (!validateSnapshot(parsed)) throw new Error('This file is not a supported VeloGo feature backup.');
      if (parsed.userId !== userId) throw new Error('This backup belongs to another account.');
      if (!window.confirm('Importing a backup replaces the current local feature records. Continue?')) return;
      importSnapshotFromJson(userId, raw);
      setBackupSuccess('Backup imported. Your feature modules have been refreshed.'); setBackupError('');
      setAudit(readAudit(userId)); setNotices(readNotices(userId)); setStorageUsage(getFeatureStorageUsage(userId));
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : 'Could not import backup.'); setBackupSuccess('');
    } finally {
      event.target.value = '';
    }
  };

  const dismiss = (id: string) => {
    dismissNotice(userId, id); setNotices(readNotices(userId));
  };

  const renderModule = () => {
    const common = { userId, onNotice: showNotice };
    switch (active) {
      case 'scheduled': return <ScheduledRidesModule {...common} />;
      case 'stops': return <MultiStopPlannerModule {...common} />;
      case 'pooling': return <RidePoolingModule {...common} userName={user?.fullName || 'VeloGo customer'} />;
      case 'messages': return <TripMessagesModule {...common} userName={user?.fullName || 'VeloGo customer'} />;
      case 'lost-found': return <LostFoundModule {...common} phone={user?.phone} />;
      case 'rewards': return <RewardsModule {...common} completedRideCount={completedRideCount} />;
      case 'contacts': return <TrustedContactsModule {...common} />;
      case 'analytics': return <TravelAnalyticsModule rides={rides} loading={loadingRides} onRefresh={() => { setLoadingRides(true); api.rides.getMyHistory().then(setRides).catch(() => showNotice('Could not refresh ride history.', 'error')).finally(() => setLoadingRides(false)); }} />;
      case 'fare-split': return <FareSplitModule {...common} />;
      case 'eco-impact': return <EcoImpactModule {...common} />;
      case 'accessibility': return <AccessibilityProfileModule {...common} />;
      case 'commute': return <CommutePassModule {...common} />;
      case 'receipts': return <ReceiptVaultModule {...common} />;
      case 'checklists': return <TripChecklistModule {...common} />;
      case 'vehicle-compare': return <VehicleCompareModule {...common} />;
      case 'travel-budget': return <TravelBudgetModule {...common} />;
      case 'favorite-places': return <FavoritePlacesModule {...common} />;
      case 'safety-checkins': return <SafetyCheckInModule {...common} />;
      case 'group-trips': return <GroupTripOrganizerModule {...common} userName={user?.fullName || 'VeloGo customer'} />;
      case 'airport-plans': return <AirportTransferPlannerModule {...common} />;
      case 'reminders': return <RideReminderCenterModule {...common} />;
      default: return null;
    }
  };

  return <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
    <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-xl sm:p-8"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-300/30 bg-indigo-300/10 px-3 py-1 text-xs font-bold text-indigo-200"><Sparkles className="h-3.5 w-3.5" /> VeloGo feature suite</div><h1 className="text-3xl font-black tracking-tight sm:text-4xl">More control over every journey.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">A collection of optional travel tools that work alongside the existing booking experience.</p></div><Link to="/customer/features" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10"><ArrowLeft className="h-4 w-4" /> Previous feature page</Link></div><div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4"><HeroMetric label="Feature modules" value={String(FEATURE_MODULES.length)} /><HeroMetric label="Completed rides" value={loadingRides ? '…' : String(completedRideCount)} /><HeroMetric label="Local data keys" value={String(storageUsage.keys)} /><HeroMetric label="Storage used" value={`${storageUsage.kilobytes} KB`} /></div></section>

    {notice && <div role="status" className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${notice.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : notice.tone === 'info' ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}><div className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><div><strong>{notice.title}</strong><p className="mt-0.5">{notice.message}</p></div></div><button onClick={() => setNotice(null)} className="text-xs font-bold opacity-60">Dismiss</button></div>}

    {activeNotices.length > 0 && <div className="grid gap-2 sm:grid-cols-3">{activeNotices.map((item) => <div key={item.id} className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3"><div><p className="text-xs font-bold text-slate-700">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.message}</p></div><button onClick={() => dismiss(item.id)} className="text-[10px] font-bold text-slate-400">×</button></div>)}</div>}

    <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]"><aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><p className="px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Customer tools</p><div className="grid grid-cols-2 gap-1 sm:grid-cols-2 lg:grid-cols-1">{FEATURE_MODULES.map((module) => { const Icon = iconMap[module.id]; return <button key={module.id} onClick={() => setActive(module.id)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left transition ${active === module.id ? 'bg-indigo-50 text-indigo-800 ring-1 ring-indigo-100' : 'text-slate-600 hover:bg-slate-50'}`}><span className={`rounded-lg p-2 ${active === module.id ? 'bg-white text-indigo-600' : 'bg-slate-100 text-slate-500'}`}><Icon className="h-4 w-4" /></span><span className="min-w-0"><span className="block truncate text-xs font-extrabold">{module.shortTitle}</span><span className="hidden text-[10px] text-slate-400 lg:block">{module.group.toLowerCase()}</span></span></button>; })}</div><div className="mt-4 border-t border-slate-100 pt-3"><button onClick={() => setShowDataTools((value) => !value)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-slate-600 hover:bg-slate-50"><span className="rounded-lg bg-slate-100 p-2"><FileUp className="h-4 w-4" /></span><span className="text-xs font-extrabold">Backup & activity</span></button></div></aside>
      <main className="min-w-0 space-y-5"><header className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-start gap-3"><span className="rounded-xl bg-indigo-50 p-3 text-indigo-600"><MapPinned className="h-5 w-5" /></span><div><p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">{current.group}</p><h2 className="mt-1 text-2xl font-black text-slate-900">{current.title}</h2><p className="mt-1 text-sm text-slate-500">{current.description}</p></div></div></header>{renderModule()}</main></div>

    {showDataTools && <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5"><FeatureNotificationSettings userId={userId} onNotice={showNotice} /><div className="grid gap-4 lg:grid-cols-[1fr_1fr]"><div><div className="flex items-center gap-2"><Download className="h-4 w-4 text-indigo-600" /><h3 className="font-extrabold text-slate-900">Backup your feature data</h3></div><p className="mt-1 text-sm text-slate-500">Export your scheduled plans, routes, pooling posts, messages, reports, rewards and contacts as a JSON file.</p><button onClick={exportBackup} className="mt-3 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white">Download JSON backup</button></div><div><div className="flex items-center gap-2"><FileUp className="h-4 w-4 text-indigo-600" /><h3 className="font-extrabold text-slate-900">Restore a backup</h3></div><p className="mt-1 text-sm text-slate-500">Restore a previous backup for this account. Import replaces the current feature data.</p><label className="mt-3 inline-flex cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700">Choose backup file<input type="file" accept="application/json,.json" className="hidden" onChange={importBackup} /></label></div>{backupSuccess && <p className="text-xs font-bold text-emerald-700 lg:col-span-2">{backupSuccess}</p>}{backupError && <p role="alert" className="text-xs font-bold text-rose-700 lg:col-span-2">{backupError}</p>}<div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 lg:col-span-2"><h3 className="font-extrabold text-slate-900">Cloud backup (Spring Boot + database)</h3><p className="mt-1 text-xs text-slate-500">Save the core feature-suite snapshot to your signed-in account. Restore is manual and replaces the current core feature records on this browser.</p><div className="mt-3 flex flex-wrap gap-2"><button disabled={cloudBusy || !user?.id} onClick={saveCloudBackup} className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{cloudBusy ? 'Please wait…' : 'Save to cloud'}</button><button disabled={cloudBusy || !user?.id} onClick={restoreCloudBackup} className="rounded-lg border border-emerald-200 bg-white px-4 py-2 text-xs font-bold text-emerald-800 disabled:opacity-50">Restore from cloud</button></div></div><div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 lg:col-span-2"><h3 className="font-extrabold text-slate-900">Expanded feature data</h3><p className="mt-1 text-xs text-slate-500">Back up the additional fare splits, commute plans, check-ins, airport plans, saved places, budgets and other expansion records.</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={exportExpansionBackup} className="rounded-lg bg-indigo-700 px-4 py-2 text-xs font-bold text-white">Download expanded backup</button><label className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700">Restore expanded backup<input type="file" accept="application/json,.json" className="hidden" onChange={importExpansionBackup} /></label></div></div><div className="lg:col-span-2"><h3 className="mb-2 font-extrabold text-slate-900">Recent feature activity</h3>{recentAudit.length === 0 ? <p className="text-sm text-slate-400">No activity recorded yet.</p> : <div className="divide-y divide-slate-100">{recentAudit.map((entry) => <div key={entry.id} className="flex flex-wrap justify-between gap-2 py-2 text-xs"><span className="font-semibold text-slate-700">{entry.summary}</span><span className="text-slate-400">{new Date(entry.timestamp).toLocaleString()}</span></div>)}</div>}</div></div></section>}

    <footer className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900"><strong>Implementation boundary:</strong> Ride booking, authentication, payment, captain and core customer workflows use the Spring Boot backend. The core feature-suite snapshot can also be saved to and restored from the account-scoped cloud backup API. Individual planning modules and the additional expansion-module backup remain browser-local unless explicitly exported; they are not silently synchronized in the background.</footer>
  </div>;
};

const HeroMetric: React.FC<{ label: string; value: string }> = ({ label, value }) => <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>;
