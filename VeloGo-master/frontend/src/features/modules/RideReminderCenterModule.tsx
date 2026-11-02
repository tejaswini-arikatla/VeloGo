import React, { useMemo, useState } from 'react';
import { Bell, BellRing, CalendarClock, Check, Plus, Trash2 } from 'lucide-react';
import { appendExtendedRecord, createStoredRecord, formatShortDate, readExtendedCollection, recordExtendedAudit, StoredRecord, writeExtendedCollection } from '../extendedFeatureStore';

interface RideReminder extends StoredRecord {
  title: string;
  detail: string;
  remindAt: string;
  category: 'BOOKING' | 'PAYMENT' | 'DOCUMENT' | 'PERSONAL' | 'OTHER';
  status: 'PENDING' | 'DONE' | 'DISMISSED';
  priority: 'LOW' | 'NORMAL' | 'HIGH';
}

interface Props { userId: string; onNotice: (message: string, tone?: 'success' | 'error' | 'info') => void; }
const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100';
const label = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500';

function isDue(reminder: RideReminder, now = new Date()): boolean {
  const timestamp = new Date(reminder.remindAt).getTime();
  return Number.isFinite(timestamp) && timestamp <= now.getTime() && reminder.status === 'PENDING';
}

function sortReminders(items: RideReminder[]): RideReminder[] {
  return [...items].sort((a, b) => {
    const priority = { HIGH: 0, NORMAL: 1, LOW: 2 };
    if (priority[a.priority] !== priority[b.priority]) return priority[a.priority] - priority[b.priority];
    return a.remindAt.localeCompare(b.remindAt);
  });
}

export const RideReminderCenterModule: React.FC<Props> = ({ userId, onNotice }) => {
  const [records, setRecords] = useState<RideReminder[]>(() => readExtendedCollection<RideReminder>(userId, 'ride-reminders'));
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [remindAt, setRemindAt] = useState(() => {
    const date = new Date(Date.now() + 60 * 60_000);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  });
  const [category, setCategory] = useState<RideReminder['category']>('PERSONAL');
  const [priority, setPriority] = useState<RideReminder['priority']>('NORMAL');
  const [filter, setFilter] = useState<'ALL' | RideReminder['status']>('ALL');

  const visible = useMemo(() => sortReminders(records.filter((item) => filter === 'ALL' || item.status === filter)), [records, filter]);
  const dueCount = records.filter((item) => isDue(item)).length;
  const pendingCount = records.filter((item) => item.status === 'PENDING').length;
  const completedCount = records.filter((item) => item.status === 'DONE').length;
  const refresh = () => setRecords(readExtendedCollection<RideReminder>(userId, 'ride-reminders'));

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return onNotice('Enter a reminder title.', 'error');
    if (!remindAt || Number.isNaN(new Date(remindAt).getTime())) return onNotice('Choose a valid reminder date and time.', 'error');
    if (new Date(remindAt).getTime() < Date.now() - 60_000) return onNotice('Choose a future reminder time.', 'error');
    if (title.length > 90 || detail.length > 300) return onNotice('Reminder details are too long.', 'error');
    const record = createStoredRecord({
      title: title.trim(),
      detail: detail.trim(),
      remindAt: new Date(remindAt).toISOString(),
      category,
      status: 'PENDING',
      priority,
    }) as RideReminder;
    const result = appendExtendedRecord(userId, 'ride-reminders', record);
    if (!result.ok) return onNotice(result.error || 'Could not save reminder.', 'error');
    recordExtendedAudit(userId, { collection: 'ride-reminders', action: 'CREATE', recordId: record.id, message: `Created reminder: ${record.title}` });
    refresh();
    setTitle(''); setDetail('');
    onNotice('Reminder saved. It will appear here when due.');
  };

  const updateStatus = (record: RideReminder, status: RideReminder['status']) => {
    const next = records.map((item) => item.id === record.id
      ? { ...item, status, updatedAt: new Date().toISOString(), version: item.version + 1 }
      : item);
    const result = writeExtendedCollection(userId, 'ride-reminders', next);
    if (!result.ok) return onNotice(result.error || 'Could not update reminder.', 'error');
    refresh();
    onNotice(status === 'DONE' ? 'Reminder completed.' : 'Reminder dismissed.');
  };

  const remove = (record: RideReminder) => {
    if (!window.confirm(`Delete reminder "${record.title}"?`)) return;
    const result = writeExtendedCollection(userId, 'ride-reminders', records.filter((item) => item.id !== record.id));
    if (!result.ok) return onNotice(result.error || 'Could not delete reminder.', 'error');
    refresh();
    onNotice('Reminder deleted.');
  };

  const snooze = (record: RideReminder, minutes: number) => {
    const nextTime = new Date(Date.now() + minutes * 60_000).toISOString();
    const next = records.map((item) => item.id === record.id
      ? { ...item, remindAt: nextTime, status: 'PENDING' as const, updatedAt: new Date().toISOString(), version: item.version + 1 }
      : item);
    const result = writeExtendedCollection(userId, 'ride-reminders', next);
    if (!result.ok) return onNotice(result.error || 'Could not snooze reminder.', 'error');
    refresh();
    onNotice(`Reminder snoozed for ${minutes} minutes.`);
  };

  return <div className="space-y-6">
    <section className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5"><div className="flex items-center gap-3"><span className="rounded-xl bg-white p-3 text-amber-700 shadow-sm"><BellRing className="h-6 w-6" /></span><div><h3 className="text-lg font-black text-slate-900">Ride reminder center</h3><p className="text-sm text-slate-500">Keep track of booking, payment and personal travel reminders.</p></div></div><div className="mt-5 grid grid-cols-3 gap-3"><Summary label="Due now" value={String(dueCount)} /><Summary label="Pending" value={String(pendingCount)} /><Summary label="Completed" value={String(completedCount)} /></div></section>
    <form onSubmit={save} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-black text-slate-900">Create a reminder</h3><div className="grid gap-3 md:grid-cols-2"><label><span className={label}>Reminder title</span><input className={field} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={90} placeholder="Check airport pickup details" /></label><label><span className={label}>Reminder time</span><input className={field} type="datetime-local" value={remindAt} onChange={(event) => setRemindAt(event.target.value)} /></label><label><span className={label}>Category</span><select className={field} value={category} onChange={(event) => setCategory(event.target.value as RideReminder['category'])}><option value="BOOKING">Booking</option><option value="PAYMENT">Payment</option><option value="DOCUMENT">Documents</option><option value="PERSONAL">Personal</option><option value="OTHER">Other</option></select></label><label><span className={label}>Priority</span><select className={field} value={priority} onChange={(event) => setPriority(event.target.value as RideReminder['priority'])}><option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High</option></select></label></div><label><span className={label}>Details</span><textarea className={field} rows={2} value={detail} onChange={(event) => setDetail(event.target.value)} maxLength={300} /></label><button className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-extrabold text-white"><Plus className="mr-1 inline h-4 w-4" /> Save reminder</button></form>
    <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black text-slate-900">Your reminders</h3><p className="text-xs text-slate-500">Due reminders are highlighted when you open this page.</p></div><select className="rounded-lg border border-slate-200 px-3 py-2 text-xs" value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}><option value="ALL">All</option><option value="PENDING">Pending</option><option value="DONE">Done</option><option value="DISMISSED">Dismissed</option></select></div>{visible.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No reminders found.</p> : <div className="mt-4 space-y-2">{visible.map((record) => <article key={record.id} className={`rounded-xl border p-4 ${isDue(record) ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}><div className="flex flex-wrap items-start justify-between gap-2"><div><div className="flex items-center gap-2"><h4 className="font-extrabold text-slate-900">{record.title}</h4>{isDue(record) && <span className="rounded-full bg-amber-200 px-2 py-1 text-[9px] font-black text-amber-900">DUE</span>}</div><p className="mt-1 text-xs text-slate-500"><CalendarClock className="mr-1 inline h-3.5 w-3.5" />{new Date(record.remindAt).toLocaleString()} · {record.category} · {record.priority}</p>{record.detail && <p className="mt-2 text-xs text-slate-500">{record.detail}</p>}</div><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">{record.status}</span></div><div className="mt-3 flex flex-wrap gap-2">{record.status === 'PENDING' && <><button onClick={() => updateStatus(record, 'DONE')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white"><Check className="h-3.5 w-3.5" /> Done</button><button onClick={() => snooze(record, 10)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">Snooze 10m</button><button onClick={() => snooze(record, 60)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">Snooze 1h</button><button onClick={() => updateStatus(record, 'DISMISSED')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">Dismiss</button></>}<button onClick={() => remove(record)} className="rounded-lg p-2 text-rose-500" aria-label={`Delete ${record.title}`}><Trash2 className="h-4 w-4" /></button></div></article>)}</div>}</section>
    <p className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-500"><Bell className="mt-0.5 h-4 w-4 shrink-0" /> This page does not run a background notification service. Reminders are evaluated when the page is opened; browser notifications and server-side scheduling are not enabled.</p>
  </div>;
};

const Summary: React.FC<{ label: string; value: string }> = ({ label: title, value }) => <div className="rounded-xl border border-amber-100 bg-white p-3"><p className="text-[10px] font-bold uppercase text-slate-400">{title}</p><p className="mt-1 text-xl font-black text-slate-900">{value}</p></div>;
