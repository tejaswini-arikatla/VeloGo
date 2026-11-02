import React, { useMemo, useState } from 'react';
import { ArrowDownWideNarrow, Bookmark, CarFront, Check, Download, Plus, Trash2 } from 'lucide-react';
import { rankVehicleOptions, rowsToCsv, VehicleOption } from '../extendedFeatureAlgorithms';
import { appendExtendedRecord, createStoredRecord, downloadTextFile, readExtendedCollection, recordExtendedAudit, StoredRecord, writeExtendedCollection, formatIndianCurrency } from '../extendedFeatureStore';

interface VehicleShortlist extends StoredRecord {
  title: string;
  distanceKm: number;
  options: VehicleOption[];
  selectedId: string;
  notes: string;
  priority: 'PRICE' | 'TIME' | 'COMFORT' | 'ECO';
}

interface Props { userId: string; onNotice: (message: string, tone?: 'success' | 'error' | 'info') => void; }

const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100';
const label = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500';

const starterOptions: VehicleOption[] = [
  { id: 'bike', name: 'Bike', estimatedFare: 65, estimatedMinutes: 22, capacity: 1, comfort: 3, emissionsGramsPerKm: 42, availability: 90 },
  { id: 'auto', name: 'Auto', estimatedFare: 110, estimatedMinutes: 26, capacity: 3, comfort: 3, emissionsGramsPerKm: 78, availability: 82 },
  { id: 'cab', name: 'Cab', estimatedFare: 185, estimatedMinutes: 24, capacity: 4, comfort: 5, emissionsGramsPerKm: 171, availability: 75 },
  { id: 'electric', name: 'Electric cab', estimatedFare: 205, estimatedMinutes: 25, capacity: 4, comfort: 5, emissionsGramsPerKm: 55, availability: 60 },
];

function priorityWeights(priority: VehicleShortlist['priority']) {
  if (priority === 'TIME') return { price: 1, time: 5, comfort: 1, emissions: 1 };
  if (priority === 'COMFORT') return { price: 1, time: 1, comfort: 5, emissions: 1 };
  if (priority === 'ECO') return { price: 1, time: 1, comfort: 1, emissions: 5 };
  return { price: 5, time: 1, comfort: 1, emissions: 1 };
}

function validateOptions(options: VehicleOption[]): string | null {
  if (options.length < 2) return 'Compare at least two vehicle options.';
  if (options.some((item) => !item.name.trim())) return 'Every option needs a name.';
  if (options.some((item) => item.estimatedFare < 0 || item.estimatedMinutes <= 0 || item.capacity < 1)) return 'Fare, duration and capacity must be valid positive values.';
  if (options.some((item) => item.comfort < 1 || item.comfort > 5)) return 'Comfort must be between 1 and 5.';
  if (new Set(options.map((item) => item.name.toLowerCase().trim())).size !== options.length) return 'Vehicle names must be unique.';
  return null;
}

export const VehicleCompareModule: React.FC<Props> = ({ userId, onNotice }) => {
  const [records, setRecords] = useState<VehicleShortlist[]>(() => readExtendedCollection<VehicleShortlist>(userId, 'vehicle-comparisons'));
  const [title, setTitle] = useState('Airport options');
  const [distance, setDistance] = useState('12');
  const [priority, setPriority] = useState<VehicleShortlist['priority']>('PRICE');
  const [notes, setNotes] = useState('');
  const [options, setOptions] = useState<VehicleOption[]>(starterOptions);
  const [activeId, setActiveId] = useState<string | null>(null);

  const ranked = useMemo(() => rankVehicleOptions(options, priorityWeights(priority)), [options, priority]);
  const selected = records.find((record) => record.id === activeId) || null;
  const refresh = () => setRecords(readExtendedCollection<VehicleShortlist>(userId, 'vehicle-comparisons'));

  const updateOption = (id: string, patch: Partial<VehicleOption>) => setOptions((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  const addOption = () => {
    if (options.length >= 8) return onNotice('Compare up to eight vehicle options.', 'info');
    setOptions((current) => [...current, { id: `option-${Date.now()}`, name: '', estimatedFare: 100, estimatedMinutes: 25, capacity: 2, comfort: 3, emissionsGramsPerKm: 80, availability: 50 }]);
  };
  const removeOption = (id: string) => {
    if (options.length <= 2) return onNotice('Keep at least two options.', 'info');
    setOptions((current) => current.filter((item) => item.id !== id));
  };

  const saveComparison = (event: React.FormEvent) => {
    event.preventDefault();
    const km = Number(distance);
    if (!title.trim()) return onNotice('Enter a comparison name.', 'error');
    if (!Number.isFinite(km) || km <= 0 || km > 500) return onNotice('Distance must be between 0 and 500 km.', 'error');
    const error = validateOptions(options);
    if (error) return onNotice(error, 'error');
    const winner = ranked[0];
    const record = createStoredRecord({
      title: title.trim(),
      distanceKm: km,
      options: options.map((item) => ({ ...item })),
      selectedId: winner.id,
      notes: notes.trim(),
      priority,
    }) as VehicleShortlist;
    const result = appendExtendedRecord(userId, 'vehicle-comparisons', record);
    if (!result.ok) return onNotice(result.error || 'Could not save comparison.', 'error');
    recordExtendedAudit(userId, { collection: 'vehicle-comparisons', action: 'CREATE', recordId: record.id, message: `Saved vehicle comparison: ${record.title}` });
    refresh();
    setActiveId(record.id);
    onNotice(`${winner.name} ranked first using your ${priority.toLowerCase()} priority.`);
  };

  const remove = (record: VehicleShortlist) => {
    if (!window.confirm(`Delete comparison "${record.title}"?`)) return;
    const result = writeExtendedCollection(userId, 'vehicle-comparisons', records.filter((item) => item.id !== record.id));
    if (!result.ok) return onNotice(result.error || 'Could not delete comparison.', 'error');
    refresh();
    setActiveId(null);
    onNotice('Comparison deleted.');
  };

  const exportRecord = (record: VehicleShortlist) => {
    const ranking = rankVehicleOptions(record.options, priorityWeights(record.priority));
    const csv = rowsToCsv(
      ['Rank', 'Vehicle', 'Estimated fare INR', 'Duration minutes', 'Capacity', 'Comfort', 'Emissions g/km', 'Score'],
      ranking.map((item) => [item.rank, item.name, item.estimatedFare, item.estimatedMinutes, item.capacity, item.comfort, item.emissionsGramsPerKm, item.score]),
    );
    downloadTextFile(`velogo-vehicle-comparison-${record.id}.csv`, csv, 'text/csv;charset=utf-8');
    onNotice('Vehicle comparison exported.');
  };

  return <div className="space-y-6">
    <section className="rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-white p-5">
      <div className="flex items-center gap-3"><span className="rounded-xl bg-white p-3 text-cyan-700 shadow-sm"><CarFront className="h-6 w-6" /></span><div><h3 className="text-lg font-black text-slate-900">Vehicle comparison workspace</h3><p className="text-sm text-slate-500">Compare options by price, time, comfort and estimated emissions.</p></div></div>
      <p className="mt-4 rounded-xl border border-cyan-100 bg-white p-3 text-xs leading-5 text-cyan-900">Enter estimates from your own research. This tool does not fetch live availability, traffic, fares or vehicle capacity.</p>
    </section>

    <form onSubmit={saveComparison} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="grid gap-3 md:grid-cols-3"><label><span className={label}>Comparison name</span><input className={field} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} /></label><label><span className={label}>Distance (km)</span><input className={field} type="number" min="0.1" max="500" step="0.1" value={distance} onChange={(event) => setDistance(event.target.value)} /></label><label><span className={label}>Main priority</span><select className={field} value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)}><option value="PRICE">Lowest price</option><option value="TIME">Fastest journey</option><option value="COMFORT">Comfort</option><option value="ECO">Lower emissions</option></select></label></div>
      <div className="flex items-center justify-between"><div><h4 className="font-extrabold text-slate-900">Vehicle options</h4><p className="text-xs text-slate-500">Edit the sample estimates or add another option.</p></div><button type="button" onClick={addOption} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold"><Plus className="h-3.5 w-3.5" /> Add option</button></div>
      <div className="space-y-3">{options.map((item) => <div key={item.id} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-4"><label><span className={label}>Vehicle</span><input className={field} value={item.name} onChange={(event) => updateOption(item.id, { name: event.target.value })} maxLength={40} /></label><label><span className={label}>Fare (₹)</span><input className={field} type="number" min="0" step="1" value={item.estimatedFare} onChange={(event) => updateOption(item.id, { estimatedFare: Number(event.target.value) || 0 })} /></label><label><span className={label}>Minutes</span><input className={field} type="number" min="1" value={item.estimatedMinutes} onChange={(event) => updateOption(item.id, { estimatedMinutes: Number(event.target.value) || 1 })} /></label><div className="flex items-end justify-between gap-2"><label className="flex-1"><span className={label}>Comfort (1–5)</span><input className={field} type="number" min="1" max="5" value={item.comfort} onChange={(event) => updateOption(item.id, { comfort: Number(event.target.value) || 1 })} /></label><button type="button" onClick={() => removeOption(item.id)} className="mb-1 rounded-lg p-2 text-rose-500 hover:bg-rose-50" aria-label={`Remove ${item.name}`}><Trash2 className="h-4 w-4" /></button></div><label><span className={label}>Capacity</span><input className={field} type="number" min="1" max="20" value={item.capacity} onChange={(event) => updateOption(item.id, { capacity: Number(event.target.value) || 1 })} /></label><label><span className={label}>Emissions (g/km)</span><input className={field} type="number" min="0" value={item.emissionsGramsPerKm} onChange={(event) => updateOption(item.id, { emissionsGramsPerKm: Number(event.target.value) || 0 })} /></label><label><span className={label}>Availability estimate (%)</span><input className={field} type="number" min="0" max="100" value={item.availability} onChange={(event) => updateOption(item.id, { availability: Number(event.target.value) || 0 })} /></label></div>)}</div>
      <label><span className={label}>Notes</span><textarea className={field} rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={300} /></label>
      <button className="rounded-xl bg-cyan-700 px-5 py-2.5 text-sm font-extrabold text-white">Save comparison</button>
    </form>

    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2"><ArrowDownWideNarrow className="h-5 w-5 text-cyan-700" /><h3 className="font-black text-slate-900">Live ranking</h3></div>
      <div className="mt-4 space-y-2">{ranked.map((item) => <div key={item.id} className={`grid grid-cols-[36px_1fr_auto] items-center gap-3 rounded-xl p-3 ${item.rank === 1 ? 'border border-emerald-200 bg-emerald-50' : 'bg-slate-50'}`}><span className="grid h-8 w-8 place-items-center rounded-full bg-white text-xs font-black text-slate-600">{item.rank}</span><div><p className="font-extrabold text-slate-900">{item.name || 'Unnamed option'} {item.rank === 1 && <span className="ml-1 text-[10px] text-emerald-700">BEST MATCH</span>}</p><p className="text-xs text-slate-500">{formatIndianCurrency(item.estimatedFare)} · {item.estimatedMinutes} min · comfort {item.comfort}/5</p></div><p className="text-lg font-black text-slate-900">{item.score.toFixed(1)}</p></div>)}</div>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="font-black text-slate-900">Saved comparisons</h3>
      {records.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">No comparisons saved yet.</p> : <div className="mt-3 divide-y divide-slate-100">{records.map((record) => <div key={record.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><button onClick={() => setActiveId(activeId === record.id ? null : record.id)} className="text-left"><p className="font-bold text-slate-800">{record.title}</p><p className="text-xs text-slate-500">{record.options.length} options · {record.distanceKm} km · priority {record.priority.toLowerCase()}</p></button><div className="flex gap-2"><button onClick={() => exportRecord(record)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Export comparison"><Download className="h-4 w-4" /></button><button onClick={() => remove(record)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50" aria-label="Delete comparison"><Trash2 className="h-4 w-4" /></button></div></div>)}</div>}
      {selected && <div className="mt-3 rounded-xl bg-slate-50 p-3"><p className="text-sm font-extrabold">{selected.title}</p><p className="text-xs text-slate-500">Recommended option: {selected.options.find((item) => item.id === selected.selectedId)?.name || 'Not available'}</p><p className="mt-2 text-xs text-slate-500">{selected.notes || 'No notes saved.'}</p></div>}
    </section>
  </div>;
};
