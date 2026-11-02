import React, { useMemo, useState } from 'react';
import { CalendarDays, Check, Clipboard, Copy, Plus, Trash2, Users } from 'lucide-react';
import { appendExtendedRecord, createStoredRecord, readExtendedCollection, recordExtendedAudit, StoredRecord, writeExtendedCollection } from '../extendedFeatureStore';
import { formatIndianCurrency } from '../extendedFeatureStore';

interface GroupMember {
  id: string;
  name: string;
  role: 'ORGANIZER' | 'MEMBER';
  confirmed: boolean;
  contribution: number;
}
interface GroupTask {
  id: string;
  title: string;
  owner: string;
  completed: boolean;
  dueDate: string;
}
interface GroupTrip extends StoredRecord {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  organizer: string;
  members: GroupMember[];
  tasks: GroupTask[];
  budgetPerPerson: number;
  notes: string;
  status: 'PLANNING' | 'READY' | 'COMPLETED';
}
interface Props { userId: string; userName: string; onNotice: (message: string, tone?: 'success' | 'error' | 'info') => void; }

const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100';
const label = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500';
const newId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

function tripProgress(trip: GroupTrip): number {
  const memberScore = trip.members.length ? trip.members.filter((member) => member.confirmed).length / trip.members.length : 0;
  const taskScore = trip.tasks.length ? trip.tasks.filter((task) => task.completed).length / trip.tasks.length : 0;
  return Math.round((memberScore * 0.4 + taskScore * 0.6) * 100);
}

export const GroupTripOrganizerModule: React.FC<Props> = ({ userId, userName, onNotice }) => {
  const [records, setRecords] = useState<GroupTrip[]>(() => readExtendedCollection<GroupTrip>(userId, 'group-trips'));
  const [title, setTitle] = useState('Weekend getaway');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('3000');
  const [notes, setNotes] = useState('');
  const [memberName, setMemberName] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = records.find((item) => item.id === activeId) || null;
  const visible = useMemo(() => [...records].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [records]);
  const totalMembers = records.reduce((sum, item) => sum + item.members.length, 0);
  const completedTasks = records.reduce((sum, item) => sum + item.tasks.filter((task) => task.completed).length, 0);
  const refresh = () => setRecords(readExtendedCollection<GroupTrip>(userId, 'group-trips'));

  const createTrip = (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(budget);
    if (!title.trim() || !destination.trim()) return onNotice('Enter a trip name and destination.', 'error');
    if (!startDate || !endDate || endDate < startDate) return onNotice('Choose a valid trip date range.', 'error');
    if (!Number.isFinite(amount) || amount < 0) return onNotice('Enter a valid per-person budget.', 'error');
    const record = createStoredRecord({
      title: title.trim(),
      destination: destination.trim(),
      startDate,
      endDate,
      organizer: userName,
      members: [{ id: newId('member'), name: userName, role: 'ORGANIZER' as const, confirmed: true, contribution: 0 }],
      tasks: [],
      budgetPerPerson: amount,
      notes: notes.trim(),
      status: 'PLANNING' as const,
    }) as GroupTrip;
    const result = appendExtendedRecord(userId, 'group-trips', record);
    if (!result.ok) return onNotice(result.error || 'Could not create group trip.', 'error');
    recordExtendedAudit(userId, { collection: 'group-trips', action: 'CREATE', recordId: record.id, message: `Created group trip: ${record.title}` });
    refresh();
    setActiveId(record.id);
    setTitle(''); setDestination(''); setNotes('');
    onNotice('Group trip workspace created.');
  };

  const addMember = () => {
    if (!active) return;
    if (!memberName.trim()) return onNotice('Enter a member name.', 'error');
    if (active.members.length >= 20) return onNotice('A group trip can have up to 20 members.', 'info');
    if (active.members.some((member) => member.name.toLowerCase() === memberName.trim().toLowerCase())) return onNotice('That member is already on the list.', 'error');
    const next = records.map((trip) => trip.id === active.id ? { ...trip, members: [...trip.members, { id: newId('member'), name: memberName.trim(), role: 'MEMBER' as const, confirmed: false, contribution: 0 }], updatedAt: new Date().toISOString(), version: trip.version + 1 } : trip);
    const result = writeExtendedCollection(userId, 'group-trips', next);
    if (!result.ok) return onNotice(result.error || 'Could not add member.', 'error');
    refresh(); setMemberName('');
    onNotice('Member added to the planning list.');
  };

  const toggleMember = (member: GroupMember) => {
    if (!active) return;
    const next = records.map((trip) => trip.id === active.id ? { ...trip, members: trip.members.map((item) => item.id === member.id ? { ...item, confirmed: !item.confirmed } : item), updatedAt: new Date().toISOString(), version: trip.version + 1 } : trip);
    const result = writeExtendedCollection(userId, 'group-trips', next);
    if (!result.ok) return onNotice(result.error || 'Could not update member.', 'error');
    refresh();
  };

  const addTask = () => {
    if (!active) return;
    if (!taskTitle.trim()) return onNotice('Enter a task description.', 'error');
    if (active.tasks.length >= 60) return onNotice('A trip can have up to 60 tasks.', 'info');
    const task: GroupTask = { id: newId('task'), title: taskTitle.trim(), owner: userName, completed: false, dueDate: '' };
    const next = records.map((trip) => trip.id === active.id ? { ...trip, tasks: [...trip.tasks, task], updatedAt: new Date().toISOString(), version: trip.version + 1 } : trip);
    const result = writeExtendedCollection(userId, 'group-trips', next);
    if (!result.ok) return onNotice(result.error || 'Could not add task.', 'error');
    refresh(); setTaskTitle('');
    onNotice('Planning task added.');
  };

  const toggleTask = (task: GroupTask) => {
    if (!active) return;
    const next = records.map((trip) => trip.id === active.id ? { ...trip, tasks: trip.tasks.map((item) => item.id === task.id ? { ...item, completed: !item.completed } : item), updatedAt: new Date().toISOString(), version: trip.version + 1 } : trip);
    const result = writeExtendedCollection(userId, 'group-trips', next);
    if (!result.ok) return onNotice(result.error || 'Could not update task.', 'error');
    refresh();
  };

  const removeTrip = (trip: GroupTrip) => {
    if (!window.confirm(`Delete group trip "${trip.title}"?`)) return;
    const result = writeExtendedCollection(userId, 'group-trips', records.filter((item) => item.id !== trip.id));
    if (!result.ok) return onNotice(result.error || 'Could not delete trip.', 'error');
    refresh(); setActiveId(null);
    onNotice('Group trip deleted.');
  };

  const copySummary = async (trip: GroupTrip) => {
    const summary = `${trip.title}\nDestination: ${trip.destination}\nDates: ${trip.startDate} to ${trip.endDate}\nOrganizer: ${trip.organizer}\nMembers: ${trip.members.map((item) => `${item.name}${item.confirmed ? ' (confirmed)' : ''}`).join(', ')}\nBudget per person: ${formatIndianCurrency(trip.budgetPerPerson)}`;
    try { await navigator.clipboard.writeText(summary); onNotice('Trip summary copied.'); }
    catch { onNotice('Clipboard access is unavailable.', 'error'); }
  };

  return <div className="space-y-6">
    <section className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-5"><div className="flex items-center gap-3"><span className="rounded-xl bg-white p-3 text-violet-700 shadow-sm"><Users className="h-6 w-6" /></span><div><h3 className="text-lg font-black text-slate-900">Group trip organizer</h3><p className="text-sm text-slate-500">Keep people, tasks and a shared budget estimate together.</p></div></div><div className="mt-5 grid grid-cols-3 gap-3"><Summary label="Group trips" value={String(records.length)} /><Summary label="Members listed" value={String(totalMembers)} /><Summary label="Tasks completed" value={String(completedTasks)} /></div></section>
    <form onSubmit={createTrip} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-black text-slate-900">Start a group trip</h3><div className="grid gap-3 md:grid-cols-2"><label><span className={label}>Trip name</span><input className={field} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} /></label><label><span className={label}>Destination</span><input className={field} value={destination} onChange={(event) => setDestination(event.target.value)} maxLength={160} /></label><label><span className={label}>Start date</span><input className={field} type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label><span className={label}>End date</span><input className={field} type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label><label><span className={label}>Budget per person (₹)</span><input className={field} type="number" min="0" value={budget} onChange={(event) => setBudget(event.target.value)} /></label><label><span className={label}>Notes</span><input className={field} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={200} /></label></div><button className="rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-extrabold text-white"><Plus className="mr-1 inline h-4 w-4" /> Create group trip</button></form>
    <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]"><div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-black text-slate-900">Your group trips</h3>{visible.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No group trips yet.</p> : <div className="mt-3 space-y-2">{visible.map((trip) => <button key={trip.id} onClick={() => setActiveId(trip.id)} className={`w-full rounded-xl border p-3 text-left ${activeId === trip.id ? 'border-violet-300 bg-violet-50' : 'border-slate-200'}`}><p className="font-bold text-slate-800">{trip.title}</p><p className="mt-1 text-xs text-slate-500">{trip.destination} · {trip.startDate}</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-violet-500" style={{ width: `${tripProgress(trip)}%` }} /></div></button>)}</div>}</div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">{!active ? <div className="py-10 text-center"><CalendarDays className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-bold text-slate-700">Choose a group trip</p><p className="text-xs text-slate-400">Its members and tasks will appear here.</p></div> : <><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-black text-slate-900">{active.title}</h3><p className="text-xs text-slate-500">{active.destination} · {active.startDate} to {active.endDate}</p></div><div className="flex gap-2"><button onClick={() => copySummary(active)} className="rounded-lg border border-slate-200 p-2" aria-label="Copy trip summary"><Copy className="h-4 w-4" /></button><button onClick={() => removeTrip(active)} className="rounded-lg p-2 text-rose-500" aria-label="Delete trip"><Trash2 className="h-4 w-4" /></button></div></div><div className="mt-4 grid grid-cols-2 gap-3"><Summary label="Progress" value={`${tripProgress(active)}%`} /><Summary label="Estimated group budget" value={formatIndianCurrency(active.budgetPerPerson * active.members.length)} /></div><div className="mt-5"><h4 className="font-extrabold text-slate-800">Members</h4><div className="mt-2 flex gap-2"><input className={field} value={memberName} onChange={(event) => setMemberName(event.target.value)} placeholder="Add member name" /><button onClick={addMember} className="rounded-xl bg-violet-700 px-3 text-white"><Plus className="h-4 w-4" /></button></div><div className="mt-2 space-y-2">{active.members.map((member) => <div key={member.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-2"><div><p className="text-sm font-bold text-slate-800">{member.name}</p><p className="text-[10px] text-slate-400">{member.role}</p></div><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={member.confirmed} onChange={() => toggleMember(member)} /> Confirmed</label></div>)}</div></div><div className="mt-5 border-t border-slate-100 pt-4"><h4 className="font-extrabold text-slate-800">Planning tasks</h4><div className="mt-2 flex gap-2"><input className={field} value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Book accommodation" /><button onClick={addTask} className="rounded-xl bg-violet-700 px-3 text-white"><Plus className="h-4 w-4" /></button></div><div className="mt-2 space-y-2">{active.tasks.map((task) => <label key={task.id} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2 text-sm"><input type="checkbox" checked={task.completed} onChange={() => toggleTask(task)} /><span className={task.completed ? 'text-slate-400 line-through' : 'text-slate-700'}>{task.title}</span></label>)}</div></div></>}</div></section>
    <p className="text-xs text-slate-400">Group members are labels entered by you. This demo does not invite accounts, send messages, reserve seats or collect contributions.</p>
  </div>;
};

const Summary: React.FC<{ label: string; value: string }> = ({ label: title, value }) => <div className="rounded-xl border border-violet-100 bg-white p-3"><p className="text-[10px] font-bold uppercase text-slate-400">{title}</p><p className="mt-1 truncate text-lg font-black text-slate-900">{value}</p></div>;
