import React, { useMemo, useState } from 'react';
import { CalendarDays, Pause, Play, Plus, Repeat2, Trash2 } from 'lucide-react';
import { nextOccurrences } from '../extendedFeatureAlgorithms';
import { appendExtendedRecord, createStoredRecord, readExtendedCollection, recordExtendedAudit, StoredRecord, writeExtendedCollection, formatIndianCurrency } from '../extendedFeatureStore';

type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
interface CommutePlan extends StoredRecord {
  title: string;
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  departureTime: string;
  weekdays: Weekday[];
  vehicle: 'BIKE' | 'AUTO' | 'CAB' | 'PUBLIC';
  oneWayBudget: number;
  returnTrip: boolean;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  reminderMinutes: number;
  notes: string;
}

interface Props { userId: string; onNotice: (message: string, tone?: 'success' | 'error' | 'info') => void; }

const weekdays: Array<{ value: Weekday; label: string; short: string }> = [
  { value: 1, label: 'Monday', short: 'M' },
  { value: 2, label: 'Tuesday', short: 'T' },
  { value: 3, label: 'Wednesday', short: 'W' },
  { value: 4, label: 'Thursday', short: 'T' },
  { value: 5, label: 'Friday', short: 'F' },
  { value: 6, label: 'Saturday', short: 'S' },
  { value: 0, label: 'Sunday', short: 'S' },
];

const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100';
const label = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500';
const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };

function validatePlan(plan: Omit<CommutePlan, keyof StoredRecord>): string | null {
  if (!plan.title.trim()) return 'Enter a plan name.';
  if (!plan.origin.trim() || !plan.destination.trim()) return 'Enter both commute locations.';
  if (plan.origin.trim().toLowerCase() === plan.destination.trim().toLowerCase()) return 'Origin and destination must be different.';
  if (!plan.startDate || !plan.endDate || plan.endDate < plan.startDate) return 'Choose a valid start and end date.';
  if (plan.weekdays.length === 0) return 'Select at least one weekday.';
  if (plan.oneWayBudget < 0 || !Number.isFinite(plan.oneWayBudget)) return 'Enter a valid trip budget.';
  return null;
}

function estimateMonthlyCost(plan: CommutePlan): number {
  const dates = nextOccurrences(today(), plan.weekdays, 22);
  const activeDays = dates.filter((date) => date >= plan.startDate && date <= plan.endDate).length;
  return Math.round(activeDays * plan.oneWayBudget * (plan.returnTrip ? 2 : 1) * 100) / 100;
}

export const CommutePassModule: React.FC<Props> = ({ userId, onNotice }) => {
  const [records, setRecords] = useState<CommutePlan[]>(() => readExtendedCollection<CommutePlan>(userId, 'commute-plans'));
  const [title, setTitle] = useState('Office commute');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(() => { const date = new Date(); date.setDate(date.getDate() + 30); return date.toISOString().slice(0, 10); });
  const [departureTime, setDepartureTime] = useState('09:00');
  const [selectedDays, setSelectedDays] = useState<Weekday[]>([1, 2, 3, 4, 5]);
  const [vehicle, setVehicle] = useState<CommutePlan['vehicle']>('PUBLIC');
  const [budget, setBudget] = useState('50');
  const [returnTrip, setReturnTrip] = useState(true);
  const [reminder, setReminder] = useState('15');
  const [notes, setNotes] = useState('');
  const [filter, setFilter] = useState<'ALL' | CommutePlan['status']>('ALL');

  const visible = useMemo(() => records.filter((item) => filter === 'ALL' || item.status === filter)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [records, filter]);
  const activeCount = records.filter((item) => item.status === 'ACTIVE').length;
  const plannedBudget = records.filter((item) => item.status === 'ACTIVE').reduce((sum, item) => sum + estimateMonthlyCost(item), 0);

  const refresh = () => setRecords(readExtendedCollection<CommutePlan>(userId, 'commute-plans'));
  const toggleDay = (day: Weekday) => setSelectedDays((current) => current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort((a, b) => a - b));

  const savePlan = (event: React.FormEvent) => {
    event.preventDefault();
    const candidate = {
      title, origin, destination, startDate, endDate, departureTime,
      weekdays: selectedDays, vehicle, oneWayBudget: Number(budget), returnTrip,
      status: 'ACTIVE' as const, reminderMinutes: Number(reminder), notes: notes.trim(),
    };
    const error = validatePlan(candidate);
    if (error) return onNotice(error, 'error');
    if (new Date(`${endDate}T23:59:59`) < new Date()) return onNotice('The plan end date must be in the future.', 'error');
    const record = createStoredRecord(candidate) as CommutePlan;
    const result = appendExtendedRecord(userId, 'commute-plans', record);
    if (!result.ok) return onNotice(result.error || 'Could not save commute plan.', 'error');
    recordExtendedAudit(userId, { collection: 'commute-plans', action: 'CREATE', recordId: record.id, message: `Created commute plan: ${record.title}` });
    refresh();
    setTitle(''); setOrigin(''); setDestination(''); setNotes('');
    onNotice('Recurring commute plan saved.');
  };

  const changeStatus = (record: CommutePlan) => {
    const status = record.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    const next = records.map((item) => item.id === record.id
      ? { ...item, status, updatedAt: new Date().toISOString(), version: item.version + 1 }
      : item);
    const result = writeExtendedCollection(userId, 'commute-plans', next);
    if (!result.ok) return onNotice(result.error || 'Could not update plan.', 'error');
    recordExtendedAudit(userId, { collection: 'commute-plans', action: 'UPDATE', recordId: record.id, message: `${status === 'PAUSED' ? 'Paused' : 'Resumed'} commute plan: ${record.title}` });
    refresh();
    onNotice(`Commute plan ${status.toLowerCase()}.`);
  };

  const remove = (record: CommutePlan) => {
    if (!window.confirm(`Delete commute plan "${record.title}"?`)) return;
    const result = writeExtendedCollection(userId, 'commute-plans', records.filter((item) => item.id !== record.id));
    if (!result.ok) return onNotice(result.error || 'Could not delete plan.', 'error');
    recordExtendedAudit(userId, { collection: 'commute-plans', action: 'DELETE', recordId: record.id, message: `Deleted commute plan: ${record.title}` });
    refresh();
    onNotice('Commute plan deleted.');
  };

  const daysLabel = (days: Weekday[]) => weekdays.filter((day) => days.includes(day.value)).map((day) => day.label.slice(0, 3)).join(', ');

  return <div className="space-y-6">
    <section className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-5">
      <div className="flex items-center gap-3"><span className="rounded-xl bg-white p-3 text-sky-700 shadow-sm"><Repeat2 className="h-6 w-6" /></span><div><h3 className="text-lg font-black text-slate-900">Recurring commute planner</h3><p className="text-sm text-slate-500">Plan the journeys you make regularly and estimate the monthly cost.</p></div></div>
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3"><Summary label="Active plans" value={String(activeCount)} /><Summary label="Estimated monthly budget" value={formatIndianCurrency(plannedBudget)} /><Summary label="Stored plans" value={String(records.length)} /></div>
    </section>

    <form onSubmit={savePlan} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div><h3 className="font-black text-slate-900">Create a commute plan</h3><p className="text-xs text-slate-500">This is a planning calendar, not an automatic ride booking.</p></div>
      <div className="grid gap-3 md:grid-cols-2">
        <label><span className={label}>Plan name</span><input className={field} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={70} placeholder="College commute" /></label>
        <label><span className={label}>Vehicle preference</span><select className={field} value={vehicle} onChange={(event) => setVehicle(event.target.value as CommutePlan['vehicle'])}><option value="BIKE">Bike</option><option value="AUTO">Auto</option><option value="CAB">Cab</option><option value="PUBLIC">Public transport</option></select></label>
        <label><span className={label}>From</span><input className={field} value={origin} onChange={(event) => setOrigin(event.target.value)} maxLength={180} placeholder="Home" /></label>
        <label><span className={label}>To</span><input className={field} value={destination} onChange={(event) => setDestination(event.target.value)} maxLength={180} placeholder="Office / college" /></label>
      </div>
      <div><span className={label}>Repeat on</span><div className="flex flex-wrap gap-2">{weekdays.map((day) => <button key={day.value} type="button" onClick={() => toggleDay(day.value)} aria-pressed={selectedDays.includes(day.value)} className={`grid h-10 w-10 place-items-center rounded-full text-xs font-black ${selectedDays.includes(day.value) ? 'bg-sky-700 text-white' : 'border border-slate-200 bg-white text-slate-500'}`}>{day.short}</button>)}</div><p className="mt-1 text-[10px] text-slate-400">{daysLabel(selectedDays) || 'No weekdays selected'}</p></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label><span className={label}>Start date</span><input className={field} type="date" value={startDate} min={today()} onChange={(event) => setStartDate(event.target.value)} /></label>
        <label><span className={label}>End date</span><input className={field} type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} /></label>
        <label><span className={label}>Departure</span><input className={field} type="time" value={departureTime} onChange={(event) => setDepartureTime(event.target.value)} /></label>
        <label><span className={label}>Budget per trip (₹)</span><input className={field} type="number" min="0" step="0.5" value={budget} onChange={(event) => setBudget(event.target.value)} /></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2"><label className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-700"><input type="checkbox" checked={returnTrip} onChange={(event) => setReturnTrip(event.target.checked)} /> Include return journey in budget</label><label><span className={label}>Reminder lead time</span><select className={field} value={reminder} onChange={(event) => setReminder(event.target.value)}><option value="0">No reminder</option><option value="10">10 minutes</option><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60">1 hour</option></select></label></div>
      <label><span className={label}>Notes</span><textarea className={field} rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={250} placeholder="Optional commute details" /></label>
      <button className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-extrabold text-white"><Plus className="h-4 w-4" /> Save commute plan</button>
    </form>

    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black text-slate-900">Your commute plans</h3><p className="text-xs text-slate-500">Pause a plan when your routine changes.</p></div><select className="rounded-lg border border-slate-200 px-3 py-2 text-xs" value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}><option value="ALL">All plans</option><option value="ACTIVE">Active</option><option value="PAUSED">Paused</option><option value="COMPLETED">Completed</option></select></div>
      {visible.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No commute plans match this filter.</p> : <div className="mt-4 space-y-3">{visible.map((record) => { const occurrences = nextOccurrences(today(), record.weekdays, 5).filter((date) => date >= record.startDate && date <= record.endDate); return <article key={record.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h4 className="font-extrabold text-slate-900">{record.title}</h4><span className={`rounded-full px-2 py-1 text-[10px] font-black ${record.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{record.status}</span></div><p className="mt-1 text-sm text-slate-600">{record.origin} → {record.destination}</p><p className="mt-1 text-xs text-slate-400">{daysLabel(record.weekdays)} · {record.departureTime} · {record.startDate} to {record.endDate}</p></div><div className="text-right"><p className="font-black text-slate-900">{formatIndianCurrency(estimateMonthlyCost(record))}</p><p className="text-[10px] text-slate-400">Estimated next 22 service days</p></div></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-slate-500"><CalendarDays className="mr-1 inline h-3.5 w-3.5" />Next: {occurrences.slice(0, 3).join(', ') || 'No upcoming date in range'}</p><div className="flex gap-2"><button onClick={() => changeStatus(record)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">{record.status === 'ACTIVE' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}{record.status === 'ACTIVE' ? 'Pause' : 'Resume'}</button><button onClick={() => remove(record)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50" aria-label={`Delete ${record.title}`}><Trash2 className="h-4 w-4" /></button></div></div></article>; })}</div>}
    </section>
  </div>;
};

const Summary: React.FC<{ label: string; value: string }> = ({ label: title, value }) => <div className="rounded-xl border border-sky-100 bg-white p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{title}</p><p className="mt-1 text-lg font-black text-slate-900">{value}</p></div>;
