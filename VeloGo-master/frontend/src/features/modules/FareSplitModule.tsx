import React, { useMemo, useState } from 'react';
import { Calculator, Check, Copy, Download, Plus, ReceiptText, Trash2, Users } from 'lucide-react';
import { calculateCustomSplit, calculateEqualSplit, calculateSettlements, calculateWeightedSplit, rowsToCsv } from '../extendedFeatureAlgorithms';
import { appendExtendedRecord, createStoredRecord, downloadTextFile, readExtendedCollection, recordExtendedAudit, StoredRecord, writeExtendedCollection, formatIndianCurrency } from '../extendedFeatureStore';

interface Participant {
  id: string;
  name: string;
  weight: number;
  paid: number;
  customShare: number;
  settled: boolean;
}

interface FareSplit extends StoredRecord {
  title: string;
  currency: 'INR';
  total: number;
  tip: number;
  tax: number;
  mode: 'EQUAL' | 'WEIGHTED' | 'CUSTOM';
  participants: Participant[];
  notes: string;
  status: 'OPEN' | 'SETTLED';
}

interface Props {
  userId: string;
  onNotice: (message: string, tone?: 'success' | 'error' | 'info') => void;
}

const fieldClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';
const labelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500';

const blankParticipant = (): Participant => ({
  id: `person-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  name: '',
  weight: 1,
  paid: 0,
  customShare: 0,
  settled: false,
});

function calculateTotal(split: Pick<FareSplit, 'total' | 'tip' | 'tax'>): number {
  return Math.round((split.total + split.tip + split.tax) * 100) / 100;
}

function validateDraft(title: string, total: number, participants: Participant[]): string | null {
  if (!title.trim()) return 'Give this split a name.';
  if (!Number.isFinite(total) || total <= 0) return 'Enter a total greater than zero.';
  if (participants.length < 2) return 'Add at least two participants.';
  if (participants.some((person) => !person.name.trim())) return 'Every participant needs a name.';
  if (participants.some((person) => person.paid < 0 || person.weight <= 0)) return 'Payments cannot be negative and weights must be positive.';
  if (new Set(participants.map((person) => person.name.trim().toLowerCase())).size !== participants.length) return 'Participant names must be unique.';
  return null;
}

export const FareSplitModule: React.FC<Props> = ({ userId, onNotice }) => {
  const [records, setRecords] = useState<FareSplit[]>(() => readExtendedCollection<FareSplit>(userId, 'fare-splits'));
  const [title, setTitle] = useState('Weekend ride');
  const [baseFare, setBaseFare] = useState('240');
  const [tip, setTip] = useState('0');
  const [tax, setTax] = useState('0');
  const [mode, setMode] = useState<FareSplit['mode']>('EQUAL');
  const [notes, setNotes] = useState('');
  const [people, setPeople] = useState<Participant[]>([
    { ...blankParticipant(), name: 'Me', paid: 240 },
    { ...blankParticipant(), name: 'Friend', paid: 0 },
  ]);
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'SETTLED'>('ALL');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const total = calculateTotal({
    total: Math.max(0, Number(baseFare) || 0),
    tip: Math.max(0, Number(tip) || 0),
    tax: Math.max(0, Number(tax) || 0),
  });

  const allocation = useMemo(() => {
    if (mode === 'WEIGHTED') return calculateWeightedSplit(total, people);
    if (mode === 'CUSTOM') {
      return calculateCustomSplit(people, total);
    }
    return calculateEqualSplit(total, people);
  }, [total, people, mode]);

  const customTotal = people.reduce((sum, person) => sum + person.customShare, 0);
  const settlements = useMemo(() => calculateSettlements(allocation), [allocation]);
  const visibleRecords = records
    .filter((record) => filter === 'ALL' || record.status === filter)
    .filter((record) => `${record.title} ${record.notes}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const selected = records.find((record) => record.id === selectedId) || null;

  const refresh = () => setRecords(readExtendedCollection<FareSplit>(userId, 'fare-splits'));

  const updatePerson = (id: string, patch: Partial<Participant>) => {
    setPeople((current) => current.map((person) => person.id === id ? { ...person, ...patch } : person));
  };

  const addPerson = () => {
    if (people.length >= 12) {
      onNotice('A split can contain up to 12 people.', 'info');
      return;
    }
    setPeople((current) => [...current, blankParticipant()]);
  };

  const removePerson = (id: string) => {
    if (people.length <= 2) {
      onNotice('Keep at least two participants in the split.', 'info');
      return;
    }
    setPeople((current) => current.filter((person) => person.id !== id));
  };

  const resetForm = () => {
    setTitle('Ride split');
    setBaseFare('');
    setTip('0');
    setTax('0');
    setMode('EQUAL');
    setNotes('');
    setPeople([
      { ...blankParticipant(), name: 'Me' },
      { ...blankParticipant(), name: 'Friend' },
    ]);
  };

  const saveSplit = (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validateDraft(title, total, people);
    if (validation) {
      onNotice(validation, 'error');
      return;
    }
    if (mode === 'CUSTOM' && Math.abs(customTotal - total) > 0.01) {
      onNotice(`Custom shares must add up to ${formatIndianCurrency(total)}.`, 'error');
      return;
    }
    const record = createStoredRecord({
      title: title.trim(),
      currency: 'INR',
      total: Math.round(total * 100) / 100,
      tip: Number(tip) || 0,
      tax: Number(tax) || 0,
      mode,
      participants: people.map((person) => ({ ...person, name: person.name.trim() })),
      notes: notes.trim(),
      status: 'OPEN',
    }) as FareSplit;
    const result = appendExtendedRecord(userId, 'fare-splits', record);
    if (!result.ok) {
      onNotice(result.error || 'Could not save this split.', 'error');
      return;
    }
    recordExtendedAudit(userId, { collection: 'fare-splits', action: 'CREATE', recordId: record.id, message: `Created fare split: ${record.title}` });
    refresh();
    setSelectedId(record.id);
    resetForm();
    onNotice('Fare split saved on this device.');
  };

  const markSettled = (record: FareSplit) => {
    const next = records.map((item) => item.id === record.id
      ? { ...item, status: 'SETTLED' as const, updatedAt: new Date().toISOString(), version: item.version + 1 }
      : item);
    const result = writeExtendedCollection(userId, 'fare-splits', next);
    if (!result.ok) {
      onNotice(result.error || 'Could not update settlement status.', 'error');
      return;
    }
    recordExtendedAudit(userId, { collection: 'fare-splits', action: 'UPDATE', recordId: record.id, message: `Marked ${record.title} as settled.` });
    refresh();
    onNotice('Split marked as settled.');
  };

  const deleteSplit = (record: FareSplit) => {
    if (!window.confirm(`Delete "${record.title}"?`)) return;
    const next = records.filter((item) => item.id !== record.id);
    const result = writeExtendedCollection(userId, 'fare-splits', next);
    if (!result.ok) {
      onNotice(result.error || 'Could not delete split.', 'error');
      return;
    }
    recordExtendedAudit(userId, { collection: 'fare-splits', action: 'DELETE', recordId: record.id, message: `Deleted fare split: ${record.title}` });
    refresh();
    if (selectedId === record.id) setSelectedId(null);
    onNotice('Fare split deleted.');
  };

  const exportSplit = (record: FareSplit) => {
    const rows = record.participants.map((person) => {
      const share = record.mode === 'WEIGHTED'
        ? calculateWeightedSplit(record.total, record.participants)[record.participants.findIndex((item) => item.id === person.id)]?.share || 0
        : record.mode === 'CUSTOM'
          ? person.customShare
          : calculateEqualSplit(record.total, record.participants)[record.participants.findIndex((item) => item.id === person.id)]?.share || 0;
      return [person.name, share.toFixed(2), person.paid.toFixed(2), (person.paid - share).toFixed(2)];
    });
    const csv = rowsToCsv(['Participant', 'Share (INR)', 'Paid (INR)', 'Balance (INR)'], rows);
    downloadTextFile(`velogo-fare-split-${record.id}.csv`, csv, 'text/csv;charset=utf-8');
    onNotice('Split breakdown exported.');
  };

  const copySettlement = async (record: FareSplit) => {
    const allocations = record.mode === 'WEIGHTED'
      ? calculateWeightedSplit(record.total, record.participants)
      : record.mode === 'CUSTOM'
        ? calculateCustomSplit(record.participants, record.total)
        : calculateEqualSplit(record.total, record.participants);
    const transfers = calculateSettlements(allocations);
    const text = transfers.length
      ? transfers.map((item) => `${item.fromName} pays ${item.toName} ${formatIndianCurrency(item.amount)}`).join('\n')
      : 'Everyone is settled.';
    try {
      await navigator.clipboard.writeText(text);
      onNotice('Settlement instructions copied.');
    } catch {
      onNotice('Clipboard access is unavailable in this browser.', 'error');
    }
  };

  return <div className="space-y-6">
    <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5">
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-white p-3 text-indigo-600 shadow-sm"><Calculator className="h-5 w-5" /></span>
        <div><h3 className="text-lg font-black text-slate-900">Split a ride fare</h3><p className="text-sm text-slate-500">Work out each person's share and settle the balance fairly.</p></div>
      </div>
      <form onSubmit={saveSplit} className="mt-5 space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label><span className={labelClass}>Split name</span><input className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} placeholder="Airport ride" /></label>
          <label><span className={labelClass}>Calculation method</span><select className={fieldClass} value={mode} onChange={(event) => setMode(event.target.value as FareSplit['mode'])}><option value="EQUAL">Split equally</option><option value="WEIGHTED">Weighted shares</option><option value="CUSTOM">Custom shares</option></select></label>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <label><span className={labelClass}>Base fare (₹)</span><input className={fieldClass} type="number" min="0" step="0.01" value={baseFare} onChange={(event) => setBaseFare(event.target.value)} /></label>
          <label><span className={labelClass}>Tip (₹)</span><input className={fieldClass} type="number" min="0" step="0.01" value={tip} onChange={(event) => setTip(event.target.value)} /></label>
          <label><span className={labelClass}>Extra charges (₹)</span><input className={fieldClass} type="number" min="0" step="0.01" value={tax} onChange={(event) => setTax(event.target.value)} /></label>
        </div>
        <div className="rounded-xl bg-slate-900 p-4 text-white"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total to split</p><p className="mt-1 text-3xl font-black">{formatIndianCurrency(total)}</p><p className="mt-1 text-xs text-slate-400">Base fare + tip + extra charges</p></div>
        <div className="flex items-center justify-between"><div><h4 className="font-extrabold text-slate-900">Participants</h4><p className="text-xs text-slate-500">Record what each person has already paid.</p></div><button type="button" onClick={addPerson} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold"><Plus className="h-3.5 w-3.5" /> Add person</button></div>
        <div className="space-y-2">
          {people.map((person, index) => <div key={person.id} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[1.4fr_1fr_1fr_40px]">
            <label><span className={labelClass}>Person {index + 1}</span><input className={fieldClass} value={person.name} onChange={(event) => updatePerson(person.id, { name: event.target.value })} placeholder="Name" maxLength={50} /></label>
            <label><span className={labelClass}>Paid (₹)</span><input className={fieldClass} type="number" min="0" step="0.01" value={person.paid} onChange={(event) => updatePerson(person.id, { paid: Math.max(0, Number(event.target.value) || 0) })} /></label>
            {mode === 'WEIGHTED' && <label><span className={labelClass}>Share weight</span><input className={fieldClass} type="number" min="0.1" step="0.1" value={person.weight} onChange={(event) => updatePerson(person.id, { weight: Number(event.target.value) || 0 })} /></label>}
            {mode === 'CUSTOM' && <label><span className={labelClass}>Custom share (₹)</span><input className={fieldClass} type="number" min="0" step="0.01" value={person.customShare} onChange={(event) => updatePerson(person.id, { customShare: Number(event.target.value) || 0 })} /></label>}
            {mode === 'EQUAL' && <div className="flex items-end text-xs text-slate-400">Equal share</div>}
            <button type="button" onClick={() => removePerson(person.id)} className="mt-5 grid h-9 w-9 place-items-center rounded-lg text-rose-500 hover:bg-rose-50" aria-label={`Remove ${person.name || 'participant'}`}><Trash2 className="h-4 w-4" /></button>
          </div>)}
        </div>
        {mode === 'CUSTOM' && <p className={`text-xs font-bold ${Math.abs(customTotal - total) < 0.01 ? 'text-emerald-700' : 'text-amber-700'}`}>Custom shares: {formatIndianCurrency(customTotal)} / {formatIndianCurrency(total)}</p>}
        <label className="block"><span className={labelClass}>Notes (optional)</span><textarea className={fieldClass} rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={300} placeholder="Pickup surcharge paid by me..." /></label>
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">Preview updates as you change the amounts.</p><button className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-indigo-700">Save fare split</button></div>
      </form>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2"><Users className="h-5 w-5 text-indigo-600" /><h3 className="font-black text-slate-900">Live calculation</h3></div>
      {allocation.length === 0 ? <p className="text-sm text-slate-500">Add participants and a valid total to preview the split.</p> : <div className="space-y-2">{allocation.map((item) => <div key={item.participantId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3"><div><p className="font-bold text-slate-800">{item.participantName || 'Unnamed participant'}</p><p className="text-xs text-slate-500">Paid {formatIndianCurrency(item.paid)}</p></div><div className="text-right"><p className="font-black text-slate-900">{formatIndianCurrency(item.share)}</p><p className={`text-xs font-bold ${item.balance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{item.balance >= 0 ? 'Gets back ' : 'Owes '}{formatIndianCurrency(Math.abs(item.balance))}</p></div></div>)}</div>}
      {settlements.length > 0 && <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 p-4"><h4 className="text-sm font-extrabold text-indigo-900">Suggested settlements</h4><div className="mt-2 space-y-2">{settlements.map((transfer, index) => <p key={`${transfer.fromId}-${transfer.toId}-${index}`} className="text-sm text-indigo-900"><strong>{transfer.fromName}</strong> pays <strong>{transfer.toName}</strong> {formatIndianCurrency(transfer.amount)}</p>)}</div></div>}
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black text-slate-900">Saved splits</h3><p className="text-xs text-slate-500">Your saved calculations on this browser.</p></div><div className="flex gap-2"><select className="rounded-lg border border-slate-200 px-2 py-2 text-xs" value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}><option value="ALL">All</option><option value="OPEN">Open</option><option value="SETTLED">Settled</option></select><input className="w-36 rounded-lg border border-slate-200 px-2 py-2 text-xs" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search splits" /></div></div>
      {visibleRecords.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No saved fare splits yet.</p> : <div className="mt-4 divide-y divide-slate-100">{visibleRecords.map((record) => <article key={record.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><button onClick={() => setSelectedId(selectedId === record.id ? null : record.id)} className="min-w-0 text-left"><p className="font-bold text-slate-800">{record.title}</p><p className="text-xs text-slate-500">{record.participants.length} people · {formatIndianCurrency(record.total)} · {record.status}</p></button><div className="flex items-center gap-2"><button onClick={() => exportSplit(record)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Export split"><Download className="h-4 w-4" /></button><button onClick={() => deleteSplit(record)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50" aria-label="Delete split"><Trash2 className="h-4 w-4" /></button>{record.status === 'OPEN' && <button onClick={() => markSettled(record)} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"><Check className="mr-1 inline h-3.5 w-3.5" /> Settled</button>}</div></article>)}</div>}
      {selected && <div className="mt-3 rounded-xl bg-slate-50 p-4"><div className="flex items-center justify-between"><h4 className="font-extrabold">{selected.title}</h4><button onClick={() => copySettlement(selected)} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700"><Copy className="h-3.5 w-3.5" /> Copy settlement</button></div><p className="mt-1 text-xs text-slate-500">{selected.notes || 'No notes added.'}</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{selected.participants.map((person) => <div key={person.id} className="rounded-lg bg-white p-3 text-sm"><strong>{person.name}</strong><p className="text-xs text-slate-500">Paid {formatIndianCurrency(person.paid)}</p></div>)}</div></div>}
    </section>
    <p className="text-xs leading-5 text-slate-400"><ReceiptText className="mr-1 inline h-3.5 w-3.5" /> This is a personal expense calculator. It does not collect payments, change ride invoices or modify VeloGo wallet balances.</p>
  </div>;
};
