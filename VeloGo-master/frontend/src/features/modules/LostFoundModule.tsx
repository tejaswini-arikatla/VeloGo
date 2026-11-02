import React, { useMemo, useState } from 'react';
import { FileSearch, Package, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { createFeatureRecord, LostItemReport } from '../featureModels';
import { appendRecord, readCollection, recordAudit, updateCollection } from '../featureStorage';
import { firstIssue, formatDateTime, makeReferenceCode, validateLostItem } from '../featureValidation';

interface Props { userId: string; phone?: string; onNotice: (message: string, tone?: 'success' | 'error' | 'info') => void; }
type LostForm = { rideId: string; itemName: string; category: LostItemReport['category']; description: string; approximateValue: string; lostAt: string; pickupArea: string; contactPhone: string };
const blankForm = (phone = ''): LostForm => ({ rideId: '', itemName: '', category: 'OTHER', description: '', approximateValue: '', lostAt: new Date().toISOString().slice(0, 16), pickupArea: '', contactPhone: phone });
const input = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100';
const statusLabels: Record<LostItemReport['status'], string> = { SUBMITTED: 'Submitted', UNDER_REVIEW: 'Under review', MATCH_FOUND: 'Possible match', RETURNED: 'Returned', CLOSED: 'Closed' };

export const LostFoundModule: React.FC<Props> = ({ userId, phone = '', onNotice }) => {
  const [reports, setReports] = useState(() => readCollection(userId, 'lostItems'));
  const [form, setForm] = useState<LostForm>(() => blankForm(phone));
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | LostItemReport['status']>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const visible = useMemo(() => reports
    .filter((report) => statusFilter === 'ALL' || report.status === statusFilter)
    .filter((report) => `${report.referenceCode} ${report.itemName} ${report.pickupArea}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [reports, statusFilter, search]);
  const selected = reports.find((report) => report.id === selectedId) || null;
  const refresh = () => setReports(readCollection(userId, 'lostItems'));
  const update = <K extends keyof LostForm>(key: K, value: LostForm[K]) => setForm((current) => ({ ...current, [key]: value }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const candidate = {
      ...form,
      lostAt: new Date(form.lostAt).toISOString(),
      approximateValue: form.approximateValue ? Number(form.approximateValue) : null,
      status: 'SUBMITTED' as const,
      referenceCode: makeReferenceCode('LOST'),
    };
    const validation = validateLostItem(candidate);
    if (!validation.valid) { onNotice(firstIssue(validation) || 'Check the report details.', 'error'); return; }
    const report = createFeatureRecord(candidate) as LostItemReport;
    appendRecord(userId, 'lostItems', report);
    recordAudit(userId, 'lost-found', 'SUBMITTED', `Reported a lost item: ${report.itemName}.`, report.id);
    refresh(); setForm(blankForm(phone)); setShowForm(false); onNotice(`Report saved. Reference: ${report.referenceCode}`);
  };

  const closeReport = (report: LostItemReport) => {
    if (!window.confirm('Close this report?')) return;
    updateCollection(userId, 'lostItems', (items) => items.map((item) => item.id === report.id
      ? { ...item, status: 'CLOSED', updatedAt: new Date().toISOString(), version: item.version + 1 }
      : item));
    refresh(); onNotice('Report closed.');
  };

  const deleteReport = (report: LostItemReport) => {
    if (!window.confirm('Permanently remove this local report?')) return;
    updateCollection(userId, 'lostItems', (items) => items.filter((item) => item.id !== report.id));
    recordAudit(userId, 'lost-found', 'DELETED', `Deleted report ${report.referenceCode}.`, report.id);
    refresh(); setSelectedId(null); onNotice('Report deleted from this browser.');
  };

  const openCount = reports.filter((report) => !['RETURNED', 'CLOSED'].includes(report.status)).length;
  const returnedCount = reports.filter((report) => report.status === 'RETURNED').length;
  return <section className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-3"><Stat label="Total reports" value={reports.length} /><Stat label="Open reports" value={openCount} /><Stat label="Returned items" value={returnedCount} /></div>
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-xl font-black text-slate-900">Lost and found</h2><p className="mt-1 text-sm text-slate-500">Keep a reference number and details for items left during a journey.</p></div><button onClick={() => setShowForm((value) => !value)} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white">{showForm ? 'Hide form' : 'Report an item'}</button></div>
    {showForm && <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-rose-100 bg-rose-50/50 p-5 sm:grid-cols-2"><div className="sm:col-span-2"><h3 className="font-extrabold text-slate-900">New lost-item report</h3><p className="text-xs text-slate-500">Avoid including passwords, bank details or other sensitive information.</p></div>
      <Field label="Item name"><input className={input} value={form.itemName} onChange={(event) => update('itemName', event.target.value)} placeholder="e.g. black backpack" /></Field>
      <Field label="Category"><select className={input} value={form.category} onChange={(event) => update('category', event.target.value as LostForm['category'])}><option value="ELECTRONICS">Electronics</option><option value="BAG">Bag</option><option value="DOCUMENT">Document</option><option value="CLOTHING">Clothing</option><option value="OTHER">Other</option></select></Field>
      <Field label="Ride ID (optional)"><input className={input} value={form.rideId} onChange={(event) => update('rideId', event.target.value)} placeholder="Ride reference" /></Field>
      <Field label="When did you lose it?"><input className={input} type="datetime-local" value={form.lostAt} onChange={(event) => update('lostAt', event.target.value)} /></Field>
      <Field label="Approximate value (₹)"><input className={input} type="number" min="0" value={form.approximateValue} onChange={(event) => update('approximateValue', event.target.value)} placeholder="Optional" /></Field>
      <Field label="Last known location"><input className={input} value={form.pickupArea} onChange={(event) => update('pickupArea', event.target.value)} placeholder="Where you last remember seeing it" /></Field>
      <div className="sm:col-span-2"><Field label="Description and identifying details"><textarea className={input} rows={3} maxLength={1000} value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Colour, brand, distinguishing marks, contents (do not list sensitive data)..." /></Field></div>
      <Field label="Contact phone"><input className={input} value={form.contactPhone} onChange={(event) => update('contactPhone', event.target.value)} placeholder="Phone number" /></Field>
      <div className="flex items-end justify-end"><button className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white">Submit report</button></div>
    </form>}
    <div className="flex flex-col gap-2 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input className={`${input} pl-9`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by reference, item or location" /></div><select className={`${input} sm:max-w-48`} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}><option value="ALL">All statuses</option>{Object.entries(statusLabels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></div>
    {visible.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center"><Package className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 font-bold text-slate-700">No reports found</p><p className="mt-1 text-sm text-slate-500">Your submitted reports will appear here.</p></div> : <div className="grid gap-3">{visible.map((report) => <article key={report.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="rounded-xl bg-rose-50 p-3 text-rose-600"><FileSearch className="h-5 w-5" /></span><div><h3 className="font-extrabold text-slate-900">{report.itemName}</h3><p className="mt-1 text-xs text-slate-500">{report.referenceCode} · {formatDateTime(report.lostAt)}</p><p className="mt-1 text-xs text-slate-500">Last seen: {report.pickupArea}</p></div></div><span className={`rounded-full px-3 py-1 text-[10px] font-black ${report.status === 'RETURNED' ? 'bg-emerald-50 text-emerald-700' : report.status === 'CLOSED' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'}`}>{statusLabels[report.status]}</span></div><div className="mt-3 flex justify-between border-t border-slate-100 pt-3"><button onClick={() => setSelectedId(report.id)} className="text-xs font-bold text-rose-700">View report details</button><button onClick={() => deleteReport(report)} className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /> Delete</button></div></article>)}</div>}
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"><div className="flex justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-rose-600">{selected.referenceCode}</p><h3 className="mt-1 text-xl font-black">{selected.itemName}</h3></div><button onClick={() => setSelectedId(null)} className="text-sm font-bold text-slate-400">Close</button></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><Detail label="Category" value={selected.category} /><Detail label="Status" value={statusLabels[selected.status]} /><Detail label="Lost at" value={formatDateTime(selected.lostAt)} /><Detail label="Last known location" value={selected.pickupArea} /><Detail label="Contact" value={selected.contactPhone} /><Detail label="Ride ID" value={selected.rideId || 'Not provided'} /></dl><div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{selected.description}</div>{selected.status !== 'CLOSED' && <button onClick={() => closeReport(selected)} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">Close report</button>}</div></div>}
    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><p><strong>Important:</strong> This local report does not notify a driver or VeloGo support. Contact official support through the existing support channel for real recovery assistance.</p></div>
  </section>;
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase text-slate-500">{label}</span>{children}</label>;
const Stat: React.FC<{ label: string; value: number }> = ({ label, value }) => <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-slate-900">{value}</p></div>;
const Detail: React.FC<{ label: string; value: string }> = ({ label, value }) => <div><dt className="text-[10px] font-bold uppercase text-slate-400">{label}</dt><dd className="mt-1 break-words font-semibold text-slate-700">{value}</dd></div>;
