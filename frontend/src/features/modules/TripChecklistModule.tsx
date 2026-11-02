import React, { useMemo, useState } from 'react';
import { CheckCheck, ClipboardList, Copy, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { appendExtendedRecord, createStoredRecord, readExtendedCollection, recordExtendedAudit, StoredRecord, writeExtendedCollection } from '../extendedFeatureStore';

interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  category: 'DOCUMENTS' | 'SAFETY' | 'COMFORT' | 'OTHER';
  required: boolean;
}

interface TripChecklist extends StoredRecord {
  title: string;
  tripDate: string;
  destination: string;
  items: ChecklistItem[];
  archived: boolean;
}

interface Props { userId: string; onNotice: (message: string, tone?: 'success' | 'error' | 'info') => void; }

const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100';
const label = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500';

const starterItems: Array<Omit<ChecklistItem, 'id' | 'completed'>> = [
  { title: 'Phone charged', category: 'SAFETY', required: true },
  { title: 'Booking details checked', category: 'DOCUMENTS', required: true },
  { title: 'Wallet / payment method ready', category: 'DOCUMENTS', required: false },
  { title: 'Keys and essential documents', category: 'DOCUMENTS', required: false },
  { title: 'Water bottle', category: 'COMFORT', required: false },
  { title: 'Weather conditions checked', category: 'SAFETY', required: false },
];

function itemId(): string {
  return `check-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function completionPercent(items: ChecklistItem[]): number {
  if (!items.length) return 0;
  return Math.round(items.filter((item) => item.completed).length / items.length * 100);
}

function createStarterList(): ChecklistItem[] {
  return starterItems.map((item) => ({ ...item, id: itemId(), completed: false }));
}

export const TripChecklistModule: React.FC<Props> = ({ userId, onNotice }) => {
  const [records, setRecords] = useState<TripChecklist[]>(() => readExtendedCollection<TripChecklist>(userId, 'trip-checklists'));
  const [title, setTitle] = useState('Weekend trip checklist');
  const [destination, setDestination] = useState('');
  const [tripDate, setTripDate] = useState('');
  const [items, setItems] = useState<ChecklistItem[]>(createStarterList);
  const [newItem, setNewItem] = useState('');
  const [newCategory, setNewCategory] = useState<ChecklistItem['category']>('OTHER');
  const [showArchived, setShowArchived] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const visible = records.filter((record) => showArchived || !record.archived)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const active = records.find((record) => record.id === activeId) || null;
  const totalItems = records.reduce((sum, record) => sum + record.items.length, 0);
  const completedItems = records.reduce((sum, record) => sum + record.items.filter((item) => item.completed).length, 0);

  const refresh = () => setRecords(readExtendedCollection<TripChecklist>(userId, 'trip-checklists'));

  const addItem = () => {
    if (!newItem.trim()) return onNotice('Enter a checklist item.', 'error');
    if (items.length >= 40) return onNotice('A checklist can contain up to 40 items.', 'info');
    setItems((current) => [...current, { id: itemId(), title: newItem.trim(), completed: false, category: newCategory, required: false }]);
    setNewItem('');
  };

  const toggleDraftItem = (id: string) => setItems((current) => current.map((item) => item.id === id ? { ...item, completed: !item.completed } : item));
  const removeDraftItem = (id: string) => setItems((current) => current.filter((item) => item.id !== id));

  const createList = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return onNotice('Give your checklist a name.', 'error');
    if (items.length === 0) return onNotice('Add at least one checklist item.', 'error');
    if (title.length > 80 || destination.length > 160) return onNotice('Some text is longer than allowed.', 'error');
    const record = createStoredRecord({
      title: title.trim(),
      destination: destination.trim(),
      tripDate,
      items,
      archived: false,
    }) as TripChecklist;
    const result = appendExtendedRecord(userId, 'trip-checklists', record);
    if (!result.ok) return onNotice(result.error || 'Could not create checklist.', 'error');
    recordExtendedAudit(userId, { collection: 'trip-checklists', action: 'CREATE', recordId: record.id, message: `Created checklist: ${record.title}` });
    refresh();
    setActiveId(record.id);
    setTitle(''); setDestination(''); setTripDate(''); setItems(createStarterList());
    onNotice('Trip checklist created.');
  };

  const updateSavedItem = (record: TripChecklist, itemIdValue: string, completed: boolean) => {
    const next = records.map((item) => item.id === record.id
      ? { ...item, items: item.items.map((entry) => entry.id === itemIdValue ? { ...entry, completed } : entry), updatedAt: new Date().toISOString(), version: item.version + 1 }
      : item);
    const result = writeExtendedCollection(userId, 'trip-checklists', next);
    if (!result.ok) return onNotice(result.error || 'Could not update checklist.', 'error');
    refresh();
  };

  const addSavedItem = (record: TripChecklist) => {
    const value = window.prompt('What else do you need to remember?');
    if (!value?.trim()) return;
    if (record.items.length >= 40) return onNotice('A checklist can contain up to 40 items.', 'info');
    const next = records.map((item) => item.id === record.id
      ? { ...item, items: [...item.items, { id: itemId(), title: value.trim().slice(0, 100), completed: false, category: 'OTHER' as const, required: false }], updatedAt: new Date().toISOString(), version: item.version + 1 }
      : item);
    const result = writeExtendedCollection(userId, 'trip-checklists', next);
    if (!result.ok) return onNotice(result.error || 'Could not add item.', 'error');
    refresh();
    onNotice('Checklist item added.');
  };

  const archive = (record: TripChecklist) => {
    const next = records.map((item) => item.id === record.id
      ? { ...item, archived: !item.archived, updatedAt: new Date().toISOString(), version: item.version + 1 }
      : item);
    const result = writeExtendedCollection(userId, 'trip-checklists', next);
    if (!result.ok) return onNotice(result.error || 'Could not update checklist.', 'error');
    recordExtendedAudit(userId, { collection: 'trip-checklists', action: 'UPDATE', recordId: record.id, message: `${record.archived ? 'Restored' : 'Archived'} checklist: ${record.title}` });
    refresh();
    onNotice(record.archived ? 'Checklist restored.' : 'Checklist archived.');
  };

  const remove = (record: TripChecklist) => {
    if (!window.confirm(`Delete checklist "${record.title}"?`)) return;
    const result = writeExtendedCollection(userId, 'trip-checklists', records.filter((item) => item.id !== record.id));
    if (!result.ok) return onNotice(result.error || 'Could not delete checklist.', 'error');
    recordExtendedAudit(userId, { collection: 'trip-checklists', action: 'DELETE', recordId: record.id, message: `Deleted checklist: ${record.title}` });
    refresh();
    if (activeId === record.id) setActiveId(null);
    onNotice('Checklist deleted.');
  };

  const duplicate = (record: TripChecklist) => {
    const copy = createStoredRecord({
      ...record,
      title: `${record.title} (copy)`,
      items: record.items.map((item) => ({ ...item, id: itemId(), completed: false })),
      archived: false,
    }) as TripChecklist;
    const result = appendExtendedRecord(userId, 'trip-checklists', copy);
    if (!result.ok) return onNotice(result.error || 'Could not duplicate checklist.', 'error');
    refresh();
    onNotice('Checklist duplicated with all items unchecked.');
  };

  const requiredPending = active?.items.filter((item) => item.required && !item.completed).length || 0;
  const categories = ['DOCUMENTS', 'SAFETY', 'COMFORT', 'OTHER'] as const;

  return <div className="space-y-6">
    <section className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5">
      <div className="flex items-center gap-3"><span className="rounded-xl bg-white p-3 text-amber-700 shadow-sm"><ClipboardList className="h-6 w-6" /></span><div><h3 className="text-lg font-black text-slate-900">Trip preparation checklists</h3><p className="text-sm text-slate-500">Create reusable lists so important details are not forgotten.</p></div></div>
      <div className="mt-5 grid grid-cols-3 gap-3"><Summary label="Lists" value={String(records.length)} /><Summary label="Items completed" value={`${completedItems}/${totalItems}`} /><Summary label="Completion" value={`${totalItems ? Math.round(completedItems / totalItems * 100) : 0}%`} /></div>
    </section>

    <form onSubmit={createList} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div><h3 className="font-black text-slate-900">Create a checklist</h3><p className="text-xs text-slate-500">Start with a useful template and add your own items.</p></div>
      <div className="grid gap-3 md:grid-cols-3"><label><span className={label}>Checklist name</span><input className={field} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} /></label><label><span className={label}>Destination (optional)</span><input className={field} value={destination} onChange={(event) => setDestination(event.target.value)} maxLength={160} /></label><label><span className={label}>Trip date (optional)</span><input className={field} type="date" value={tripDate} onChange={(event) => setTripDate(event.target.value)} /></label></div>
      <div className="space-y-2">{items.map((item) => <div key={item.id} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2"><input type="checkbox" checked={item.completed} onChange={() => toggleDraftItem(item.id)} /><span className={`flex-1 text-sm ${item.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item.title}</span><span className="rounded-full bg-white px-2 py-1 text-[9px] font-bold text-slate-400">{item.category}</span><button type="button" onClick={() => removeDraftItem(item.id)} className="rounded p-1 text-rose-500" aria-label={`Remove ${item.title}`}><Trash2 className="h-3.5 w-3.5" /></button></div>)}</div>
      <div className="grid gap-2 sm:grid-cols-[1fr_160px_auto]"><input className={field} value={newItem} onChange={(event) => setNewItem(event.target.value)} maxLength={100} placeholder="Add another item" /><select className={field} value={newCategory} onChange={(event) => setNewCategory(event.target.value as ChecklistItem['category'])}>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select><button type="button" onClick={addItem} className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold"><Plus className="h-4 w-4" /> Add</button></div>
      <button className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-amber-700">Save checklist</button>
    </form>

    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black text-slate-900">Saved checklists</h3><p className="text-xs text-slate-500">Tick items as you prepare for a journey.</p></div><label className="flex items-center gap-2 text-xs font-semibold text-slate-500"><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} /> Show archived</label></div>
      {visible.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No checklists yet.</p> : <div className="mt-4 grid gap-3 lg:grid-cols-2">{visible.map((record) => { const progress = completionPercent(record.items); return <article key={record.id} className={`rounded-xl border p-4 ${activeId === record.id ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'}`}><div className="flex items-start justify-between gap-2"><button onClick={() => setActiveId(activeId === record.id ? null : record.id)} className="text-left"><h4 className="font-extrabold text-slate-900">{record.title}</h4><p className="mt-1 text-xs text-slate-500">{record.destination || 'No destination'} · {record.tripDate || 'Date not set'}</p></button><span className="text-sm font-black text-amber-700">{progress}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-500" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-[10px] text-slate-400">{record.items.filter((item) => item.completed).length} of {record.items.length} complete</p>{activeId === record.id && <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">{record.items.map((item) => <label key={item.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.completed} onChange={(event) => updateSavedItem(record, item.id, event.target.checked)} /><span className={item.completed ? 'text-slate-400 line-through' : 'text-slate-700'}>{item.title}</span>{item.required && <span className="ml-auto text-[9px] font-black text-rose-600">REQUIRED</span>}</label>)}{requiredPending > 0 && <p className="rounded-lg bg-rose-50 p-2 text-xs font-bold text-rose-700">{requiredPending} required items still pending.</p>}<button onClick={() => addSavedItem(record)} className="text-xs font-bold text-amber-700">+ Add item</button></div>}<div className="mt-3 flex flex-wrap gap-2"><button onClick={() => duplicate(record)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold"><Copy className="h-3.5 w-3.5" /> Duplicate</button><button onClick={() => archive(record)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold"><RotateCcw className="h-3.5 w-3.5" /> {record.archived ? 'Restore' : 'Archive'}</button><button onClick={() => remove(record)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50" aria-label={`Delete ${record.title}`}><Trash2 className="h-4 w-4" /></button></div></article>; })}</div>}
    </section>
    <p className="flex items-center gap-2 text-xs text-slate-400"><CheckCheck className="h-4 w-4" /> Checklist records are stored locally and do not confirm a booking or travel requirement.</p>
  </div>;
};

const Summary: React.FC<{ label: string; value: string }> = ({ label: title, value }) => <div className="rounded-xl border border-amber-100 bg-white p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{title}</p><p className="mt-1 text-xl font-black text-slate-900">{value}</p></div>;
