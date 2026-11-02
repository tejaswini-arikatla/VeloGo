import React, { useMemo, useState } from 'react';
import { Plane, Clock3, Luggage, Plus, Trash2, CalendarClock } from 'lucide-react';
import { appendExtendedRecord, createStoredRecord, formatShortDate, readExtendedCollection, recordExtendedAudit, StoredRecord, writeExtendedCollection } from '../extendedFeatureStore';

interface AirportPlan extends StoredRecord {
  title: string;
  airport: string;
  terminal: string;
  flightNumber: string;
  airline: string;
  direction: 'DEPARTURE' | 'ARRIVAL';
  flightAt: string;
  pickupAt: string;
  origin: string;
  destination: string;
  passengers: number;
  luggage: 'LIGHT' | 'STANDARD' | 'HEAVY';
  bufferMinutes: number;
  notes: string;
  status: 'PLANNED' | 'READY' | 'COMPLETED' | 'CANCELLED';
}

interface Props { userId: string; onNotice: (message: string, tone?: 'success' | 'error' | 'info') => void; }
const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100';
const label = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500';

function minutesBetween(first: string, second: string): number {
  const a = new Date(first).getTime();
  const b = new Date(second).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.round((b - a) / 60_000);
}

function recommendedPickupTime(flightAt: string, direction: AirportPlan['direction'], buffer: number): string {
  const flight = new Date(flightAt);
  if (Number.isNaN(flight.getTime())) return '';
  const offset = direction === 'DEPARTURE' ? -(180 + buffer) : 45 + buffer;
  flight.setMinutes(flight.getMinutes() + offset);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${flight.getFullYear()}-${pad(flight.getMonth() + 1)}-${pad(flight.getDate())}T${pad(flight.getHours())}:${pad(flight.getMinutes())}`;
}

export const AirportTransferPlannerModule: React.FC<Props> = ({ userId, onNotice }) => {
  const [records, setRecords] = useState<AirportPlan[]>(() => readExtendedCollection<AirportPlan>(userId, 'airport-plans'));
  const [title, setTitle] = useState('Airport transfer');
  const [airport, setAirport] = useState('');
  const [terminal, setTerminal] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [airline, setAirline] = useState('');
  const [direction, setDirection] = useState<AirportPlan['direction']>('DEPARTURE');
  const [flightAt, setFlightAt] = useState('');
  const [pickupAt, setPickupAt] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [passengers, setPassengers] = useState('1');
  const [luggage, setLuggage] = useState<AirportPlan['luggage']>('STANDARD');
  const [buffer, setBuffer] = useState('30');
  const [notes, setNotes] = useState('');
  const [filter, setFilter] = useState<'ALL' | AirportPlan['status']>('ALL');

  const visible = useMemo(() => records.filter((item) => filter === 'ALL' || item.status === filter)
    .sort((a, b) => a.flightAt.localeCompare(b.flightAt)), [records, filter]);
  const refresh = () => setRecords(readExtendedCollection<AirportPlan>(userId, 'airport-plans'));
  const suggestedPickup = flightAt ? recommendedPickupTime(flightAt, direction, Number(buffer) || 0) : '';
  const timingGap = pickupAt && flightAt ? minutesBetween(pickupAt, flightAt) : null;

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    const count = Number(passengers);
    const bufferValue = Number(buffer);
    if (!title.trim() || !airport.trim() || !flightNumber.trim()) return onNotice('Enter a plan name, airport and flight number.', 'error');
    if (!flightAt || Number.isNaN(new Date(flightAt).getTime())) return onNotice('Choose a valid flight date and time.', 'error');
    if (!origin.trim() || !destination.trim()) return onNotice('Enter the transfer origin and destination.', 'error');
    if (!Number.isInteger(count) || count < 1 || count > 8) return onNotice('Passenger count must be between 1 and 8.', 'error');
    if (!Number.isInteger(bufferValue) || bufferValue < 0 || bufferValue > 360) return onNotice('Buffer must be between 0 and 360 minutes.', 'error');
    const chosenPickup = pickupAt || suggestedPickup;
    if (!chosenPickup || Number.isNaN(new Date(chosenPickup).getTime())) return onNotice('Choose a valid pickup time.', 'error');
    if (direction === 'DEPARTURE' && new Date(chosenPickup) >= new Date(flightAt)) return onNotice('For a departure, pickup should be before the flight time.', 'error');
    const record = createStoredRecord({
      title: title.trim(), airport: airport.trim(), terminal: terminal.trim(), flightNumber: flightNumber.trim().toUpperCase(),
      airline: airline.trim(), direction, flightAt, pickupAt: chosenPickup, origin: origin.trim(), destination: destination.trim(),
      passengers: count, luggage, bufferMinutes: bufferValue, notes: notes.trim(), status: 'PLANNED' as const,
    }) as AirportPlan;
    const result = appendExtendedRecord(userId, 'airport-plans', record);
    if (!result.ok) return onNotice(result.error || 'Could not save airport plan.', 'error');
    recordExtendedAudit(userId, { collection: 'airport-plans', action: 'CREATE', recordId: record.id, message: `Created airport plan: ${record.title}` });
    refresh();
    setTitle(''); setAirport(''); setTerminal(''); setFlightNumber(''); setAirline(''); setOrigin(''); setDestination(''); setFlightAt(''); setPickupAt(''); setNotes('');
    onNotice('Airport transfer plan saved.');
  };

  const updateStatus = (record: AirportPlan, status: AirportPlan['status']) => {
    const next = records.map((item) => item.id === record.id ? { ...item, status, updatedAt: new Date().toISOString(), version: item.version + 1 } : item);
    const result = writeExtendedCollection(userId, 'airport-plans', next);
    if (!result.ok) return onNotice(result.error || 'Could not update airport plan.', 'error');
    refresh();
    onNotice(`Airport plan marked ${status.toLowerCase()}.`);
  };

  const remove = (record: AirportPlan) => {
    if (!window.confirm(`Delete airport plan "${record.title}"?`)) return;
    const result = writeExtendedCollection(userId, 'airport-plans', records.filter((item) => item.id !== record.id));
    if (!result.ok) return onNotice(result.error || 'Could not delete plan.', 'error');
    refresh();
    onNotice('Airport plan deleted.');
  };

  return <div className="space-y-6">
    <section className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-5"><div className="flex items-center gap-3"><span className="rounded-xl bg-white p-3 text-sky-700 shadow-sm"><Plane className="h-6 w-6" /></span><div><h3 className="text-lg font-black text-slate-900">Airport transfer planner</h3><p className="text-sm text-slate-500">Coordinate pickup timing, flight details and luggage needs.</p></div></div><p className="mt-4 rounded-xl bg-white p-3 text-xs leading-5 text-sky-900">Flight times and pickup recommendations are entered or calculated locally. No live airline or airport data is fetched.</p></section>
    <form onSubmit={save} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-black text-slate-900">Create airport plan</h3><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3"><label><span className={label}>Plan name</span><input className={field} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={70} /></label><label><span className={label}>Airport</span><input className={field} value={airport} onChange={(event) => setAirport(event.target.value)} maxLength={100} placeholder="Airport name / code" /></label><label><span className={label}>Terminal</span><input className={field} value={terminal} onChange={(event) => setTerminal(event.target.value)} maxLength={30} /></label><label><span className={label}>Airline</span><input className={field} value={airline} onChange={(event) => setAirline(event.target.value)} maxLength={60} /></label><label><span className={label}>Flight number</span><input className={field} value={flightNumber} onChange={(event) => setFlightNumber(event.target.value)} maxLength={12} placeholder="AB123" /></label><label><span className={label}>Journey type</span><select className={field} value={direction} onChange={(event) => setDirection(event.target.value as AirportPlan['direction'])}><option value="DEPARTURE">Departing flight</option><option value="ARRIVAL">Arriving flight</option></select></label><label><span className={label}>Flight date and time</span><input className={field} type="datetime-local" value={flightAt} onChange={(event) => setFlightAt(event.target.value)} /></label><label><span className={label}>Pickup date and time</span><input className={field} type="datetime-local" value={pickupAt || suggestedPickup} onChange={(event) => setPickupAt(event.target.value)} /></label><label><span className={label}>Extra buffer (minutes)</span><input className={field} type="number" min="0" max="360" step="5" value={buffer} onChange={(event) => setBuffer(event.target.value)} /></label><label><span className={label}>Transfer from</span><input className={field} value={origin} onChange={(event) => setOrigin(event.target.value)} maxLength={160} /></label><label><span className={label}>Transfer to</span><input className={field} value={destination} onChange={(event) => setDestination(event.target.value)} maxLength={160} /></label><label><span className={label}>Passengers</span><input className={field} type="number" min="1" max="8" value={passengers} onChange={(event) => setPassengers(event.target.value)} /></label><label><span className={label}>Luggage</span><select className={field} value={luggage} onChange={(event) => setLuggage(event.target.value as AirportPlan['luggage'])}><option value="LIGHT">Light</option><option value="STANDARD">Standard</option><option value="HEAVY">Heavy</option></select></label></div>{suggestedPickup && <p className="rounded-lg bg-sky-50 p-3 text-xs text-sky-800">Suggested pickup based on a planning buffer: <strong>{new Date(suggestedPickup).toLocaleString()}</strong>{timingGap !== null && ` · ${timingGap} minutes before / after flight`}</p>}<label><span className={label}>Notes</span><textarea className={field} rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={240} placeholder="Meet at a specific gate or landmark" /></label><button className="rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-extrabold text-white"><Plus className="mr-1 inline h-4 w-4" /> Save airport plan</button></form>
    <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black text-slate-900">Airport plans</h3><p className="text-xs text-slate-500">Keep flight and pickup information together.</p></div><select className="rounded-lg border border-slate-200 px-3 py-2 text-xs" value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}><option value="ALL">All</option><option value="PLANNED">Planned</option><option value="READY">Ready</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></select></div>{visible.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No airport plans found.</p> : <div className="mt-4 space-y-3">{visible.map((record) => <article key={record.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap justify-between gap-3"><div><h4 className="font-extrabold text-slate-900">{record.title}</h4><p className="mt-1 text-sm text-slate-600">{record.airport} · {record.terminal || 'Terminal not set'}</p><p className="mt-1 text-xs text-slate-500">{record.airline} {record.flightNumber} · {record.direction}</p></div><span className="rounded-full bg-sky-50 px-2 py-1 text-[10px] font-black text-sky-700">{record.status}</span></div><div className="mt-3 grid gap-2 sm:grid-cols-2"><p className="text-xs text-slate-500"><Clock3 className="mr-1 inline h-3.5 w-3.5" />Flight: {new Date(record.flightAt).toLocaleString()}</p><p className="text-xs text-slate-500"><CalendarClock className="mr-1 inline h-3.5 w-3.5" />Pickup: {new Date(record.pickupAt).toLocaleString()}</p><p className="text-xs text-slate-500"><Luggage className="mr-1 inline h-3.5 w-3.5" />{record.passengers} passengers · {record.luggage.toLowerCase()} luggage</p><p className="text-xs text-slate-500">{record.origin} → {record.destination}</p></div><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => updateStatus(record, 'READY')} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Mark ready</button><button onClick={() => updateStatus(record, 'COMPLETED')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">Complete</button><button onClick={() => updateStatus(record, 'CANCELLED')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">Cancel plan</button><button onClick={() => remove(record)} className="rounded-lg p-2 text-rose-500" aria-label={`Delete ${record.title}`}><Trash2 className="h-4 w-4" /></button></div></article>)}</div>}</section>
  </div>;
};
