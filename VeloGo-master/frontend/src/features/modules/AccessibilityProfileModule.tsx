import React, { useMemo, useState } from 'react';
import { Accessibility, Bell, Check, Edit3, Eye, Plus, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { appendExtendedRecord, createStoredRecord, readExtendedCollection, recordExtendedAudit, StoredRecord, writeExtendedCollection } from '../extendedFeatureStore';

type Assistance = 'NONE' | 'WALKING_SUPPORT' | 'HEARING_SUPPORT' | 'VISUAL_SUPPORT' | 'FOLDING_WHEELCHAIR' | 'EXTRA_TIME' | 'PICKUP_GUIDANCE';
type Communication = 'CALL' | 'SMS' | 'IN_APP' | 'NO_CALL';
interface AccessibilityProfile extends StoredRecord {
  name: string;
  isDefault: boolean;
  assistance: Assistance[];
  communication: Communication;
  language: string;
  pickupInstruction: string;
  driverNote: string;
  avoidStairs: boolean;
  needsExtraBoardingTime: boolean;
  allowDriverCall: boolean;
  emergencyNote: string;
}

interface Props { userId: string; onNotice: (message: string, tone?: 'success' | 'error' | 'info') => void; }

const assistanceOptions: Array<{ id: Assistance; title: string; description: string }> = [
  { id: 'NONE', title: 'No assistance needed', description: 'Standard pickup and boarding.' },
  { id: 'WALKING_SUPPORT', title: 'Walking support', description: 'Allow additional time to reach the vehicle.' },
  { id: 'HEARING_SUPPORT', title: 'Hearing support', description: 'Prefer written or in-app instructions.' },
  { id: 'VISUAL_SUPPORT', title: 'Visual guidance', description: 'Provide clear pickup landmarks and directions.' },
  { id: 'FOLDING_WHEELCHAIR', title: 'Folding wheelchair', description: 'I may need space for a folding wheelchair.' },
  { id: 'EXTRA_TIME', title: 'Extra boarding time', description: 'Please wait a little longer at pickup.' },
  { id: 'PICKUP_GUIDANCE', title: 'Pickup guidance', description: 'Call or message when the vehicle arrives.' },
];

const communicationOptions: Array<{ id: Communication; title: string }> = [
  { id: 'IN_APP', title: 'In-app messages' },
  { id: 'SMS', title: 'SMS' },
  { id: 'CALL', title: 'Phone call' },
  { id: 'NO_CALL', title: 'Do not call unless necessary' },
];

const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100';
const label = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500';

function emptyProfile(): Omit<AccessibilityProfile, keyof StoredRecord> {
  return {
    name: 'My travel preferences',
    isDefault: true,
    assistance: [],
    communication: 'IN_APP',
    language: 'English',
    pickupInstruction: '',
    driverNote: '',
    avoidStairs: false,
    needsExtraBoardingTime: false,
    allowDriverCall: true,
    emergencyNote: '',
  };
}

function validateProfile(profile: Omit<AccessibilityProfile, keyof StoredRecord>): string | null {
  if (!profile.name.trim()) return 'Enter a profile name.';
  if (profile.name.length > 60) return 'Profile name must be 60 characters or fewer.';
  if (profile.pickupInstruction.length > 300) return 'Pickup instructions are too long.';
  if (profile.driverNote.length > 300) return 'Driver note is too long.';
  if (profile.emergencyNote.length > 300) return 'Emergency note is too long.';
  return null;
}

export const AccessibilityProfileModule: React.FC<Props> = ({ userId, onNotice }) => {
  const [profiles, setProfiles] = useState<AccessibilityProfile[]>(() => readExtendedCollection<AccessibilityProfile>(userId, 'accessibility-profiles'));
  const [draft, setDraft] = useState(emptyProfile());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showSensitive, setShowSensitive] = useState(false);

  const visible = useMemo(() => profiles
    .filter((profile) => `${profile.name} ${profile.language} ${profile.driverNote}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || b.updatedAt.localeCompare(a.updatedAt)), [profiles, search]);

  const refresh = () => setProfiles(readExtendedCollection<AccessibilityProfile>(userId, 'accessibility-profiles'));

  const updateDraft = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const toggleAssistance = (value: Assistance) => {
    setDraft((current) => {
      const selected: Assistance[] = current.assistance.includes(value)
        ? current.assistance.filter((item) => item !== value)
        : value === 'NONE'
          ? ['NONE']
          : [...current.assistance.filter((item) => item !== 'NONE'), value];
      return { ...current, assistance: selected };
    });
  };

  const startCreate = () => {
    setEditingId(null);
    setDraft(emptyProfile());
    setShowForm(true);
  };

  const startEdit = (profile: AccessibilityProfile) => {
    setEditingId(profile.id);
    const { id, createdAt, updatedAt, version, ...values } = profile;
    setDraft(values);
    setShowForm(true);
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    const error = validateProfile(draft);
    if (error) return onNotice(error, 'error');
    const normalized = { ...draft, name: draft.name.trim() };
    let next: AccessibilityProfile[];
    if (editingId) {
      next = profiles.map((profile) => profile.id === editingId
        ? { ...profile, ...normalized, updatedAt: new Date().toISOString(), version: profile.version + 1 }
        : normalized.isDefault ? { ...profile, isDefault: false } : profile);
      recordExtendedAudit(userId, { collection: 'accessibility-profiles', action: 'UPDATE', recordId: editingId, message: `Updated accessibility profile: ${normalized.name}` });
    } else {
      const created = createStoredRecord(normalized) as AccessibilityProfile;
      next = normalized.isDefault ? profiles.map((profile) => ({ ...profile, isDefault: false })).concat(created) : [created, ...profiles];
      recordExtendedAudit(userId, { collection: 'accessibility-profiles', action: 'CREATE', recordId: created.id, message: `Created accessibility profile: ${normalized.name}` });
    }
    const result = writeExtendedCollection(userId, 'accessibility-profiles', next);
    if (!result.ok) return onNotice(result.error || 'Could not save profile.', 'error');
    refresh();
    setShowForm(false);
    setEditingId(null);
    setDraft(emptyProfile());
    onNotice('Travel preference profile saved.');
  };

  const makeDefault = (profile: AccessibilityProfile) => {
    const next = profiles.map((item) => ({ ...item, isDefault: item.id === profile.id, updatedAt: new Date().toISOString(), version: item.version + 1 }));
    const result = writeExtendedCollection(userId, 'accessibility-profiles', next);
    if (!result.ok) return onNotice(result.error || 'Could not update default profile.', 'error');
    recordExtendedAudit(userId, { collection: 'accessibility-profiles', action: 'UPDATE', recordId: profile.id, message: `Set ${profile.name} as the default profile.` });
    refresh();
    onNotice('Default travel profile updated.');
  };

  const remove = (profile: AccessibilityProfile) => {
    if (!window.confirm(`Delete "${profile.name}"?`)) return;
    const next = profiles.filter((item) => item.id !== profile.id);
    if (profile.isDefault && next.length) next[0] = { ...next[0], isDefault: true };
    const result = writeExtendedCollection(userId, 'accessibility-profiles', next);
    if (!result.ok) return onNotice(result.error || 'Could not delete profile.', 'error');
    recordExtendedAudit(userId, { collection: 'accessibility-profiles', action: 'DELETE', recordId: profile.id, message: `Deleted accessibility profile: ${profile.name}` });
    refresh();
    onNotice('Profile deleted.');
  };

  const cancelEdit = () => {
    setShowForm(false);
    setEditingId(null);
    setDraft(emptyProfile());
  };

  return <div className="space-y-6">
    <section className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="rounded-xl bg-white p-3 text-violet-700 shadow-sm"><Accessibility className="h-6 w-6" /></span><div><h3 className="text-lg font-black text-slate-900">Accessibility and travel preferences</h3><p className="text-sm text-slate-500">Save instructions that can make a future pickup more comfortable.</p></div></div><button onClick={startCreate} className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-extrabold text-white"><Plus className="h-4 w-4" /> New profile</button></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3"><InfoCard title="Profiles" value={String(profiles.length)} detail="Saved on this browser" /><InfoCard title="Default" value={profiles.find((item) => item.isDefault)?.name || 'Not set'} detail="Preference template" /><InfoCard title="Privacy" value="Your control" detail="Nothing is sent automatically" /></div>
    </section>

    {showForm && <form onSubmit={save} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between"><div><h3 className="font-black text-slate-900">{editingId ? 'Edit profile' : 'Create preference profile'}</h3><p className="text-xs text-slate-500">Only include details you are comfortable saving.</p></div><button type="button" onClick={cancelEdit} className="text-xs font-bold text-slate-500">Cancel</button></div>
      <div className="grid gap-3 md:grid-cols-2">
        <label><span className={label}>Profile name</span><input className={field} value={draft.name} onChange={(event) => updateDraft('name', event.target.value)} maxLength={60} /></label>
        <label><span className={label}>Preferred language</span><select className={field} value={draft.language} onChange={(event) => updateDraft('language', event.target.value)}><option>English</option><option>Telugu</option><option>Hindi</option><option>Tamil</option><option>Kannada</option><option>Malayalam</option><option>Other</option></select></label>
      </div>
      <div><h4 className="mb-2 text-sm font-extrabold text-slate-800">Assistance preferences</h4><div className="grid gap-2 sm:grid-cols-2">{assistanceOptions.map((option) => <label key={option.id} className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50"><input type="checkbox" checked={draft.assistance.includes(option.id)} onChange={() => toggleAssistance(option.id)} className="mt-1" /><span><span className="block text-sm font-bold text-slate-800">{option.title}</span><span className="mt-0.5 block text-xs text-slate-500">{option.description}</span></span></label>)}</div></div>
      <div className="grid gap-3 md:grid-cols-2">
        <label><span className={label}>Preferred communication</span><select className={field} value={draft.communication} onChange={(event) => updateDraft('communication', event.target.value as Communication)}>{communicationOptions.map((option) => <option key={option.id} value={option.id}>{option.title}</option>)}</select></label>
        <label className="flex items-center gap-2 pt-6 text-sm font-semibold text-slate-700"><input type="checkbox" checked={draft.isDefault} onChange={(event) => updateDraft('isDefault', event.target.checked)} /> Make this my default profile</label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label><span className={label}>Pickup instructions</span><textarea className={field} rows={3} maxLength={300} value={draft.pickupInstruction} onChange={(event) => updateDraft('pickupInstruction', event.target.value)} placeholder="For example, please wait near the main gate." /></label>
        <label><span className={label}>Optional driver note</span><textarea className={field} rows={3} maxLength={300} value={draft.driverNote} onChange={(event) => updateDraft('driverNote', event.target.value)} placeholder="A short note relevant to pickup." /></label>
      </div>
      <div className="grid gap-2 sm:grid-cols-3"><Toggle label="Avoid stairs where possible" checked={draft.avoidStairs} onChange={(value) => updateDraft('avoidStairs', value)} /><Toggle label="Allow extra boarding time" checked={draft.needsExtraBoardingTime} onChange={(value) => updateDraft('needsExtraBoardingTime', value)} /><Toggle label="Driver may call on arrival" checked={draft.allowDriverCall} onChange={(value) => updateDraft('allowDriverCall', value)} /></div>
      <div className="rounded-xl border border-amber-100 bg-amber-50 p-3"><button type="button" onClick={() => setShowSensitive((value) => !value)} className="inline-flex items-center gap-2 text-xs font-bold text-amber-900"><Eye className="h-4 w-4" /> {showSensitive ? 'Hide' : 'Show'} optional private note</button>{showSensitive && <label className="mt-3 block"><span className={label}>Private note for your own reference</span><textarea className={field} rows={2} maxLength={300} value={draft.emergencyNote} onChange={(event) => updateDraft('emergencyNote', event.target.value)} placeholder="Avoid adding medical or highly sensitive information." /></label>}</div>
      <button className="rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-extrabold text-white">Save preferences</button>
    </form>}

    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black text-slate-900">Saved profiles</h3><p className="text-xs text-slate-500">These are templates only; they are not automatically attached to a booking.</p></div><input className="w-48 rounded-lg border border-slate-200 px-3 py-2 text-xs" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search profiles" /></div>
      {visible.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No profiles yet. Create one when you need a reusable pickup preference.</p> : <div className="mt-4 grid gap-3 md:grid-cols-2">{visible.map((profile) => <article key={profile.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-2"><div><div className="flex flex-wrap items-center gap-2"><h4 className="font-extrabold text-slate-900">{profile.name}</h4>{profile.isDefault && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">DEFAULT</span>}</div><p className="mt-1 text-xs text-slate-500">{profile.language} · {profile.communication.replace('_', ' ')}</p></div><UserRound className="h-5 w-5 text-violet-500" /></div><div className="mt-3 flex flex-wrap gap-1">{profile.assistance.length ? profile.assistance.map((item) => <span key={item} className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700">{assistanceOptions.find((option) => option.id === item)?.title || item}</span>) : <span className="text-xs text-slate-400">No assistance selected</span>}</div><p className="mt-3 line-clamp-2 text-xs text-slate-500">{profile.pickupInstruction || profile.driverNote || 'No pickup instructions saved.'}</p><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => startEdit(profile)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold"><Edit3 className="h-3.5 w-3.5" /> Edit</button>{!profile.isDefault && <button onClick={() => makeDefault(profile)} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"><Check className="mr-1 inline h-3.5 w-3.5" /> Set default</button>}<button onClick={() => remove(profile)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50" aria-label={`Delete ${profile.name}`}><Trash2 className="h-4 w-4" /></button></div></article>)}</div>}
    </section>
    <p className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> Preference profiles are stored in this browser. They are not transmitted to captains or attached to rides. Avoid storing medical details, access codes or other sensitive information here.</p>
  </div>;
};

const InfoCard: React.FC<{ title: string; value: string; detail: string }> = ({ title, value, detail }) => <div className="rounded-xl border border-violet-100 bg-white p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{title}</p><p className="mt-1 truncate text-lg font-black text-slate-900">{value}</p><p className="text-[10px] text-slate-500">{detail}</p></div>;
const Toggle: React.FC<{ label: string; checked: boolean; onChange: (value: boolean) => void }> = ({ label: title, checked, onChange }) => <label className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-700"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />{title}</label>;
