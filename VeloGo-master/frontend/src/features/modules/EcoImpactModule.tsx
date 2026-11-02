import React, { useMemo, useState } from 'react';
import { Leaf, Plus, Trash2, TrendingDown, Trophy, Download } from 'lucide-react';
import { ECO_FACTORS, estimateAvoidedEmissions, estimateTripEmissions, groupByMonth, rowsToCsv } from '../extendedFeatureAlgorithms';
import { appendExtendedRecord, createStoredRecord, downloadTextFile, readExtendedCollection, recordExtendedAudit, StoredRecord, writeExtendedCollection } from '../extendedFeatureStore';

interface EcoJourney extends StoredRecord {
  label: string;
  date: string;
  distanceKm: number;
  vehicle: string;
  passengers: number;
  shared: boolean;
  notes: string;
  grams: number;
  avoidedGrams: number;
}

interface Props { userId: string; onNotice: (message: string, tone?: 'success' | 'error' | 'info') => void; }

const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100';
const label = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500';
const dateToday = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
const kg = (grams: number) => `${(grams / 1000).toFixed(2)} kg`;

function ecoScore(records: EcoJourney[]): number {
  const distance = records.reduce((sum, item) => sum + item.distanceKm, 0);
  const avoided = records.reduce((sum, item) => sum + item.avoidedGrams, 0);
  if (!distance) return 0;
  return Math.min(100, Math.round((avoided / (distance * 171)) * 100));
}

function monthlyAvoided(records: EcoJourney[]) {
  const map = new Map<string, number>();
  records.forEach((record) => {
    const month = record.date.slice(0, 7);
    map.set(month, (map.get(month) || 0) + record.avoidedGrams);
  });
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, grams]) => ({ month, grams }));
}

export const EcoImpactModule: React.FC<Props> = ({ userId, onNotice }) => {
  const [records, setRecords] = useState<EcoJourney[]>(() => readExtendedCollection<EcoJourney>(userId, 'eco-journeys'));
  const [labelText, setLabelText] = useState('Daily commute');
  const [date, setDate] = useState(dateToday());
  const [distance, setDistance] = useState('8');
  const [vehicle, setVehicle] = useState('PUBLIC');
  const [passengers, setPassengers] = useState('1');
  const [shared, setShared] = useState(true);
  const [notes, setNotes] = useState('');
  const [range, setRange] = useState<'ALL' | '30' | '90' | 'YEAR'>('ALL');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const cutoff = new Date();
    if (range === '30') cutoff.setDate(cutoff.getDate() - 30);
    if (range === '90') cutoff.setDate(cutoff.getDate() - 90);
    if (range === 'YEAR') cutoff.setMonth(0, 1);
    return records.filter((record) => (range === 'ALL' || new Date(`${record.date}T00:00:00`) >= cutoff))
      .filter((record) => `${record.label} ${record.vehicle} ${record.notes}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [records, range, query]);

  const totalDistance = filtered.reduce((sum, item) => sum + item.distanceKm, 0);
  const totalEmissions = filtered.reduce((sum, item) => sum + item.grams, 0);
  const totalAvoided = filtered.reduce((sum, item) => sum + item.avoidedGrams, 0);
  const score = ecoScore(filtered);
  const monthData = monthlyAvoided(filtered);
  const months = groupByMonth(filtered, (item) => item.date);

  const refresh = () => setRecords(readExtendedCollection<EcoJourney>(userId, 'eco-journeys'));

  const saveJourney = (event: React.FormEvent) => {
    event.preventDefault();
    const km = Number(distance);
    const passengerCount = Number(passengers);
    if (!labelText.trim()) return onNotice('Enter a journey name.', 'error');
    if (!date || Number.isNaN(new Date(`${date}T00:00:00`).getTime())) return onNotice('Choose a valid journey date.', 'error');
    if (!Number.isFinite(km) || km <= 0 || km > 2000) return onNotice('Distance must be between 0 and 2,000 km.', 'error');
    if (!Number.isInteger(passengerCount) || passengerCount < 1 || passengerCount > 8) return onNotice('Passenger count must be between 1 and 8.', 'error');
    const perPassengerDistance = shared ? km / passengerCount : km;
    const grams = estimateTripEmissions(perPassengerDistance, vehicle);
    const avoidedGrams = estimateAvoidedEmissions(perPassengerDistance, vehicle);
    const record = createStoredRecord({
      label: labelText.trim(),
      date,
      distanceKm: km,
      vehicle,
      passengers: passengerCount,
      shared,
      notes: notes.trim(),
      grams,
      avoidedGrams,
    }) as EcoJourney;
    const result = appendExtendedRecord(userId, 'eco-journeys', record);
    if (!result.ok) return onNotice(result.error || 'Could not save journey.', 'error');
    recordExtendedAudit(userId, { collection: 'eco-journeys', action: 'CREATE', recordId: record.id, message: `Recorded eco journey: ${record.label}` });
    refresh();
    setLabelText(''); setDistance(''); setNotes('');
    onNotice('Journey added to your environmental impact log.');
  };

  const deleteJourney = (record: EcoJourney) => {
    if (!window.confirm(`Remove "${record.label}" from your impact log?`)) return;
    const next = records.filter((item) => item.id !== record.id);
    const result = writeExtendedCollection(userId, 'eco-journeys', next);
    if (!result.ok) return onNotice(result.error || 'Could not remove journey.', 'error');
    recordExtendedAudit(userId, { collection: 'eco-journeys', action: 'DELETE', recordId: record.id, message: `Removed eco journey: ${record.label}` });
    refresh();
    onNotice('Journey removed.');
  };

  const exportData = () => {
    const csv = rowsToCsv(
      ['Journey', 'Date', 'Distance km', 'Vehicle', 'Passengers', 'Estimated emissions g', 'Estimated avoided g'],
      filtered.map((item) => [item.label, item.date, item.distanceKm, item.vehicle, item.passengers, item.grams, item.avoidedGrams]),
    );
    downloadTextFile('velogo-eco-impact.csv', csv, 'text/csv;charset=utf-8');
    onNotice('Environmental impact report exported.');
  };

  return <div className="space-y-6">
    <section className="rounded-2xl bg-gradient-to-br from-emerald-950 to-teal-800 p-6 text-white">
      <div className="flex items-center gap-3"><span className="rounded-xl bg-white/10 p-3"><Leaf className="h-6 w-6" /></span><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-200">VeloGo greener journeys</p><h3 className="text-2xl font-black">Your travel footprint</h3></div></div>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Logged distance" value={`${totalDistance.toFixed(1)} km`} />
        <Metric label="Estimated emissions" value={kg(totalEmissions)} />
        <Metric label="Estimated avoided" value={kg(totalAvoided)} />
        <Metric label="Eco score" value={`${score}/100`} />
      </div>
      <p className="mt-4 text-xs leading-5 text-emerald-100">Estimates use illustrative average emission factors. They are not measured vehicle emissions or an audited carbon report.</p>
    </section>

    <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <form onSubmit={saveJourney} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div><h3 className="font-black text-slate-900">Log a journey</h3><p className="text-xs text-slate-500">Record a trip to understand its estimated impact.</p></div>
        <label><span className={label}>Journey name</span><input className={field} value={labelText} onChange={(event) => setLabelText(event.target.value)} maxLength={70} placeholder="Office commute" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label><span className={label}>Date</span><input className={field} type="date" value={date} onChange={(event) => setDate(event.target.value)} max={dateToday()} /></label>
          <label><span className={label}>Distance (km)</span><input className={field} type="number" min="0.1" max="2000" step="0.1" value={distance} onChange={(event) => setDistance(event.target.value)} /></label>
        </div>
        <label><span className={label}>Travel mode</span><select className={field} value={vehicle} onChange={(event) => setVehicle(event.target.value)}>{ECO_FACTORS.map((factor) => <option key={factor.vehicle} value={factor.vehicle}>{factor.label}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-3">
          <label><span className={label}>Passengers</span><input className={field} type="number" min="1" max="8" value={passengers} onChange={(event) => setPassengers(event.target.value)} /></label>
          <label className="flex items-center gap-2 pt-6 text-sm font-semibold text-slate-700"><input type="checkbox" checked={shared} onChange={(event) => setShared(event.target.checked)} /> Share emissions per passenger</label>
        </div>
        <label><span className={label}>Notes</span><textarea className={field} rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={240} placeholder="Optional context" /></label>
        <button className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-emerald-800"><Plus className="h-4 w-4" /> Add journey</button>
      </form>
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between"><div><h3 className="font-black text-slate-900">Monthly progress</h3><p className="text-xs text-slate-500">Estimated avoided emissions.</p></div><Trophy className="h-5 w-5 text-amber-500" /></div>
        {monthData.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">Add journeys to see your monthly progress.</p> : <div className="space-y-3">{monthData.slice(-6).map((item) => { const max = Math.max(1, ...monthData.map((row) => row.grams)); return <div key={item.month}><div className="mb-1 flex justify-between text-xs"><span className="font-bold text-slate-600">{item.month}</span><span className="text-slate-500">{kg(item.grams)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, item.grams / max * 100)}%` }} /></div></div>; })}</div>}
        <div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Eco milestone</p><p className="mt-1 text-xl font-black text-emerald-950">{totalAvoided >= 10000 ? '10 kg avoided' : totalAvoided >= 5000 ? '5 kg avoided' : totalAvoided >= 1000 ? '1 kg avoided' : 'Your first kilogram awaits'}</p><p className="mt-1 text-xs text-emerald-800">Keep logging journeys to see how travel choices add up.</p></div>
        <div className="flex items-center gap-2 text-xs text-slate-500"><TrendingDown className="h-4 w-4 text-emerald-600" /> {months.reduce((sum, item) => sum + item.count, 0)} journeys recorded in this view.</div>
      </div>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black text-slate-900">Journey history</h3><p className="text-xs text-slate-500">Filter and export your local records.</p></div><div className="flex gap-2"><select className="rounded-lg border border-slate-200 px-2 py-2 text-xs" value={range} onChange={(event) => setRange(event.target.value as typeof range)}><option value="ALL">All time</option><option value="30">30 days</option><option value="90">90 days</option><option value="YEAR">This year</option></select><input className="w-36 rounded-lg border border-slate-200 px-2 py-2 text-xs" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search journeys" /><button onClick={exportData} className="rounded-lg border border-slate-200 p-2 text-slate-600" aria-label="Export eco report"><Download className="h-4 w-4" /></button></div></div>
      {filtered.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No journeys match this filter.</p> : <div className="mt-4 divide-y divide-slate-100">{filtered.map((record) => <article key={record.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-bold text-slate-800">{record.label}</p><p className="text-xs text-slate-500">{record.date} · {record.distanceKm} km · {ECO_FACTORS.find((item) => item.vehicle === record.vehicle)?.label || record.vehicle}</p></div><div className="flex items-center gap-3"><div className="text-right"><p className="text-sm font-black text-slate-900">{kg(record.grams)}</p><p className="text-[10px] text-emerald-700">−{kg(record.avoidedGrams)} vs baseline</p></div><button onClick={() => deleteJourney(record)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50" aria-label={`Delete ${record.label}`}><Trash2 className="h-4 w-4" /></button></div></article>)}</div>}
    </section>
  </div>;
};

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => <div className="rounded-xl border border-white/10 bg-white/10 p-3"><p className="text-[11px] text-emerald-100">{label}</p><p className="mt-1 text-xl font-black">{value}</p></div>;
