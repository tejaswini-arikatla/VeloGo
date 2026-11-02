import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, Phone, Plus, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react';
import { appendExtendedRecord, createStoredRecord, formatShortDate, readExtendedCollection, recordExtendedAudit, StoredRecord, writeExtendedCollection } from '../extendedFeatureStore';

interface SafetyCheckIn extends StoredRecord {
  title: string;
  tripDate: string;
  expectedArrival: string;
  contactName: string;
  contactPhone: string;
  destination: string;
  checkInStatus: 'PLANNED' | 'SAFE' | 'FOLLOW_UP' | 'CLOSED';
  checkInNote: string;
  safeAt?: string;
}

interface Props { userId: string; onNotice: (message: string, tone?: 'success' | 'error' | 'info') => void; }

const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100';
const label = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500';
const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };

function validateCheckIn(value: Omit<SafetyCheckIn, keyof StoredRecord | 'checkInStatus' | 'safeAt'>): string | null {
  if (!value.title.trim()) return 'Enter a trip label.';
  if (!value.tripDate || !value.expectedArrival) return 'Choose the trip date and expected arrival time.';
  if (!value.contactName.trim()) return 'Enter a trusted contact name.';
  if (!/^\+?[0-9\s()-]{8,18}$/.test(value.contactPhone)) return 'Enter a valid contact number.';
  if (!value.destination.trim()) return 'Enter a destination.';
  return null;
}

export const SafetyCheckInModule: React.FC<Props> = ({ userId, onNotice }) => {
  const [records, setRecords] = useState<SafetyCheckIn[]>(() => readExtendedCollection<SafetyCheckIn>(userId, 'safety-checkins'));
  const [title, setTitle] = useState('Evening trip');
  const [tripDate, setTripDate] = useState(today());
  const [expectedArrival, setExpectedArrival] = useState('19:00');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [destination, setDestination] = useState('');
  const [checkInNote, setCheckInNote] = useState('');
  const [filter, setFilter] = useState<'ALL' | SafetyCheckIn['checkInStatus']>('ALL');

  const visible = useMemo(() => records
    .filter((record) => filter === 'ALL' || record.checkInStatus === filter)
    .sort((a, b) => `${b.tripDate}T${b.expectedArrival}`.localeCompare(`${a.tripDate}T${a.expectedArrival}`)), [records, filter]);
  const pending = records.filter((record) => record.checkInStatus === 'PLANNED' || record.checkInStatus === 'FOLLOW_UP').length;
  const safe = records.filter((record) => record.checkInStatus === 'SAFE').length;
  const refresh = () => setRecords(readExtendedCollection<SafetyCheckIn>(userId, 'safety-checkins'));

  const createCheckIn = (event: React.FormEvent) => {
    event.preventDefault();
    const candidate = { title, tripDate, expectedArrival, contactName, contactPhone, destination, checkInNote };
    const error = validateCheckIn(candidate);
    if (error) return onNotice(error, 'error');
    if (tripDate < today()) return onNotice('Choose today or a future date.', 'error');
    const record = createStoredRecord({
      ...candidate,
      title: title.trim(),
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
      destination: destination.trim(),
      checkInNote: checkInNote.trim(),
      checkInStatus: 'PLANNED' as const,
    }) as SafetyCheckIn;
    const result = appendExtendedRecord(userId, 'safety-checkins', record);
    if (!result.ok) return onNotice(result.error || 'Could not save check-in.', 'error');
    refresh();
    setTitle(''); setContactName(''); setContactPhone(''); setDestination(''); setCheckInNote('');
    onNotice('Trip check-in plan saved.');
  };

  const markSafe = (record: SafetyCheckIn) => {
    const next = records.map((item) => item.id === record.id
      ? { ...item, checkInStatus: 'SAFE' as const, safeAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: item.version + 1 }
      : item);
    const result = writeExtendedCollection(userId, 'safety-checkins', next);
    if (!result.ok) return onNotice(result.error || 'Could not update check-in.', 'error');
    recordExtendedAudit(userId, { collection: 'safety-checkins', action: 'UPDATE', recordId: record.id, message: `Marked trip safe: ${record.title}` });
    refresh();
    onNotice('You marked this trip as safe.');
  };

  const requestFollowUp = (record: SafetyCheckIn) => {
    const next = records.map((item) => item.id === record.id
      ? { ...item, checkInStatus: 'FOLLOW_UP' as const, updatedAt: new Date().toISOString(), version: item.version + 1 }
      : item);
    const result = writeExtendedCollection(userId, 'safety-checkins', next);
    if (!result.ok) return onNotice(result.error || 'Could not update check-in.', 'error');
    refresh();
    onNotice('Follow-up reminder marked. Contact your trusted person directly if needed.', 'info');
  };

  const close = (record: SafetyCheckIn) => {
    const next = records.map((item) => item.id === record.id
      ? { ...item, checkInStatus: 'CLOSED' as const, updatedAt: new Date().toISOString(), version: item.version + 1 }
      : item);
    const result = writeExtendedCollection(userId, 'safety-checkins', next);
    if (!result.ok) return onNotice(result.error || 'Could not close check-in.', 'error');
    refresh();
    onNotice('Check-in closed.');
  };

  const remove = (record: SafetyCheckIn) => {
    if (!window.confirm(`Delete check-in "${record.title}"?`)) return;
    const result = writeExtendedCollection(userId, 'safety-checkins', records.filter((item) => item.id !== record.id));
    if (!result.ok) return onNotice(result.error || 'Could not delete check-in.', 'error');
    refresh();
    onNotice('Check-in deleted.');
  };

  const callContact = (record: SafetyCheckIn) => {
    window.location.href = `tel:${record.contactPhone.replace(/[^\d+]/g, '')}`;
  };

  return <div className="space-y-6">
    <section className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-5"><div className="flex items-center gap-3"><span className="rounded-xl bg-white p-3 text-rose-700 shadow-sm"><ShieldCheck className="h-6 w-6" /></span><div><h3 className="text-lg font-black text-slate-900">Personal trip check-ins</h3><p className="text-sm text-slate-500">Keep a reminder of who to contact and when you expect to arrive.</p></div></div><div className="mt-5 grid grid-cols-3 gap-3"><Summary label="Check-ins" value={String(records.length)} /><Summary label="Pending" value={String(pending)} /><Summary label="Marked safe" value={String(safe)} /></div></section>

    <form onSubmit={createCheckIn} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"><div><h3 className="font-black text-slate-900">Create a trip check-in</h3><p className="text-xs text-slate-500">This tool does not automatically send alerts or monitor your location.</p></div><div className="grid gap-3 md:grid-cols-2"><label><span className={label}>Trip label</span><input className={field} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={70} placeholder="Late evening commute" /></label><label><span className={label}>Destination</span><input className={field} value={destination} onChange={(event) => setDestination(event.target.value)} maxLength={180} /></label><label><span className={label}>Trip date</span><input className={field} type="date" min={today()} value={tripDate} onChange={(event) => setTripDate(event.target.value)} /></label><label><span className={label}>Expected arrival</span><input className={field} type="time" value={expectedArrival} onChange={(event) => setExpectedArrival(event.target.value)} /></label><label><span className={label}>Trusted contact</span><input className={field} value={contactName} onChange={(event) => setContactName(event.target.value)} maxLength={70} /></label><label><span className={label}>Contact phone</span><input className={field} value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} maxLength={18} /></label></div><label><span className={label}>Private note</span><textarea className={field} rows={2} value={checkInNote} onChange={(event) => setCheckInNote(event.target.value)} maxLength={240} /></label><button className="rounded-xl bg-rose-700 px-5 py-2.5 text-sm font-extrabold text-white"><Plus className="mr-1 inline h-4 w-4" /> Save check-in</button></form>

    <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black text-slate-900">Check-in history</h3><p className="text-xs text-slate-500">Update a record after you arrive or when a follow-up is needed.</p></div><select className="rounded-lg border border-slate-200 px-3 py-2 text-xs" value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}><option value="ALL">All</option><option value="PLANNED">Planned</option><option value="SAFE">Safe</option><option value="FOLLOW_UP">Follow-up</option><option value="CLOSED">Closed</option></select></div>{visible.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No check-ins yet.</p> : <div className="mt-4 space-y-3">{visible.map((record) => <article key={record.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className="font-extrabold text-slate-900">{record.title}</h4><p className="mt-1 text-xs text-slate-500">{record.destination} · {formatShortDate(record.tripDate)} at {record.expectedArrival}</p><p className="mt-1 text-xs text-slate-500">Contact: {record.contactName} · {record.contactPhone}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-black ${record.checkInStatus === 'SAFE' ? 'bg-emerald-50 text-emerald-700' : record.checkInStatus === 'FOLLOW_UP' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{record.checkInStatus.replace('_', ' ')}</span></div>{record.checkInNote && <p className="mt-2 text-xs text-slate-500">{record.checkInNote}</p>}<div className="mt-3 flex flex-wrap gap-2">{record.checkInStatus !== 'SAFE' && <button onClick={() => markSafe(record)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white"><CheckCircle2 className="h-3.5 w-3.5" /> I'm safe</button>}{record.checkInStatus === 'PLANNED' && <button onClick={() => requestFollowUp(record)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700"><AlertCircle className="h-3.5 w-3.5" /> Need follow-up</button>}<button onClick={() => callContact(record)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold"><Phone className="h-3.5 w-3.5" /> Call contact</button>{record.checkInStatus !== 'CLOSED' && <button onClick={() => close(record)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">Close</button>}<button onClick={() => remove(record)} className="rounded-lg p-2 text-rose-500" aria-label={`Delete ${record.title}`}><Trash2 className="h-4 w-4" /></button></div></article>)}</div>}</section>
    <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> This is a manual personal reminder, not an emergency response service. It does not track GPS, send alerts, or detect missed arrivals. If you are in immediate danger, contact local emergency services directly.</p>
  </div>;
};

const Summary: React.FC<{ label: string; value: string }> = ({ label: title, value }) => <div className="rounded-xl border border-rose-100 bg-white p-3"><p className="text-[10px] font-bold uppercase text-slate-400">{title}</p><p className="mt-1 text-xl font-black text-slate-900">{value}</p></div>;
