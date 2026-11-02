import React, { useMemo, useState } from 'react';
import { Download, FileText, Filter, Plus, Search, Star, Trash2 } from 'lucide-react';
import { appendExtendedRecord, createStoredRecord, downloadTextFile, formatIndianCurrency, readExtendedCollection, recordExtendedAudit, StoredRecord, writeExtendedCollection } from '../extendedFeatureStore';
import { rowsToCsv } from '../extendedFeatureAlgorithms';

interface ReceiptNote extends StoredRecord {
  reference: string;
  rideDate: string;
  route: string;
  vehicle: string;
  amount: number;
  paymentLabel: string;
  purpose: string;
  note: string;
  tags: string[];
  favorite: boolean;
}

interface Props { userId: string; onNotice: (message: string, tone?: 'success' | 'error' | 'info') => void; }

const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';
const label = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500';
const today = () => new Date().toISOString().slice(0, 10);

function validateReceipt(input: Omit<ReceiptNote, keyof StoredRecord>): string | null {
  if (!input.reference.trim()) return 'Enter a reference label.';
  if (!input.rideDate || Number.isNaN(new Date(`${input.rideDate}T00:00:00`).getTime())) return 'Choose a valid date.';
  if (!input.route.trim()) return 'Enter the route.';
  if (!Number.isFinite(input.amount) || input.amount < 0) return 'Enter a valid amount.';
  if (input.note.length > 400) return 'Notes must be 400 characters or fewer.';
  return null;
}

function receiptText(record: ReceiptNote): string {
  return [
    'VELOGO PERSONAL TRAVEL RECORD',
    '--------------------------------',
    `Reference: ${record.reference}`,
    `Date: ${record.rideDate}`,
    `Route: ${record.route}`,
    `Vehicle: ${record.vehicle}`,
    `Amount recorded: ${formatIndianCurrency(record.amount)}`,
    `Payment label: ${record.paymentLabel || 'Not specified'}`,
    `Purpose: ${record.purpose || 'Not specified'}`,
    `Notes: ${record.note || 'None'}`,
    '',
    'This is a personal record created by the customer. It is not an official VeloGo tax invoice or proof of payment.',
  ].join('\n');
}

export const ReceiptVaultModule: React.FC<Props> = ({ userId, onNotice }) => {
  const [records, setRecords] = useState<ReceiptNote[]>(() => readExtendedCollection<ReceiptNote>(userId, 'receipt-notes'));
  const [reference, setReference] = useState('');
  const [rideDate, setRideDate] = useState(today());
  const [route, setRoute] = useState('');
  const [vehicle, setVehicle] = useState('BIKE');
  const [amount, setAmount] = useState('');
  const [paymentLabel, setPaymentLabel] = useState('UPI');
  const [purpose, setPurpose] = useState('Personal');
  const [note, setNote] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [query, setQuery] = useState('');
  const [range, setRange] = useState<'ALL' | '30' | '90' | 'YEAR'>('ALL');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const visible = useMemo(() => {
    const cutoff = new Date();
    if (range === '30') cutoff.setDate(cutoff.getDate() - 30);
    if (range === '90') cutoff.setDate(cutoff.getDate() - 90);
    if (range === 'YEAR') cutoff.setMonth(0, 1);
    return records.filter((item) => range === 'ALL' || new Date(`${item.rideDate}T00:00:00`) >= cutoff)
      .filter((item) => !favoritesOnly || item.favorite)
      .filter((item) => `${item.reference} ${item.route} ${item.purpose} ${item.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => b.rideDate.localeCompare(a.rideDate));
  }, [records, range, favoritesOnly, query]);

  const total = visible.reduce((sum, item) => sum + item.amount, 0);
  const favoriteCount = records.filter((item) => item.favorite).length;
  const refresh = () => setRecords(readExtendedCollection<ReceiptNote>(userId, 'receipt-notes'));

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    const candidate = {
      reference, rideDate, route, vehicle, amount: Number(amount), paymentLabel, purpose,
      note: note.trim(),
      tags: tagsText.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 8),
      favorite: false,
    };
    const error = validateReceipt(candidate);
    if (error) return onNotice(error, 'error');
    const record = createStoredRecord(candidate) as ReceiptNote;
    const result = appendExtendedRecord(userId, 'receipt-notes', record);
    if (!result.ok) return onNotice(result.error || 'Could not save record.', 'error');
    recordExtendedAudit(userId, { collection: 'receipt-notes', action: 'CREATE', recordId: record.id, message: `Saved personal travel record: ${record.reference}` });
    refresh();
    setReference(''); setRoute(''); setAmount(''); setNote(''); setTagsText('');
    onNotice('Personal travel record saved.');
  };

  const toggleFavorite = (record: ReceiptNote) => {
    const next = records.map((item) => item.id === record.id
      ? { ...item, favorite: !item.favorite, updatedAt: new Date().toISOString(), version: item.version + 1 }
      : item);
    const result = writeExtendedCollection(userId, 'receipt-notes', next);
    if (!result.ok) return onNotice(result.error || 'Could not update favorite.', 'error');
    refresh();
  };

  const remove = (record: ReceiptNote) => {
    if (!window.confirm(`Delete travel record "${record.reference}"?`)) return;
    const result = writeExtendedCollection(userId, 'receipt-notes', records.filter((item) => item.id !== record.id));
    if (!result.ok) return onNotice(result.error || 'Could not delete record.', 'error');
    recordExtendedAudit(userId, { collection: 'receipt-notes', action: 'DELETE', recordId: record.id, message: `Deleted personal travel record: ${record.reference}` });
    refresh();
    onNotice('Travel record deleted.');
  };

  const downloadRecord = (record: ReceiptNote) => {
    downloadTextFile(`velogo-personal-record-${record.id}.txt`, receiptText(record));
    onNotice('Personal travel record downloaded.');
  };

  const exportCsv = () => {
    const csv = rowsToCsv(
      ['Reference', 'Date', 'Route', 'Vehicle', 'Amount INR', 'Payment label', 'Purpose', 'Tags', 'Notes'],
      visible.map((item) => [item.reference, item.rideDate, item.route, item.vehicle, item.amount, item.paymentLabel, item.purpose, item.tags.join('; '), item.note]),
    );
    downloadTextFile('velogo-personal-travel-records.csv', csv, 'text/csv;charset=utf-8');
    onNotice('Travel records exported.');
  };

  return <div className="space-y-6">
    <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5">
      <div className="flex items-center gap-3"><span className="rounded-xl bg-white p-3 text-indigo-700 shadow-sm"><FileText className="h-6 w-6" /></span><div><h3 className="text-lg font-black text-slate-900">Personal travel record vault</h3><p className="text-sm text-slate-500">Keep searchable notes about trips and expenses in one place.</p></div></div>
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3"><Summary label="Records" value={String(records.length)} /><Summary label="Favorites" value={String(favoriteCount)} /><Summary label="Total in current view" value={formatIndianCurrency(total)} /></div>
    </section>

    <form onSubmit={save} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div><h3 className="font-black text-slate-900">Add a travel record</h3><p className="text-xs text-slate-500">Enter details from your own records. Amounts are not verified against payments.</p></div>
      <div className="grid gap-3 md:grid-cols-2">
        <label><span className={label}>Reference label</span><input className={field} value={reference} onChange={(event) => setReference(event.target.value)} maxLength={80} placeholder="Airport trip - November" /></label>
        <label><span className={label}>Trip date</span><input className={field} type="date" value={rideDate} onChange={(event) => setRideDate(event.target.value)} max={today()} /></label>
        <label><span className={label}>Route</span><input className={field} value={route} onChange={(event) => setRoute(event.target.value)} maxLength={180} placeholder="Home to airport" /></label>
        <label><span className={label}>Vehicle</span><select className={field} value={vehicle} onChange={(event) => setVehicle(event.target.value)}><option value="BIKE">Bike</option><option value="AUTO">Auto</option><option value="CAB">Cab</option><option value="WOMEN_BIKE">Women-only bike</option><option value="OTHER">Other</option></select></label>
        <label><span className={label}>Amount recorded (₹)</span><input className={field} type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
        <label><span className={label}>Payment label</span><select className={field} value={paymentLabel} onChange={(event) => setPaymentLabel(event.target.value)}><option>UPI</option><option>Cash</option><option>Card</option><option>Wallet</option><option>Not specified</option></select></label>
      </div>
      <div className="grid gap-3 md:grid-cols-2"><label><span className={label}>Purpose</span><select className={field} value={purpose} onChange={(event) => setPurpose(event.target.value)}><option>Personal</option><option>Work</option><option>Education</option><option>Medical appointment</option><option>Airport / railway</option><option>Other</option></select></label><label><span className={label}>Tags (comma separated)</span><input className={field} value={tagsText} onChange={(event) => setTagsText(event.target.value)} maxLength={160} placeholder="office, monthly, reimbursable" /></label></div>
      <label><span className={label}>Notes</span><textarea className={field} rows={2} value={note} onChange={(event) => setNote(event.target.value)} maxLength={400} placeholder="Add context for future reference" /></label>
      <button className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-5 py-2.5 text-sm font-extrabold text-white"><Plus className="h-4 w-4" /> Save record</button>
    </form>

    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black text-slate-900">Saved travel records</h3><p className="text-xs text-slate-500">Search, favorite or export your records.</p></div><button onClick={exportCsv} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold"><Download className="h-3.5 w-3.5" /> Export CSV</button></div>
      <div className="mt-3 flex flex-wrap gap-2"><label className="relative min-w-48 flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search records" /></label><select className="rounded-lg border border-slate-200 px-3 py-2 text-xs" value={range} onChange={(event) => setRange(event.target.value as typeof range)}><option value="ALL">All time</option><option value="30">30 days</option><option value="90">90 days</option><option value="YEAR">This year</option></select><button onClick={() => setFavoritesOnly((value) => !value)} className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold ${favoritesOnly ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-600'}`}><Filter className="h-3.5 w-3.5" /> Favorites</button></div>
      {visible.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No records found.</p> : <div className="mt-4 space-y-3">{visible.map((record) => <article key={record.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h4 className="font-extrabold text-slate-900">{record.reference}</h4><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">{record.purpose}</span></div><p className="mt-1 text-sm text-slate-600">{record.route}</p><p className="mt-1 text-xs text-slate-400">{record.rideDate} · {record.vehicle} · {record.paymentLabel}</p></div><div className="text-right"><p className="text-lg font-black text-slate-900">{formatIndianCurrency(record.amount)}</p><div className="mt-2 flex justify-end gap-1"><button onClick={() => toggleFavorite(record)} className={`rounded-lg p-2 ${record.favorite ? 'text-amber-500' : 'text-slate-400'}`} aria-label="Toggle favorite"><Star className="h-4 w-4" fill={record.favorite ? 'currentColor' : 'none'} /></button><button onClick={() => downloadRecord(record)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Download record"><Download className="h-4 w-4" /></button><button onClick={() => remove(record)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50" aria-label="Delete record"><Trash2 className="h-4 w-4" /></button></div></div></div>{record.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1">{record.tags.map((tag) => <span key={tag} className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700">#{tag}</span>)}</div>}{record.note && <p className="mt-3 text-xs leading-5 text-slate-500">{record.note}</p>}</article>)}</div>}
    </section>
    <p className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-900">These are customer-entered personal records, not official invoices, payment confirmations, tax documents or proof that a transaction occurred.</p>
  </div>;
};

const Summary: React.FC<{ label: string; value: string }> = ({ label: title, value }) => <div className="rounded-xl border border-indigo-100 bg-white p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{title}</p><p className="mt-1 text-xl font-black text-slate-900">{value}</p></div>;
