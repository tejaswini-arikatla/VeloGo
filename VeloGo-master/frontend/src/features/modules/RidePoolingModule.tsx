import React, { useMemo, useState } from 'react';
import { ArrowLeftRight, CalendarClock, Handshake, Search, Users, XCircle } from 'lucide-react';
import { createFeatureRecord, PoolInterest, PoolRequest, VehicleChoice } from '../featureModels';
import { appendRecord, readCollection, recordAudit, updateCollection } from '../featureStorage';
import { findPoolMatches } from '../featureAlgorithms';
import { firstIssue, formatDateTime, getLocalDateTimeInputValue, getVehicleLabel, validatePoolRequest } from '../featureValidation';

interface Props { userId: string; userName: string; onNotice: (message: string, tone?: 'success' | 'error' | 'info') => void; }
const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100';
type PoolForm = { origin: string; destination: string; departureAt: string; seatsRequested: number; vehicle: VehicleChoice; contributionLimit: string; note: string };
const initialForm = (): PoolForm => ({ origin: '', destination: '', departureAt: getLocalDateTimeInputValue(new Date(Date.now() + 2 * 60 * 60_000)), seatsRequested: 1, vehicle: 'AUTO', contributionLimit: '', note: '' });

export const RidePoolingModule: React.FC<Props> = ({ userId, userName, onNotice }) => {
  const [requests, setRequests] = useState(() => readCollection(userId, 'poolRequests'));
  const [interests, setInterests] = useState(() => readCollection(userId, 'poolInterests'));
  const [form, setForm] = useState<PoolForm>(initialForm);
  const [search, setSearch] = useState('');
  const [showMine, setShowMine] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visibleRequests = useMemo(() => requests
    .filter((request) => request.status === 'OPEN' || request.status === 'REQUESTED' || request.status === 'MATCHED')
    .filter((request) => !showMine || request.ownerId === userId)
    .filter((request) => `${request.origin} ${request.destination} ${request.ownerName}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.departureAt.localeCompare(b.departureAt)), [requests, showMine, search, userId]);

  const matches = useMemo(() => {
    const own = requests.filter((request) => request.ownerId === userId && request.status === 'OPEN');
    return own.flatMap((request) => findPoolMatches(request, requests).map((match) => ({ owner: request, candidate: match.request, score: match.score })));
  }, [requests, userId]);

  const setValue = <K extends keyof PoolForm>(key: K, value: PoolForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const refresh = () => { setRequests(readCollection(userId, 'poolRequests')); setInterests(readCollection(userId, 'poolInterests')); };

  const createRequest = (event: React.FormEvent) => {
    event.preventDefault();
    const candidate = {
      origin: form.origin,
      destination: form.destination,
      departureAt: new Date(form.departureAt).toISOString(),
      seatsRequested: Number(form.seatsRequested),
      seatsAvailable: Number(form.seatsRequested),
      vehicle: form.vehicle,
      contributionLimit: form.contributionLimit ? Number(form.contributionLimit) : 0,
      note: form.note.trim(),
      status: 'OPEN' as const,
      ownerName: userName,
      ownerId: userId,
    };
    const validation = validatePoolRequest(candidate);
    if (!validation.valid) { onNotice(firstIssue(validation) || 'Review your ride details.', 'error'); return; }
    const request = createFeatureRecord(candidate) as PoolRequest;
    appendRecord(userId, 'poolRequests', request);
    recordAudit(userId, 'pooling', 'CREATED', 'Published a ride-pooling request.', request.id);
    setForm(initialForm()); refresh(); onNotice('Your pooling request is visible in this browser.');
  };

  const requestToJoin = (request: PoolRequest) => {
    if (request.ownerId === userId) { onNotice('You cannot join your own request.', 'error'); return; }
    if (interests.some((interest) => interest.poolRequestId === request.id && interest.passengerId === userId && interest.status !== 'WITHDRAWN')) {
      onNotice('You have already requested to join this ride.', 'info'); return;
    }
    const interest = createFeatureRecord({
      poolRequestId: request.id,
      passengerId: userId,
      passengerName: userName,
      seats: 1,
      note: 'I am interested in sharing this ride.',
      status: 'PENDING' as const,
    }) as PoolInterest;
    appendRecord(userId, 'poolInterests', interest);
    recordAudit(userId, 'pooling', 'JOIN_REQUESTED', 'Requested to join a shared ride.', request.id);
    refresh(); onNotice('Your interest has been saved locally.');
  };

  const cancelRequest = (request: PoolRequest) => {
    if (!window.confirm('Cancel this pooling request?')) return;
    updateCollection(userId, 'poolRequests', (items) => items.map((item) => item.id === request.id
      ? { ...item, status: 'CANCELLED', updatedAt: new Date().toISOString(), version: item.version + 1 }
      : item));
    refresh(); onNotice('Pooling request cancelled.');
  };

  const selected = requests.find((request) => request.id === selectedId) || null;
  const selectedInterests = selected ? interests.filter((interest) => interest.poolRequestId === selected.id) : [];
  const acceptInterest = (interest: PoolInterest) => {
    updateCollection(userId, 'poolInterests', (items) => items.map((item) => item.id === interest.id ? { ...item, status: 'ACCEPTED', updatedAt: new Date().toISOString(), version: item.version + 1 } : item));
    updateCollection(userId, 'poolRequests', (items) => items.map((item) => item.id === interest.poolRequestId ? { ...item, seatsAvailable: Math.max(0, item.seatsAvailable - interest.seats), status: item.seatsAvailable <= interest.seats ? 'MATCHED' : 'REQUESTED', updatedAt: new Date().toISOString(), version: item.version + 1 } : item));
    refresh(); onNotice('Interest marked as accepted in this browser.');
  };
  const declineInterest = (interest: PoolInterest) => {
    updateCollection(userId, 'poolInterests', (items) => items.map((item) => item.id === interest.id ? { ...item, status: 'DECLINED', updatedAt: new Date().toISOString(), version: item.version + 1 } : item));
    refresh(); onNotice('Interest declined.');
  };

  return <section className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-3"><Summary label="Open requests" value={requests.filter((item) => item.status === 'OPEN').length} /><Summary label="Possible matches" value={matches.length} /><Summary label="Join requests" value={interests.filter((item) => item.status === 'PENDING').length} /></div>
    <div><h2 className="text-xl font-black text-slate-900">Ride pooling</h2><p className="mt-1 text-sm text-slate-500">Share a commute plan with people travelling in a similar direction.</p></div>
    <form onSubmit={createRequest} className="grid gap-3 rounded-2xl border border-violet-100 bg-violet-50/50 p-5 sm:grid-cols-2">
      <div className="sm:col-span-2"><h3 className="font-extrabold text-slate-900">Publish your commute</h3><p className="text-xs text-slate-500">This is an interest board prototype. It does not match or dispatch real passengers.</p></div>
      <Field label="Starting point"><input className={field} value={form.origin} onChange={(event) => setValue('origin', event.target.value)} placeholder="Area or landmark" /></Field>
      <Field label="Destination"><input className={field} value={form.destination} onChange={(event) => setValue('destination', event.target.value)} placeholder="Area or landmark" /></Field>
      <Field label="Departure"><input className={field} type="datetime-local" min={getLocalDateTimeInputValue()} value={form.departureAt} onChange={(event) => setValue('departureAt', event.target.value)} /></Field>
      <Field label="Vehicle"><select className={field} value={form.vehicle} onChange={(event) => setValue('vehicle', event.target.value as VehicleChoice)}><option value="BIKE">Bike taxi</option><option value="AUTO">Auto</option><option value="CAB">Cab</option><option value="WOMEN_BIKE">Women-only bike</option></select></Field>
      <Field label="Seats you need"><input className={field} type="number" min="1" max="5" value={form.seatsRequested} onChange={(event) => setValue('seatsRequested', Number(event.target.value))} /></Field>
      <Field label="Maximum contribution (₹)"><input className={field} type="number" min="0" value={form.contributionLimit} onChange={(event) => setValue('contributionLimit', event.target.value)} placeholder="Optional" /></Field>
      <div className="sm:col-span-2"><Field label="Additional details"><input className={field} value={form.note} onChange={(event) => setValue('note', event.target.value)} placeholder="Flexible departure? Luggage?" /></Field></div>
      <div className="flex justify-end sm:col-span-2"><button className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700">Publish request</button></div>
    </form>
    <div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input className={`${field} pl-9`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search routes or people" /></div><button onClick={() => setShowMine((value) => !value)} className={`rounded-xl px-4 py-2 text-sm font-bold ${showMine ? 'bg-violet-600 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>{showMine ? 'Showing my requests' : 'Show my requests'}</button></div>
    {visibleRequests.length === 0 ? <EmptyState /> : <div className="grid gap-3">{visibleRequests.map((request) => <article key={request.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-extrabold text-slate-900">{request.origin} <span className="text-violet-500">→</span> {request.destination}</p><p className="mt-1 text-xs text-slate-500">{formatDateTime(request.departureAt)} · {getVehicleLabel(request.vehicle)} · {request.seatsAvailable} seat(s) available</p><p className="mt-2 text-xs text-slate-500">Posted by {request.ownerName}{request.ownerId === userId ? ' (you)' : ''}</p>{request.note && <p className="mt-2 text-sm text-slate-600">{request.note}</p>}</div><span className="rounded-full bg-violet-50 px-3 py-1 text-[10px] font-black text-violet-700">{request.status}</span></div><div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-3"><span className="text-xs text-slate-500">Contribution limit: {request.contributionLimit ? `₹${request.contributionLimit}` : 'Not specified'}</span><div className="flex gap-2">{request.ownerId === userId ? <><button onClick={() => setSelectedId(request.id)} className="rounded-lg border border-violet-200 px-3 py-1.5 text-xs font-bold text-violet-700">View interests</button>{request.status === 'OPEN' && <button onClick={() => cancelRequest(request)} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600">Cancel</button>}</> : <button onClick={() => requestToJoin(request)} className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white">Request to join</button>}</div></div></article>)}</div>}
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"><div className="flex justify-between"><h3 className="font-black">Join requests</h3><button onClick={() => setSelectedId(null)}><XCircle className="h-5 w-5 text-slate-400" /></button></div><p className="mt-1 text-xs text-slate-500">{selected.origin} → {selected.destination}</p>{selectedInterests.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No one has requested to join yet.</p> : <div className="mt-4 space-y-2">{selectedInterests.map((interest) => <div key={interest.id} className="rounded-xl border p-3"><div className="flex justify-between"><strong className="text-sm">{interest.passengerName}</strong><span className="text-[10px] font-bold text-slate-500">{interest.status}</span></div><p className="mt-1 text-xs text-slate-500">{interest.seats} seat(s) · {interest.note}</p>{interest.status === 'PENDING' && <div className="mt-2 flex gap-2"><button onClick={() => acceptInterest(interest)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">Accept</button><button onClick={() => declineInterest(interest)} className="rounded-lg border px-3 py-1.5 text-xs font-bold">Decline</button></div>}</div>)}</div>}</div></div>}
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><strong>Safety:</strong> Do not share sensitive information or send money to unknown users. Real-time matching, identity checks, payments and server-side messaging are not implemented in this prototype.</div>
  </section>;
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase text-slate-500">{label}</span>{children}</label>;
const Summary: React.FC<{ label: string; value: number }> = ({ label, value }) => <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-2 text-violet-600"><Users className="h-4 w-4" /><span className="text-xs font-bold text-slate-500">{label}</span></div><p className="mt-1 text-2xl font-black text-slate-900">{value}</p></div>;
const EmptyState: React.FC = () => <div className="rounded-2xl border border-dashed border-slate-300 p-9 text-center"><Handshake className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-2 font-bold text-slate-700">No matching ride requests</p><p className="mt-1 text-sm text-slate-500">Try another search or publish your own commute.</p></div>;
