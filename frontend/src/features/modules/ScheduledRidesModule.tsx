import React, { useMemo, useState } from 'react';
import { CalendarClock, CarFront, CheckCircle2, Clock3, MapPin, Pencil, Trash2 } from 'lucide-react';
import { createFeatureRecord, ScheduledRideRecord, VehicleChoice } from '../featureModels';
import { appendRecord, readCollection, recordAudit, replaceRecord, updateCollection } from '../featureStorage';
import { firstIssue, formatDateTime, getLocalDateTimeInputValue, getVehicleLabel, validateScheduledRide } from '../featureValidation';
import { createCalendarDownload, exportScheduledRidesToIcs } from '../featureCalendar';

interface Props { userId: string; onNotice: (message: string, tone?: 'success' | 'error' | 'info') => void; }
type FormState = { pickup: string; destination: string; vehicle: VehicleChoice; scheduledAt: string; passengerCount: number; note: string; reminderMinutes: number; estimatedFare: string };
const emptyForm = (): FormState => ({ pickup: '', destination: '', vehicle: 'BIKE', scheduledAt: getLocalDateTimeInputValue(new Date(Date.now() + 60 * 60_000)), passengerCount: 1, note: '', reminderMinutes: 30, estimatedFare: '' });
const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';
const labelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500';

export const ScheduledRidesModule: React.FC<Props> = ({ userId, onNotice }) => {
  const [records, setRecords] = useState(() => readCollection(userId, 'scheduledRides'));
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'SCHEDULED' | 'CANCELLED' | 'COMPLETED'>('ALL');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const visibleRecords = useMemo(() => records
    .filter((record) => filter === 'ALL' || record.status === filter)
    .filter((record) => `${record.pickup} ${record.destination}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)), [records, filter, search]);

  const refresh = () => setRecords(readCollection(userId, 'scheduledRides'));
  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const candidate = {
      pickup: form.pickup,
      destination: form.destination,
      vehicle: form.vehicle,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      passengerCount: Number(form.passengerCount),
      note: form.note.trim(),
      reminderMinutes: Number(form.reminderMinutes),
      estimatedFare: form.estimatedFare ? Number(form.estimatedFare) : null,
      status: 'SCHEDULED' as const,
    };
    const validation = validateScheduledRide(candidate);
    if (!validation.valid) { onNotice(firstIssue(validation) || 'Check the form.', 'error'); return; }
    if (editingId) {
      const updated = replaceRecord(userId, 'scheduledRides', editingId, candidate);
      if (!updated) { onNotice('This scheduled ride could not be found.', 'error'); return; }
      recordAudit(userId, 'scheduled', 'UPDATED', 'Updated a scheduled ride.', editingId);
      onNotice('Scheduled ride updated.');
    } else {
      const record = createFeatureRecord(candidate) as ScheduledRideRecord;
      appendRecord(userId, 'scheduledRides', record);
      recordAudit(userId, 'scheduled', 'CREATED', 'Created a scheduled ride.', record.id);
      onNotice('Your scheduled ride has been saved on this device.');
    }
    setForm(emptyForm()); setEditingId(null); setShowForm(false); refresh();
  };

  const edit = (record: ScheduledRideRecord) => {
    if (record.status !== 'SCHEDULED') return;
    setEditingId(record.id);
    setForm({
      pickup: record.pickup,
      destination: record.destination,
      vehicle: record.vehicle,
      scheduledAt: getLocalDateTimeInputValue(new Date(record.scheduledAt)),
      passengerCount: record.passengerCount,
      note: record.note,
      reminderMinutes: record.reminderMinutes,
      estimatedFare: record.estimatedFare == null ? '' : String(record.estimatedFare),
    });
    setShowForm(true);
  };

  const cancel = (record: ScheduledRideRecord) => {
    const reason = window.prompt('Why are you cancelling this plan? (optional)') || '';
    updateCollection(userId, 'scheduledRides', (items) => items.map((item) => item.id === record.id
      ? { ...item, status: 'CANCELLED', cancellationReason: reason.trim(), updatedAt: new Date().toISOString(), version: item.version + 1 }
      : item));
    recordAudit(userId, 'scheduled', 'CANCELLED', 'Cancelled a scheduled ride.', record.id);
    refresh(); onNotice('Scheduled ride cancelled.');
  };

  const remove = (record: ScheduledRideRecord) => {
    if (!window.confirm('Delete this scheduled ride from your saved plans?')) return;
    updateCollection(userId, 'scheduledRides', (items) => items.filter((item) => item.id !== record.id));
    recordAudit(userId, 'scheduled', 'DELETED', 'Deleted a scheduled ride plan.', record.id);
    refresh(); onNotice('Scheduled ride removed.');
  };

  const startNew = () => { setEditingId(null); setForm(emptyForm()); setShowForm(true); };
  const upcomingCount = records.filter((record) => record.status === 'SCHEDULED' && new Date(record.scheduledAt).getTime() > Date.now()).length;
  const cancelledCount = records.filter((record) => record.status === 'CANCELLED').length;

  return (
    <section className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Saved plans" value={records.length} icon={<CalendarClock className="h-5 w-5" />} />
        <Metric label="Upcoming" value={upcomingCount} icon={<Clock3 className="h-5 w-5" />} />
        <Metric label="Cancelled" value={cancelledCount} icon={<Trash2 className="h-5 w-5" />} />
      </div>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div><h2 className="text-xl font-black text-slate-900">Scheduled rides</h2><p className="mt-1 text-sm text-slate-500">Keep future travel plans organised before you need them.</p></div>
        <div className="flex flex-wrap gap-2"><button onClick={() => createCalendarDownload(exportScheduledRidesToIcs(records), 'velogo-scheduled-rides.ics')} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600">Export calendar</button><button onClick={startNew} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">+ Schedule a ride</button></div>
      </div>
      {showForm && <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2"><h3 className="font-extrabold text-slate-900">{editingId ? 'Edit your plan' : 'Plan a future ride'}</h3><p className="text-xs text-slate-500">This saves a planning record. It does not dispatch a captain or create a paid booking.</p></div>
        <Field label="Pickup location"><input className={inputClass} value={form.pickup} onChange={(event) => updateField('pickup', event.target.value)} placeholder="e.g. VVIT, Guntur" /></Field>
        <Field label="Destination"><input className={inputClass} value={form.destination} onChange={(event) => updateField('destination', event.target.value)} placeholder="Where are you going?" /></Field>
        <Field label="Date and time"><input className={inputClass} type="datetime-local" min={getLocalDateTimeInputValue()} value={form.scheduledAt} onChange={(event) => updateField('scheduledAt', event.target.value)} /></Field>
        <Field label="Vehicle category"><select className={inputClass} value={form.vehicle} onChange={(event) => updateField('vehicle', event.target.value as VehicleChoice)}><option value="BIKE">Bike taxi</option><option value="AUTO">Auto</option><option value="CAB">Cab</option><option value="WOMEN_BIKE">Women-only bike</option></select></Field>
        <Field label="Passengers"><input className={inputClass} type="number" min="1" max="6" value={form.passengerCount} onChange={(event) => updateField('passengerCount', Number(event.target.value))} /></Field>
        <Field label="Reminder before ride"><select className={inputClass} value={form.reminderMinutes} onChange={(event) => updateField('reminderMinutes', Number(event.target.value))}><option value="0">No reminder</option><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60">1 hour</option><option value="1440">1 day</option></select></Field>
        <Field label="Estimated fare (optional)"><input className={inputClass} type="number" min="0" step="1" value={form.estimatedFare} onChange={(event) => updateField('estimatedFare', event.target.value)} placeholder="₹" /></Field>
        <Field label="Notes for yourself"><input className={inputClass} value={form.note} onChange={(event) => updateField('note', event.target.value)} placeholder="Luggage, preferences, etc." /></Field>
        <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600">Close</button><button className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white">{editingId ? 'Save changes' : 'Save plan'}</button></div>
      </form>}
      <div className="flex flex-col gap-3 sm:flex-row"><input className={`${inputClass} sm:max-w-xs`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search locations..." /><select className={`${inputClass} sm:max-w-48`} value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}><option value="ALL">All plans</option><option value="SCHEDULED">Scheduled</option><option value="CANCELLED">Cancelled</option><option value="COMPLETED">Completed</option></select></div>
      {visibleRecords.length === 0 ? <EmptyState title="No scheduled rides yet" detail="Create a plan for your next appointment, class or journey." /> : <div className="grid gap-3">{visibleRecords.map((record) => <article key={record.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><div className="rounded-xl bg-indigo-50 p-3 text-indigo-600"><CarFront className="h-5 w-5" /></div><div><p className="font-extrabold text-slate-900">{record.pickup} <span className="text-slate-400">→</span> {record.destination}</p><p className="mt-1 text-xs text-slate-500">{formatDateTime(record.scheduledAt)} · {getVehicleLabel(record.vehicle)} · {record.passengerCount} passenger(s)</p>{record.note && <p className="mt-2 text-sm text-slate-600">Note: {record.note}</p>}</div></div><StatusPill status={record.status} /></div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><span className="text-xs text-slate-500">{record.estimatedFare == null ? 'Fare not estimated' : `Estimated fare: ₹${record.estimatedFare}`}</span><div className="flex gap-2">{record.status === 'SCHEDULED' && <><button onClick={() => edit(record)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600"><Pencil className="h-3 w-3" /> Edit</button><button onClick={() => cancel(record)} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600">Cancel</button></>}<button onClick={() => remove(record)} className="rounded-lg px-2 py-1.5 text-xs font-bold text-slate-400 hover:text-rose-600">Delete</button></div></div>
      </article>)}</div>}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><strong>Prototype note:</strong> Scheduled plans are saved in this browser for the signed-in account. Automatic captain matching, push notifications and server-side persistence are not connected yet.</div>
    </section>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>{children}</label>;
const Metric: React.FC<{ label: string; value: number; icon: React.ReactNode }> = ({ label, value, icon }) => <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4"><span className="rounded-xl bg-indigo-50 p-2 text-indigo-600">{icon}</span><div><p className="text-xs text-slate-500">{label}</p><p className="text-xl font-black text-slate-900">{value}</p></div></div>;
const EmptyState: React.FC<{ title: string; detail: string }> = ({ title, detail }) => <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center"><MapPin className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-2 font-bold text-slate-700">{title}</p><p className="mt-1 text-sm text-slate-500">{detail}</p></div>;
const StatusPill: React.FC<{ status: string }> = ({ status }) => <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${status === 'SCHEDULED' ? 'bg-emerald-50 text-emerald-700' : status === 'CANCELLED' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>{status}</span>;
