import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Bookmark, Clock3, GripVertical, MapPin, Plus, Route, Trash2 } from 'lucide-react';
import { createFeatureRecord, MultiStopRoute, RouteStop, VehicleChoice } from '../featureModels';
import { appendRecord, readCollection, recordAudit, updateCollection } from '../featureStorage';
import { estimateFare, estimateRouteFromDistances } from '../featureAlgorithms';
import { firstIssue, getVehicleLabel, validateRequiredText, validateRouteStops } from '../featureValidation';

interface Props { userId: string; onNotice: (message: string, tone?: 'success' | 'error' | 'info') => void; }
const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100';
const newStop = (kind: RouteStop['kind'], index: number): RouteStop => ({ id: `stop-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 5)}`, label: kind === 'PICKUP' ? 'Pickup' : kind === 'DROPOFF' ? 'Drop-off' : `Stop ${index}`, address: '', kind, dwellMinutes: 0, completed: false });

export const MultiStopPlannerModule: React.FC<Props> = ({ userId, onNotice }) => {
  const [routes, setRoutes] = useState(() => readCollection(userId, 'routes'));
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [vehicle, setVehicle] = useState<VehicleChoice>('AUTO');
  const [stops, setStops] = useState<RouteStop[]>([newStop('PICKUP', 1), newStop('DROPOFF', 2)]);
  const [filter, setFilter] = useState<'ALL' | 'FAVORITES'>('ALL');
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);
  const [distanceInputs, setDistanceInputs] = useState<Record<string, string>>({});

  const visibleRoutes = useMemo(() => routes.filter((route) => filter === 'ALL' || route.isFavorite), [routes, filter]);
  const totalDwell = stops.reduce((sum, stop) => sum + stop.dwellMinutes, 0);
  const canAddStop = stops.length < 12;

  const updateStop = (id: string, patch: Partial<RouteStop>) => setStops((current) => current.map((stop) => stop.id === id ? { ...stop, ...patch } : stop));
  const addWaypoint = () => {
    if (!canAddStop) { onNotice('A route can contain at most 12 stops.', 'error'); return; }
    setStops((current) => [...current.slice(0, -1), newStop('WAYPOINT', current.length), current[current.length - 1]]);
  };
  const removeStop = (id: string) => {
    setStops((current) => {
      const target = current.find((stop) => stop.id === id);
      if (!target || target.kind !== 'WAYPOINT') return current;
      return current.filter((stop) => stop.id !== id);
    });
  };
  const moveStop = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex <= 0 || nextIndex >= stops.length - 1) return;
    setStops((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next.map((stop, position) => stop.kind === 'WAYPOINT' ? { ...stop, label: `Stop ${position}` } : stop);
    });
  };

  const createRoute = (event: React.FormEvent) => {
    event.preventDefault();
    const nameIssues = validateRequiredText(name, 'Route name', 80);
    if (nameIssues.length) { onNotice(nameIssues[0].message, 'error'); return; }
    const validation = validateRouteStops(stops);
    if (!validation.valid) { onNotice(firstIssue(validation) || 'Review your stops.', 'error'); return; }
    const route = createFeatureRecord({
      name: name.trim(), description: description.trim(), stops,
      vehicle, estimatedDistanceKm: 0, estimatedDurationMinutes: totalDwell,
      isFavorite: false, tags: [],
    }) as MultiStopRoute;
    appendRecord(userId, 'routes', route);
    recordAudit(userId, 'stops', 'CREATED', `Created route ${route.name}.`, route.id);
    setRoutes(readCollection(userId, 'routes'));
    setName(''); setDescription(''); setStops([newStop('PICKUP', 1), newStop('DROPOFF', 2)]);
    onNotice('Your multi-stop route has been saved.');
  };

  const toggleFavorite = (route: MultiStopRoute) => {
    updateCollection(userId, 'routes', (items) => items.map((item) => item.id === route.id
      ? { ...item, isFavorite: !item.isFavorite, updatedAt: new Date().toISOString(), version: item.version + 1 }
      : item));
    setRoutes(readCollection(userId, 'routes'));
    onNotice(route.isFavorite ? 'Removed from favorites.' : 'Added to favorites.');
  };

  const deleteRoute = (route: MultiStopRoute) => {
    if (!window.confirm(`Delete route "${route.name}"?`)) return;
    updateCollection(userId, 'routes', (items) => items.filter((item) => item.id !== route.id));
    setRoutes(readCollection(userId, 'routes'));
    recordAudit(userId, 'stops', 'DELETED', `Deleted route ${route.name}.`, route.id);
    onNotice('Route deleted.');
  };

  const estimateRoute = (route: MultiStopRoute) => {
    const legs = route.stops.slice(0, -1).map((stop, index) => {
      const key = `${route.id}-${index}`;
      return Number(distanceInputs[key] || 0);
    });
    const estimate = estimateRouteFromDistances(legs, route.stops);
    updateCollection(userId, 'routes', (items) => items.map((item) => item.id === route.id
      ? { ...item, estimatedDistanceKm: estimate.totalDistanceKm, estimatedDurationMinutes: estimate.totalMinutes, updatedAt: new Date().toISOString(), version: item.version + 1 }
      : item));
    setRoutes(readCollection(userId, 'routes'));
    onNotice(`Estimated ${estimate.totalDistanceKm} km and ${estimate.totalMinutes} minutes using the distances you entered.`, 'info');
  };

  return <section className="space-y-5">
    <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-xl font-black text-slate-900">Multi-stop route planner</h2><p className="mt-1 text-sm text-slate-500">Save a sequence of stops for errands, campus travel or a day out.</p></div><span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">Up to 12 stops</span></header>
    <form onSubmit={createRoute} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Route name</span><input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Saturday errands" /></label><label className="block"><span className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Preferred vehicle</span><select className={inputClass} value={vehicle} onChange={(event) => setVehicle(event.target.value as VehicleChoice)}><option value="BIKE">Bike taxi</option><option value="AUTO">Auto</option><option value="CAB">Cab</option><option value="WOMEN_BIKE">Women-only bike</option></select></label></div>
      <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Description</span><input className={inputClass} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What is this route for?" /></label>
      <div className="space-y-2"><div className="flex items-center justify-between"><h3 className="font-extrabold text-slate-800">Your stop sequence</h3><span className="text-xs text-slate-400">{stops.length} / 12 stops</span></div>{stops.map((stop, index) => <div key={stop.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3"><span className={`rounded-lg p-2 ${stop.kind === 'PICKUP' ? 'bg-emerald-100 text-emerald-700' : stop.kind === 'DROPOFF' ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-700'}`}><MapPin className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="mb-1 text-[10px] font-black uppercase tracking-wide text-slate-400">{stop.kind === 'WAYPOINT' ? `Waypoint ${index}` : stop.kind}</p><input className={inputClass} value={stop.address} onChange={(event) => updateStop(stop.id, { address: event.target.value })} placeholder="Enter a place or address" /></div><label className="w-24"><span className="mb-1 block text-[10px] font-bold text-slate-400">Minutes here</span><input className={inputClass} type="number" min="0" max="240" value={stop.dwellMinutes} onChange={(event) => updateStop(stop.id, { dwellMinutes: Number(event.target.value) })} /></label>{stop.kind === 'WAYPOINT' && <div className="flex gap-1"><button type="button" title="Move up" disabled={index <= 1} onClick={() => moveStop(index, -1)} className="rounded-lg border bg-white p-2 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button><button type="button" title="Move down" disabled={index >= stops.length - 2} onClick={() => moveStop(index, 1)} className="rounded-lg border bg-white p-2 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button><button type="button" title="Remove stop" onClick={() => removeStop(stop.id)} className="rounded-lg border border-rose-100 bg-white p-2 text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button></div>}</div>)}</div>
      <div className="flex flex-wrap items-center justify-between gap-3"><button type="button" disabled={!canAddStop} onClick={addWaypoint} className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-bold text-sky-700 disabled:opacity-40"><Plus className="h-4 w-4" /> Add a stop</button><div className="text-xs text-slate-500">Total stop time: <strong>{totalDwell} min</strong></div><button className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-700">Save route</button></div>
    </form>
    <div className="flex items-center justify-between"><h3 className="font-black text-slate-900">Saved routes ({routes.length})</h3><select className={`${inputClass} max-w-40`} value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}><option value="ALL">All routes</option><option value="FAVORITES">Favorites</option></select></div>
    {visibleRoutes.length === 0 ? <Empty title="No routes saved" detail="Create a route above and it will appear here." /> : <div className="grid gap-3">{visibleRoutes.map((route) => <article key={route.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Route className="h-4 w-4 text-sky-600" /><h4 className="font-extrabold text-slate-900">{route.name}</h4></div><p className="mt-1 text-xs text-slate-500">{route.stops.length} stops · {getVehicleLabel(route.vehicle)} · {route.estimatedDistanceKm || '—'} km</p></div><div className="flex gap-1"><button onClick={() => toggleFavorite(route)} title="Favorite route" className={`rounded-lg p-2 ${route.isFavorite ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'}`}><Bookmark className="h-4 w-4" fill={route.isFavorite ? 'currentColor' : 'none'} /></button><button onClick={() => deleteRoute(route)} title="Delete route" className="rounded-lg p-2 text-slate-300 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button></div></div><div className="mt-3 flex flex-wrap gap-2">{route.stops.map((stop, index) => <span key={stop.id} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-600">{index + 1}. {stop.address || 'Address missing'}</span>)}</div><button onClick={() => setExpandedRoute(expandedRoute === route.id ? null : route.id)} className="mt-3 text-xs font-bold text-sky-700">{expandedRoute === route.id ? 'Hide estimate tools' : 'Estimate route time'}</button>{expandedRoute === route.id && <div className="mt-3 space-y-2 rounded-xl bg-sky-50 p-3"><p className="text-xs leading-5 text-sky-900">Enter an approximate distance for each leg. This calculator is a planning aid and does not call a map-routing service.</p>{route.stops.slice(0, -1).map((stop, index) => <label key={stop.id} className="grid grid-cols-[1fr_110px] items-center gap-2 text-xs"><span className="truncate">{stop.address || `Stop ${index + 1}`} → {route.stops[index + 1]?.address || `Stop ${index + 2}`}</span><input className={inputClass} type="number" min="0" step="0.1" placeholder="km" value={distanceInputs[`${route.id}-${index}`] || ''} onChange={(event) => setDistanceInputs((current) => ({ ...current, [`${route.id}-${index}`]: event.target.value }))} /></label>)}<button onClick={() => estimateRoute(route)} className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white">Calculate estimate</button><p className="text-xs text-sky-800">Estimated fare example: ₹{estimateFare(route.estimatedDistanceKm, route.vehicle)}</p></div>}</article>)}</div>}
  </section>;
};

const Empty: React.FC<{ title: string; detail: string }> = ({ title, detail }) => <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center"><GripVertical className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-2 font-bold text-slate-700">{title}</p><p className="mt-1 text-sm text-slate-500">{detail}</p></div>;
