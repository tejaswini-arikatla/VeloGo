import React, { useMemo, useState } from 'react';
import { Bookmark, Copy, MapPin, Plus, Search, Star, Trash2 } from 'lucide-react';
import { appendExtendedRecord, createStoredRecord, readExtendedCollection, recordExtendedAudit, StoredRecord, writeExtendedCollection } from '../extendedFeatureStore';

interface FavoritePlace extends StoredRecord {
  name: string;
  address: string;
  category: 'HOME' | 'WORK' | 'COLLEGE' | 'AIRPORT' | 'STATION' | 'OTHER';
  landmark: string;
  phone: string;
  isDefaultPickup: boolean;
  isDefaultDropoff: boolean;
  favorite: boolean;
  usageCount: number;
}

interface Props { userId: string; onNotice: (message: string, tone?: 'success' | 'error' | 'info') => void; }
const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100';
const label = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500';

export const FavoritePlacesModule: React.FC<Props> = ({ userId, onNotice }) => {
  const [records, setRecords] = useState<FavoritePlace[]>(() => readExtendedCollection<FavoritePlace>(userId, 'favorite-places'));
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState<FavoritePlace['category']>('OTHER');
  const [landmark, setLandmark] = useState('');
  const [phone, setPhone] = useState('');
  const [defaultPickup, setDefaultPickup] = useState(false);
  const [defaultDropoff, setDefaultDropoff] = useState(false);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const visible = useMemo(() => records
    .filter((item) => categoryFilter === 'ALL' || item.category === categoryFilter)
    .filter((item) => `${item.name} ${item.address} ${item.landmark}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.usageCount - a.usageCount), [records, query, categoryFilter]);

  const refresh = () => setRecords(readExtendedCollection<FavoritePlace>(userId, 'favorite-places'));

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !address.trim()) return onNotice('Enter a place name and address.', 'error');
    if (name.length > 60 || address.length > 240 || landmark.length > 120) return onNotice('One of the location fields is too long.', 'error');
    if (phone && !/^\+?[0-9\s()-]{8,18}$/.test(phone)) return onNotice('Enter a valid contact number or leave it blank.', 'error');
    const record = createStoredRecord({
      name: name.trim(),
      address: address.trim(),
      category,
      landmark: landmark.trim(),
      phone: phone.trim(),
      isDefaultPickup: defaultPickup,
      isDefaultDropoff: defaultDropoff,
      favorite: true,
      usageCount: 0,
    }) as FavoritePlace;
    const updated = records.map((item) => ({
      ...item,
      isDefaultPickup: defaultPickup ? false : item.isDefaultPickup,
      isDefaultDropoff: defaultDropoff ? false : item.isDefaultDropoff,
    }));
    const result = appendExtendedRecord(userId, 'favorite-places', record);
    if (!result.ok) return onNotice(result.error || 'Could not save place.', 'error');
    if (defaultPickup || defaultDropoff) writeExtendedCollection(userId, 'favorite-places', [record, ...updated]);
    recordExtendedAudit(userId, { collection: 'favorite-places', action: 'CREATE', recordId: record.id, message: `Saved favorite place: ${record.name}` });
    refresh();
    setName(''); setAddress(''); setLandmark(''); setPhone('');
    setDefaultPickup(false); setDefaultDropoff(false);
    onNotice('Favorite location saved.');
  };

  const toggleFavorite = (record: FavoritePlace) => {
    const next = records.map((item) => item.id === record.id ? { ...item, favorite: !item.favorite, updatedAt: new Date().toISOString(), version: item.version + 1 } : item);
    const result = writeExtendedCollection(userId, 'favorite-places', next);
    if (!result.ok) return onNotice(result.error || 'Could not update place.', 'error');
    refresh();
  };

  const setDefault = (record: FavoritePlace, kind: 'pickup' | 'dropoff') => {
    const next = records.map((item) => ({
      ...item,
      isDefaultPickup: kind === 'pickup' ? item.id === record.id : item.isDefaultPickup,
      isDefaultDropoff: kind === 'dropoff' ? item.id === record.id : item.isDefaultDropoff,
      updatedAt: new Date().toISOString(),
      version: item.version + 1,
    }));
    const result = writeExtendedCollection(userId, 'favorite-places', next);
    if (!result.ok) return onNotice(result.error || 'Could not set default location.', 'error');
    refresh();
    onNotice(`Default ${kind} location updated.`);
  };

  const usePlace = (record: FavoritePlace) => {
    const next = records.map((item) => item.id === record.id ? { ...item, usageCount: item.usageCount + 1, updatedAt: new Date().toISOString(), version: item.version + 1 } : item);
    writeExtendedCollection(userId, 'favorite-places', next);
    refresh();
    navigator.clipboard?.writeText(record.address).then(() => onNotice('Address copied to clipboard.')).catch(() => onNotice(record.address, 'info'));
  };

  const remove = (record: FavoritePlace) => {
    if (!window.confirm(`Remove "${record.name}" from saved places?`)) return;
    const result = writeExtendedCollection(userId, 'favorite-places', records.filter((item) => item.id !== record.id));
    if (!result.ok) return onNotice(result.error || 'Could not delete place.', 'error');
    refresh();
    onNotice('Favorite location removed.');
  };

  return <div className="space-y-6">
    <section className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5"><div className="flex items-center gap-3"><span className="rounded-xl bg-white p-3 text-emerald-700 shadow-sm"><Bookmark className="h-6 w-6" /></span><div><h3 className="text-lg font-black text-slate-900">Favorite locations</h3><p className="text-sm text-slate-500">Save frequently used addresses and copy them when booking a ride.</p></div></div><div className="mt-5 grid grid-cols-3 gap-3"><Summary label="Saved places" value={String(records.length)} /><Summary label="Favorites" value={String(records.filter((item) => item.favorite).length)} /><Summary label="Most used" value={records.reduce((best, item) => item.usageCount > (best?.usageCount || 0) ? item : best, records[0] as FavoritePlace | undefined)?.name || '—'} /></div></section>
    <form onSubmit={save} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-black text-slate-900">Add a saved place</h3><div className="grid gap-3 md:grid-cols-2"><label><span className={label}>Place name</span><input className={field} value={name} onChange={(event) => setName(event.target.value)} maxLength={60} placeholder="Home" /></label><label><span className={label}>Category</span><select className={field} value={category} onChange={(event) => setCategory(event.target.value as FavoritePlace['category'])}><option value="HOME">Home</option><option value="WORK">Work</option><option value="COLLEGE">College</option><option value="AIRPORT">Airport</option><option value="STATION">Station</option><option value="OTHER">Other</option></select></label></div><label><span className={label}>Full address</span><textarea className={field} rows={2} value={address} onChange={(event) => setAddress(event.target.value)} maxLength={240} placeholder="Building, street, area, city" /></label><div className="grid gap-3 md:grid-cols-2"><label><span className={label}>Nearby landmark</span><input className={field} value={landmark} onChange={(event) => setLandmark(event.target.value)} maxLength={120} /></label><label><span className={label}>Optional contact number</span><input className={field} value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={18} /></label></div><div className="flex flex-wrap gap-4"><label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={defaultPickup} onChange={(event) => setDefaultPickup(event.target.checked)} /> Default pickup</label><label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={defaultDropoff} onChange={(event) => setDefaultDropoff(event.target.checked)} /> Default drop-off</label></div><button className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-extrabold text-white"><Plus className="mr-1 inline h-4 w-4" /> Save location</button></form>
    <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black text-slate-900">Your saved places</h3><p className="text-xs text-slate-500">Choose a location to copy its address.</p></div><div className="flex gap-2"><label className="relative"><Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" /><input className="w-40 rounded-lg border border-slate-200 py-2 pl-8 pr-2 text-xs" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" /></label><select className="rounded-lg border border-slate-200 px-2 text-xs" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="ALL">All</option><option value="HOME">Home</option><option value="WORK">Work</option><option value="COLLEGE">College</option><option value="AIRPORT">Airport</option><option value="STATION">Station</option><option value="OTHER">Other</option></select></div></div>{visible.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No saved places found.</p> : <div className="mt-4 grid gap-3 md:grid-cols-2">{visible.map((record) => <article key={record.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between"><div><h4 className="font-extrabold text-slate-900">{record.name}</h4><p className="mt-1 text-[10px] font-bold text-emerald-700">{record.category}</p></div><button onClick={() => toggleFavorite(record)} className="rounded-lg p-2 text-amber-500" aria-label="Toggle favorite"><Star className="h-4 w-4" fill={record.favorite ? 'currentColor' : 'none'} /></button></div><p className="mt-3 flex gap-2 text-sm text-slate-600"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{record.address}</p>{record.landmark && <p className="mt-1 text-xs text-slate-400">Landmark: {record.landmark}</p>}<div className="mt-3 flex flex-wrap gap-2">{record.isDefaultPickup && <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">Default pickup</span>}{record.isDefaultDropoff && <span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700">Default drop-off</span>}</div><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => usePlace(record)} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white"><Copy className="mr-1 inline h-3.5 w-3.5" /> Copy address</button><button onClick={() => setDefault(record, 'pickup')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">Set pickup</button><button onClick={() => setDefault(record, 'dropoff')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">Set drop-off</button><button onClick={() => remove(record)} className="rounded-lg p-2 text-rose-500" aria-label={`Remove ${record.name}`}><Trash2 className="h-4 w-4" /></button></div></article>)}</div>}</section>
    <p className="text-xs text-slate-400">Saved addresses stay in this browser and are not automatically shared with a driver or used to place a booking.</p>
  </div>;
};

const Summary: React.FC<{ label: string; value: string }> = ({ label: title, value }) => <div className="rounded-xl border border-emerald-100 bg-white p-3"><p className="text-[10px] font-bold uppercase text-slate-400">{title}</p><p className="mt-1 truncate text-lg font-black text-slate-900">{value}</p></div>;
