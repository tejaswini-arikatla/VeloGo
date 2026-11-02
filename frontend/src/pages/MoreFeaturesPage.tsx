import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarClock, MapPin, Users, MessageCircle, PackageSearch, Award,
  ShieldCheck, ChartNoAxesCombined, Plus, Trash2, Send, Route, Clock3,
  CheckCircle2, AlertCircle, CarFront, Coins, Phone, Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Ride } from '../types';

type FeatureTab = 'scheduled' | 'stops' | 'pooling' | 'chat' | 'lost' | 'rewards' | 'contacts' | 'analytics';
type ScheduledRide = { id: string; pickup: string; destination: string; vehicle: string; date: string; time: string; note: string; status: 'SCHEDULED' | 'CANCELLED'; createdAt: string };
type MultiStopPlan = { id: string; title: string; stops: string[]; createdAt: string };
type PoolRequest = { id: string; from: string; to: string; date: string; seats: number; note: string; status: 'LOOKING' | 'CANCELLED'; createdAt: string };
type ChatMessage = { id: string; text: string; createdAt: string; sender: 'ME' | 'VELOGO' };
type LostReport = { id: string; rideId: string; item: string; description: string; contact: string; status: 'SUBMITTED' | 'UNDER_REVIEW' | 'RESOLVED'; createdAt: string };
type Contact = { id: string; name: string; phone: string; relation: string };

const tabs: { id: FeatureTab; label: string; description: string; icon: React.ElementType }[] = [
  { id: 'scheduled', label: 'Scheduled rides', description: 'Plan a trip for later', icon: CalendarClock },
  { id: 'stops', label: 'Multi-stop planner', description: 'Save a route with stops', icon: Route },
  { id: 'pooling', label: 'Ride pooling', description: 'Find a shared commute', icon: Users },
  { id: 'chat', label: 'Ride chat', description: 'Message the VeloGo help desk', icon: MessageCircle },
  { id: 'lost', label: 'Lost & found', description: 'Report a forgotten item', icon: PackageSearch },
  { id: 'rewards', label: 'Rewards', description: 'View your ride points', icon: Award },
  { id: 'contacts', label: 'Trusted contacts', description: 'Keep emergency contacts', icon: ShieldCheck },
  { id: 'analytics', label: 'Travel insights', description: 'Understand your travel', icon: ChartNoAxesCombined },
];

const storageKey = (userId: string, section: string) => `velogo_extra_${userId}_${section}`;
function readSaved<T>(userId: string, section: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(storageKey(userId, section));
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function saveSaved<T>(userId: string, section: string, value: T) {
  localStorage.setItem(storageKey(userId, section), JSON.stringify(value));
}
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const prettyDate = (value: string) => value ? new Date(`${value}T00:00:00`).toLocaleDateString() : 'Not set';

export const MoreFeaturesPage: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id || 'guest';
  const [activeTab, setActiveTab] = useState<FeatureTab>('scheduled');
  const [rides, setRides] = useState<Ride[]>([]);
  const [loadingRides, setLoadingRides] = useState(true);
  const [notice, setNotice] = useState('');

  const [scheduled, setScheduled] = useState<ScheduledRide[]>(() => readSaved(userId, 'scheduled', []));
  const [scheduleForm, setScheduleForm] = useState({ pickup: '', destination: '', vehicle: 'BIKE', date: '', time: '', note: '' });
  const [plans, setPlans] = useState<MultiStopPlan[]>(() => readSaved(userId, 'stops', []));
  const [planForm, setPlanForm] = useState({ title: '', stops: ['', ''] });
  const [poolRequests, setPoolRequests] = useState<PoolRequest[]>(() => readSaved(userId, 'pooling', []));
  const [poolForm, setPoolForm] = useState({ from: '', to: '', date: '', seats: 1, note: '' });
  const [messages, setMessages] = useState<ChatMessage[]>(() => readSaved(userId, 'chat', []));
  const [messageText, setMessageText] = useState('');
  const [lostReports, setLostReports] = useState<LostReport[]>(() => readSaved(userId, 'lost', []));
  const [lostForm, setLostForm] = useState({ rideId: '', item: '', description: '', contact: user?.phone || '' });
  const [contacts, setContacts] = useState<Contact[]>(() => readSaved(userId, 'contacts', []));
  const [contactForm, setContactForm] = useState({ name: '', phone: '', relation: '' });

  useEffect(() => {
    api.customer.getHistory()
      .then(setRides)
      .catch(() => setRides([]))
      .finally(() => setLoadingRides(false));
  }, []);

  useEffect(() => { saveSaved(userId, 'scheduled', scheduled); }, [userId, scheduled]);
  useEffect(() => { saveSaved(userId, 'stops', plans); }, [userId, plans]);
  useEffect(() => { saveSaved(userId, 'pooling', poolRequests); }, [userId, poolRequests]);
  useEffect(() => { saveSaved(userId, 'chat', messages); }, [userId, messages]);
  useEffect(() => { saveSaved(userId, 'lost', lostReports); }, [userId, lostReports]);
  useEffect(() => { saveSaved(userId, 'contacts', contacts); }, [userId, contacts]);

  const completedRides = rides.filter((ride) => ride.status === 'COMPLETED');
  const totalSpend = completedRides.reduce((sum, ride) => sum + (ride.finalFare || ride.estimatedFare || 0), 0);
  const totalDistance = completedRides.reduce((sum, ride) => sum + (ride.distanceKm || 0), 0);
  const rewardPoints = Math.floor(totalSpend / 10);
  const upcoming = scheduled.filter((ride) => ride.status === 'SCHEDULED' && new Date(`${ride.date}T${ride.time}`) >= new Date());
  const maxSpend = Math.max(1, ...completedRides.map((ride) => ride.finalFare || ride.estimatedFare || 0));
  const recentRides = useMemo(() => [...completedRides].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5), [rides]);

  const showNotice = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 3200); };

  const addScheduledRide = (event: React.FormEvent) => {
    event.preventDefault();
    const dateTime = new Date(`${scheduleForm.date}T${scheduleForm.time}`);
    if (!scheduleForm.pickup.trim() || !scheduleForm.destination.trim()) return showNotice('Enter both pickup and destination.');
    if (Number.isNaN(dateTime.getTime()) || dateTime <= new Date()) return showNotice('Choose a future date and time.');
    setScheduled((items) => [{ ...scheduleForm, id: makeId(), status: 'SCHEDULED', createdAt: new Date().toISOString() }, ...items]);
    setScheduleForm({ pickup: '', destination: '', vehicle: 'BIKE', date: '', time: '', note: '' });
    showNotice('Scheduled ride saved in this browser.');
  };

  const addStop = () => setPlanForm((form) => ({ ...form, stops: [...form.stops, ''] }));
  const updateStop = (index: number, value: string) => setPlanForm((form) => ({ ...form, stops: form.stops.map((stop, i) => i === index ? value : stop) }));
  const addPlan = (event: React.FormEvent) => {
    event.preventDefault();
    const stops = planForm.stops.map((stop) => stop.trim()).filter(Boolean);
    if (!planForm.title.trim() || stops.length < 2) return showNotice('Add a route name and at least two locations.');
    setPlans((items) => [{ id: makeId(), title: planForm.title.trim(), stops, createdAt: new Date().toISOString() }, ...items]);
    setPlanForm({ title: '', stops: ['', ''] });
    showNotice('Multi-stop route saved.');
  };

  const addPoolRequest = (event: React.FormEvent) => {
    event.preventDefault();
    if (!poolForm.from.trim() || !poolForm.to.trim() || !poolForm.date) return showNotice('Complete the route and travel date.');
    setPoolRequests((items) => [{ ...poolForm, id: makeId(), status: 'LOOKING', createdAt: new Date().toISOString() }, ...items]);
    setPoolForm({ from: '', to: '', date: '', seats: 1, note: '' });
    showNotice('Your shared-ride interest has been saved.');
  };

  const sendMessage = (event: React.FormEvent) => {
    event.preventDefault();
    if (!messageText.trim()) return;
    const text = messageText.trim();
    setMessages((items) => [...items, { id: makeId(), text, sender: 'ME', createdAt: new Date().toISOString() }]);
    setMessageText('');
    window.setTimeout(() => setMessages((items) => [...items, {
      id: makeId(), sender: 'VELOGO', createdAt: new Date().toISOString(),
      text: 'Thanks for contacting VeloGo. This demo inbox stores messages locally; connect the support API to enable staff replies.',
    }]), 650);
  };

  const submitLostReport = (event: React.FormEvent) => {
    event.preventDefault();
    if (!lostForm.item.trim() || !lostForm.contact.trim()) return showNotice('Add the item name and a contact number.');
    setLostReports((items) => [{ ...lostForm, id: makeId(), status: 'SUBMITTED', createdAt: new Date().toISOString() }, ...items]);
    setLostForm({ rideId: '', item: '', description: '', contact: user?.phone || '' });
    showNotice('Lost-item report saved.');
  };

  const addContact = (event: React.FormEvent) => {
    event.preventDefault();
    if (!contactForm.name.trim() || !/^\+?[0-9\s-]{8,16}$/.test(contactForm.phone.trim())) return showNotice('Enter a contact name and valid phone number.');
    if (contacts.length >= 5) return showNotice('You can save up to five additional trusted contacts.');
    setContacts((items) => [...items, { ...contactForm, id: makeId(), phone: contactForm.phone.trim() }]);
    setContactForm({ name: '', phone: '', relation: '' });
    showNotice('Trusted contact saved on this device.');
  };

  const currentTab = tabs.find((tab) => tab.id === activeTab)!;
  const CurrentTabIcon = currentTab.icon;
  const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100';
  const labelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500';
  const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-extrabold text-slate-950 shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50';
  const panelClass = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6';

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-400/10 px-3 py-1 text-xs font-bold text-brand-300"><Sparkles className="h-3.5 w-3.5" /> VeloGo extensions</div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">More ways to move.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Explore additional travel tools designed to make planning, sharing and managing journeys easier.</p>
          </div>
          <div className="flex flex-wrap gap-2"><Link to="/customer/feature-suite" className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-extrabold text-slate-950 transition hover:bg-brand-400">Open advanced feature suite</Link><Link to="/customer/dashboard" className="inline-flex items-center justify-center rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10">Back to dashboard</Link></div>
        </div>
        <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-400">Upcoming scheduled</p><p className="mt-1 text-2xl font-black">{upcoming.length}</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-400">Completed rides</p><p className="mt-1 text-2xl font-black">{completedRides.length}</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-400">Reward points estimate</p><p className="mt-1 text-2xl font-black">{rewardPoints.toLocaleString()}</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-400">Saved trusted contacts</p><p className="mt-1 text-2xl font-black">{contacts.length}</p></div>
        </div>
      </section>

      {notice && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"><CheckCircle2 className="h-4 w-4" />{notice}</div>}

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="px-3 pb-2 pt-1 text-[11px] font-black uppercase tracking-widest text-slate-400">Travel tools</p>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-2 lg:grid-cols-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;
              return <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex min-w-0 items-center gap-3 rounded-xl px-3 py-3 text-left transition ${selected ? 'bg-slate-950 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
                <span className={`rounded-lg p-2 ${selected ? 'bg-brand-400/15 text-brand-300' : 'bg-slate-100 text-slate-500'}`}><Icon className="h-4 w-4" /></span>
                <span className="min-w-0"><span className="block truncate text-xs font-extrabold sm:text-sm">{tab.label}</span><span className={`hidden truncate text-[10px] sm:block ${selected ? 'text-slate-300' : 'text-slate-400'}`}>{tab.description}</span></span>
              </button>;
            })}
          </div>
        </aside>

        <main className="min-w-0 space-y-5">
          <div className="flex items-center gap-3"><span className="rounded-xl bg-brand-100 p-3 text-brand-800"><CurrentTabIcon className="h-5 w-5" /></span><div><h2 className="text-xl font-black text-slate-900">{currentTab.label}</h2><p className="text-xs text-slate-500">{currentTab.description}</p></div></div>

          {activeTab === 'scheduled' && <>
            <form onSubmit={addScheduledRide} className={`${panelClass} space-y-4`}>
              <div><h3 className="font-extrabold text-slate-900">Plan a ride in advance</h3><p className="mt-1 text-xs text-slate-500">Choose a future date and preferred vehicle. This creates a local planning record, not a confirmed captain assignment.</p></div>
              <div className="grid gap-4 sm:grid-cols-2"><label><span className={labelClass}>Pickup location</span><input className={inputClass} value={scheduleForm.pickup} onChange={(e) => setScheduleForm({ ...scheduleForm, pickup: e.target.value })} placeholder="e.g. VVIT, Guntur" required /></label><label><span className={labelClass}>Destination</span><input className={inputClass} value={scheduleForm.destination} onChange={(e) => setScheduleForm({ ...scheduleForm, destination: e.target.value })} placeholder="Where are you going?" required /></label><label><span className={labelClass}>Date</span><input type="date" min={new Date().toISOString().slice(0, 10)} className={inputClass} value={scheduleForm.date} onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })} required /></label><label><span className={labelClass}>Pickup time</span><input type="time" className={inputClass} value={scheduleForm.time} onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })} required /></label><label><span className={labelClass}>Vehicle category</span><select className={inputClass} value={scheduleForm.vehicle} onChange={(e) => setScheduleForm({ ...scheduleForm, vehicle: e.target.value })}><option value="BIKE">Bike</option><option value="AUTO">Auto</option><option value="CAB">Cab</option></select></label><label><span className={labelClass}>Note (optional)</span><input className={inputClass} value={scheduleForm.note} onChange={(e) => setScheduleForm({ ...scheduleForm, note: e.target.value })} placeholder="Any travel preference" /></label></div>
              <button className={primaryButton} type="submit"><Plus className="h-4 w-4" /> Save scheduled ride</button>
            </form>
            <div className={panelClass}><h3 className="mb-4 font-extrabold text-slate-900">Your planned rides <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{scheduled.length}</span></h3>{scheduled.length === 0 ? <EmptyState text="No scheduled rides yet. Use the form above to plan one." /> : <div className="space-y-3">{scheduled.map((ride) => <div key={ride.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="mb-2 flex items-center gap-2 text-xs font-bold text-brand-800"><CalendarClock className="h-4 w-4" />{prettyDate(ride.date)} · {ride.time}</div><p className="text-sm font-extrabold text-slate-900">{ride.pickup} <span className="text-brand-500">→</span> {ride.destination}</p><p className="mt-1 text-xs text-slate-500">{ride.vehicle} {ride.note ? `· ${ride.note}` : ''}</p></div><div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${ride.status === 'SCHEDULED' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{ride.status}</span>{ride.status === 'SCHEDULED' && <button title="Cancel planned ride" onClick={() => setScheduled((items) => items.map((item) => item.id === ride.id ? { ...item, status: 'CANCELLED' } : item))} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}</div></div></div>)}</div>}</div>
          </>}

          {activeTab === 'stops' && <>
            <form onSubmit={addPlan} className={`${panelClass} space-y-4`}><div><h3 className="font-extrabold text-slate-900">Build a route with multiple stops</h3><p className="mt-1 text-xs text-slate-500">Organize errands or sightseeing locations in one saved itinerary.</p></div><label><span className={labelClass}>Route name</span><input className={inputClass} value={planForm.title} onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })} placeholder="e.g. Weekend errands" required /></label><div className="space-y-2">{planForm.stops.map((stop, index) => <div key={index} className="flex items-center gap-2"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-600">{index + 1}</span><input className={inputClass} value={stop} onChange={(e) => updateStop(index, e.target.value)} placeholder={`Stop ${index + 1}`} />{planForm.stops.length > 2 && <button type="button" onClick={() => setPlanForm((form) => ({ ...form, stops: form.stops.filter((_, i) => i !== index) }))} className="rounded-lg p-2 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}</div>)}</div><div className="flex flex-wrap gap-2"><button type="button" onClick={addStop} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"><Plus className="mr-1 inline h-4 w-4" /> Add stop</button><button type="submit" className={primaryButton}>Save route</button></div></form>
            <div className={panelClass}><h3 className="mb-4 font-extrabold">Saved itineraries</h3>{plans.length === 0 ? <EmptyState text="Your saved multi-stop routes will appear here." /> : <div className="space-y-3">{plans.map((plan) => <div key={plan.id} className="rounded-xl border border-slate-200 p-4"><div className="flex justify-between gap-2"><h4 className="font-bold">{plan.title}</h4><button onClick={() => setPlans((items) => items.filter((item) => item.id !== plan.id))} className="text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div><ol className="mt-3 space-y-2">{plan.stops.map((stop, i) => <li key={`${plan.id}-${i}`} className="flex items-center gap-2 text-sm text-slate-600"><MapPin className="h-3.5 w-3.5 text-brand-600" />{stop}</li>)}</ol></div>)}</div>}</div>
          </>}

          {activeTab === 'pooling' && <>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertCircle className="mr-2 inline h-4 w-4" />Ride-pooling requests are saved as expressions of interest. This prototype does not match passengers or confirm shared rides.</div>
            <form onSubmit={addPoolRequest} className={`${panelClass} space-y-4`}><h3 className="font-extrabold">Find people with a similar commute</h3><div className="grid gap-4 sm:grid-cols-2"><label><span className={labelClass}>Starting point</span><input className={inputClass} value={poolForm.from} onChange={(e) => setPoolForm({ ...poolForm, from: e.target.value })} placeholder="From" required /></label><label><span className={labelClass}>Destination</span><input className={inputClass} value={poolForm.to} onChange={(e) => setPoolForm({ ...poolForm, to: e.target.value })} placeholder="To" required /></label><label><span className={labelClass}>Travel date</span><input type="date" min={new Date().toISOString().slice(0, 10)} className={inputClass} value={poolForm.date} onChange={(e) => setPoolForm({ ...poolForm, date: e.target.value })} required /></label><label><span className={labelClass}>Seats needed</span><input type="number" min="1" max="4" className={inputClass} value={poolForm.seats} onChange={(e) => setPoolForm({ ...poolForm, seats: Number(e.target.value) })} /></label></div><label><span className={labelClass}>Extra details</span><textarea className={inputClass} rows={2} value={poolForm.note} onChange={(e) => setPoolForm({ ...poolForm, note: e.target.value })} placeholder="Flexible timing, luggage, etc." /></label><button className={primaryButton}><Users className="h-4 w-4" /> Post pooling interest</button></form>
            <div className={panelClass}><h3 className="mb-4 font-extrabold">Your pooling requests</h3>{poolRequests.length === 0 ? <EmptyState text="You haven't posted a shared commute yet." /> : <div className="space-y-3">{poolRequests.map((request) => <div key={request.id} className="rounded-xl border border-slate-200 p-4"><div className="flex justify-between gap-2"><div><p className="font-bold">{request.from} → {request.to}</p><p className="mt-1 text-xs text-slate-500">{prettyDate(request.date)} · {request.seats} seat(s) {request.note ? `· ${request.note}` : ''}</p></div><button onClick={() => setPoolRequests((items) => items.map((item) => item.id === request.id ? { ...item, status: 'CANCELLED' } : item))} className="text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div><span className="mt-3 inline-block rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">{request.status}</span></div>)}</div>}</div>
          </>}

          {activeTab === 'chat' && <div className={`${panelClass} flex min-h-[520px] flex-col`}><div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-4"><span className="rounded-xl bg-brand-100 p-2.5 text-brand-800"><MessageCircle className="h-5 w-5" /></span><div><h3 className="font-extrabold">VeloGo help desk · Demo inbox</h3><p className="text-xs text-slate-500">Messages are stored in this browser only.</p></div></div><div className="flex-1 space-y-3 overflow-y-auto py-2">{messages.length === 0 ? <EmptyState text="Start a conversation by sending a message below." /> : messages.map((message) => <div key={message.id} className={`flex ${message.sender === 'ME' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${message.sender === 'ME' ? 'rounded-br-sm bg-slate-900 text-white' : 'rounded-bl-sm bg-slate-100 text-slate-700'}`}><p>{message.text}</p><p className={`mt-1 text-[10px] ${message.sender === 'ME' ? 'text-slate-300' : 'text-slate-400'}`}>{message.sender === 'ME' ? 'You' : 'VeloGo'} · {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div></div>)}</div><form onSubmit={sendMessage} className="mt-4 flex gap-2 border-t border-slate-100 pt-4"><input className={inputClass} value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="Type your message..." /><button className={primaryButton} aria-label="Send message"><Send className="h-4 w-4" /></button></form></div>}

          {activeTab === 'lost' && <><form onSubmit={submitLostReport} className={`${panelClass} space-y-4`}><div><h3 className="font-extrabold">Report a lost item</h3><p className="mt-1 text-xs text-slate-500">Provide trip details and a way for the support team to contact you.</p></div><div className="grid gap-4 sm:grid-cols-2"><label><span className={labelClass}>Related ride (optional)</span><select className={inputClass} value={lostForm.rideId} onChange={(e) => setLostForm({ ...lostForm, rideId: e.target.value })}><option value="">Select a ride</option>{rides.map((ride) => <option key={ride.id} value={ride.id}>#{ride.id.slice(0, 8)} · {ride.pickupAddress} to {ride.destAddress}</option>)}</select></label><label><span className={labelClass}>Item lost</span><input className={inputClass} value={lostForm.item} onChange={(e) => setLostForm({ ...lostForm, item: e.target.value })} placeholder="e.g. Black backpack" required /></label></div><label><span className={labelClass}>Description</span><textarea className={inputClass} rows={3} value={lostForm.description} onChange={(e) => setLostForm({ ...lostForm, description: e.target.value })} placeholder="Describe the item and where you may have left it." /></label><label><span className={labelClass}>Contact phone</span><input className={inputClass} value={lostForm.contact} onChange={(e) => setLostForm({ ...lostForm, contact: e.target.value })} required /></label><button className={primaryButton}><PackageSearch className="h-4 w-4" /> Submit lost-item report</button></form><div className={panelClass}><h3 className="mb-4 font-extrabold">Your reports</h3>{lostReports.length === 0 ? <EmptyState text="No lost-item reports submitted." /> : <div className="space-y-3">{lostReports.map((report) => <div key={report.id} className="rounded-xl border border-slate-200 p-4"><div className="flex justify-between gap-3"><div><p className="font-bold">{report.item}</p><p className="mt-1 text-xs text-slate-500">{report.description || 'No additional description'} · {report.contact}</p></div><span className="h-fit rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700">{report.status}</span></div></div>)}</div>}</div></>}

          {activeTab === 'rewards' && <><div className="rounded-3xl bg-gradient-to-br from-amber-400 via-yellow-300 to-orange-300 p-6 text-slate-950 shadow-lg sm:p-8"><div className="flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-widest text-amber-950/70">VeloGo rewards · estimate</p><p className="mt-2 text-5xl font-black">{rewardPoints.toLocaleString()} <span className="text-lg">pts</span></p><p className="mt-2 text-sm font-semibold text-amber-950/80">Estimated at 1 point for every ₹10 spent on completed rides.</p></div><Award className="h-12 w-12 text-amber-950/60" /></div><div className="mt-6 h-2 overflow-hidden rounded-full bg-white/50"><div className="h-full rounded-full bg-slate-950" style={{ width: `${rewardPoints % 100}%` }} /></div><p className="mt-2 text-xs font-bold text-amber-950/70">{rewardPoints % 100}/100 points toward the next demo milestone</p></div><div className={panelClass}><h3 className="font-extrabold">How points are estimated</h3><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><Coins className="mb-2 h-5 w-5 text-amber-600" /><p className="text-xs text-slate-500">Total eligible spend</p><p className="mt-1 text-xl font-black">₹{totalSpend.toFixed(0)}</p></div><div className="rounded-xl bg-slate-50 p-4"><CarFront className="mb-2 h-5 w-5 text-brand-700" /><p className="text-xs text-slate-500">Completed rides</p><p className="mt-1 text-xl font-black">{completedRides.length}</p></div><div className="rounded-xl bg-slate-50 p-4"><Award className="mb-2 h-5 w-5 text-amber-600" /><p className="text-xs text-slate-500">Estimated points</p><p className="mt-1 text-xl font-black">{rewardPoints}</p></div></div><p className="mt-4 text-xs leading-5 text-slate-500">This is an illustrative loyalty calculation based on your ride history. It does not issue redeemable credits or change your payment balance.</p></div></>}

          {activeTab === 'contacts' && <><div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><ShieldCheck className="mr-2 inline h-4 w-4" />These additional contacts are saved in this browser. They are not automatically notified during an emergency.</div><form onSubmit={addContact} className={`${panelClass} space-y-4`}><h3 className="font-extrabold">Add a trusted contact</h3><div className="grid gap-4 sm:grid-cols-3"><label><span className={labelClass}>Full name</span><input className={inputClass} value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} required placeholder="Contact name" /></label><label><span className={labelClass}>Phone number</span><input className={inputClass} value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} required placeholder="+91..." /></label><label><span className={labelClass}>Relationship</span><input className={inputClass} value={contactForm.relation} onChange={(e) => setContactForm({ ...contactForm, relation: e.target.value })} placeholder="Family, friend..." /></label></div><button className={primaryButton} disabled={contacts.length >= 5}><Plus className="h-4 w-4" /> Add trusted contact</button></form><div className={panelClass}><h3 className="mb-4 font-extrabold">Saved contacts ({contacts.length}/5)</h3>{contacts.length === 0 ? <EmptyState text="Add people you would want to contact in an emergency." /> : <div className="space-y-2">{contacts.map((contact) => <div key={contact.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><div className="flex items-center gap-3"><span className="rounded-full bg-slate-100 p-2 text-slate-500"><Phone className="h-4 w-4" /></span><div><p className="text-sm font-bold">{contact.name}</p><p className="text-xs text-slate-500">{contact.phone} {contact.relation ? `· ${contact.relation}` : ''}</p></div></div><button onClick={() => setContacts((items) => items.filter((item) => item.id !== contact.id))} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div>)}</div>}</div></>}

          {activeTab === 'analytics' && <><div className="grid gap-3 sm:grid-cols-3"><MetricCard icon={CarFront} label="Completed rides" value={completedRides.length.toString()} /><MetricCard icon={MapPin} label="Distance travelled" value={`${totalDistance.toFixed(1)} km`} /><MetricCard icon={Coins} label="Total ride spend" value={`₹${totalSpend.toFixed(0)}`} /></div><div className={panelClass}><div className="mb-5 flex items-center justify-between"><div><h3 className="font-extrabold">Recent completed rides</h3><p className="mt-1 text-xs text-slate-500">Based on your existing VeloGo ride history.</p></div><ChartNoAxesCombined className="h-5 w-5 text-brand-700" /></div>{loadingRides ? <p className="py-8 text-center text-sm text-slate-400">Loading your ride history...</p> : recentRides.length === 0 ? <EmptyState text="Complete a ride to start seeing your travel insights." /> : <div className="space-y-4">{recentRides.map((ride) => { const fare = ride.finalFare || ride.estimatedFare || 0; return <div key={ride.id}><div className="mb-1 flex justify-between gap-3 text-xs"><span className="font-bold text-slate-700">{ride.pickupAddress} → {ride.destAddress}</span><span className="font-black text-slate-900">₹{fare.toFixed(0)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.max(4, fare / maxSpend * 100)}%` }} /></div><p className="mt-1 text-[10px] text-slate-400">{ride.distanceKm} km · {new Date(ride.createdAt).toLocaleDateString()}</p></div>; })}</div>}</div></>}
        </main>
      </div>
      <p className="text-center text-[11px] leading-5 text-slate-400">Feature extension prototype: planning records, chat demo, pooling requests, lost-item reports and extra contacts are stored in this browser. Production use requires authenticated backend APIs, database persistence and operational workflows.</p>
    </div>
  );
};

const EmptyState: React.FC<{ text: string }> = ({ text }) => <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center"><Clock3 className="mx-auto mb-2 h-7 w-7 text-slate-300" /><p className="text-sm text-slate-500">{text}</p></div>;
const MetricCard: React.FC<{ icon: React.ElementType; label: string; value: string }> = ({ icon: Icon, label, value }) => <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="inline-flex rounded-xl bg-brand-50 p-2.5 text-brand-800"><Icon className="h-5 w-5" /></span><p className="mt-3 text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-slate-900">{value}</p></div>;
