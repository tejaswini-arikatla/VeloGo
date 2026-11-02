import React, { useMemo, useState } from 'react';
import { Check, ContactRound, Edit3, Phone, Plus, ShieldCheck, Star, Trash2, UserRound } from 'lucide-react';
import { createFeatureRecord, ContactRelationship, TrustedContact } from '../featureModels';
import { appendRecord, readCollection, recordAudit, updateCollection } from '../featureStorage';
import { firstIssue, getRelationshipLabel, normalizePhone, validateTrustedContact } from '../featureValidation';

interface Props { userId: string; onNotice: (message: string, tone?: 'success' | 'error' | 'info') => void; }
type ContactForm = { name: string; phone: string; relationship: ContactRelationship; isPrimary: boolean; shareTripByDefault: boolean; notes: string };
const blank = (): ContactForm => ({ name: '', phone: '', relationship: 'FAMILY', isPrimary: false, shareTripByDefault: false, notes: '' });
const input = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100';

export const TrustedContactsModule: React.FC<Props> = ({ userId, onNotice }) => {
  const [contacts, setContacts] = useState(() => readCollection(userId, 'contacts'));
  const [form, setForm] = useState<ContactForm>(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [relationshipFilter, setRelationshipFilter] = useState<'ALL' | ContactRelationship>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const visible = useMemo(() => contacts
    .filter((contact) => relationshipFilter === 'ALL' || contact.relationship === relationshipFilter)
    .filter((contact) => `${contact.name} ${contact.phone} ${contact.notes}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.name.localeCompare(b.name)), [contacts, relationshipFilter, search]);
  const refresh = () => setContacts(readCollection(userId, 'contacts'));
  const update = <K extends keyof ContactForm>(key: K, value: ContactForm[K]) => setForm((current) => ({ ...current, [key]: value }));

  const openNew = () => { setEditingId(null); setForm(blank()); setShowForm(true); };
  const openEdit = (contact: TrustedContact) => {
    setEditingId(contact.id);
    setForm({ name: contact.name, phone: contact.phone, relationship: contact.relationship, isPrimary: contact.isPrimary, shareTripByDefault: contact.shareTripByDefault, notes: contact.notes });
    setShowForm(true);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const candidate = { ...form, phone: normalizePhone(form.phone) };
    const validation = validateTrustedContact(candidate, contacts);
    if (!validation.valid) { onNotice(firstIssue(validation) || 'Check the contact details.', 'error'); return; }
    if (editingId) {
      updateCollection(userId, 'contacts', (items) => items.map((contact) => contact.id === editingId
        ? { ...contact, ...candidate, updatedAt: new Date().toISOString(), version: contact.version + 1 }
        : candidate.isPrimary ? { ...contact, isPrimary: false, updatedAt: new Date().toISOString(), version: contact.version + 1 } : contact));
      recordAudit(userId, 'contacts', 'UPDATED', `Updated trusted contact ${candidate.name}.`, editingId);
      onNotice('Trusted contact updated.');
    } else {
      const record = createFeatureRecord(candidate) as TrustedContact;
      updateCollection(userId, 'contacts', (items) => [record, ...items.map((contact) => candidate.isPrimary ? { ...contact, isPrimary: false } : contact)]);
      recordAudit(userId, 'contacts', 'CREATED', `Added trusted contact ${candidate.name}.`, record.id);
      onNotice('Trusted contact saved on this device.');
    }
    refresh(); setForm(blank()); setEditingId(null); setShowForm(false);
  };

  const remove = (contact: TrustedContact) => {
    if (!window.confirm(`Remove ${contact.name} from trusted contacts?`)) return;
    updateCollection(userId, 'contacts', (items) => items.filter((item) => item.id !== contact.id));
    recordAudit(userId, 'contacts', 'DELETED', `Removed trusted contact ${contact.name}.`, contact.id);
    refresh(); onNotice('Contact removed.');
  };

  const makePrimary = (contact: TrustedContact) => {
    updateCollection(userId, 'contacts', (items) => items.map((item) => ({ ...item, isPrimary: item.id === contact.id, updatedAt: new Date().toISOString(), version: item.version + 1 })));
    refresh(); onNotice(`${contact.name} is now your primary trusted contact.`);
  };

  const copyPhone = async (contact: TrustedContact) => {
    try {
      await navigator.clipboard.writeText(contact.phone);
      setCopiedId(contact.id); window.setTimeout(() => setCopiedId(null), 1800);
    } catch { onNotice('Clipboard access is unavailable in this browser.', 'error'); }
  };

  return <section className="space-y-5">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-xl font-black text-slate-900">Trusted contacts</h2><p className="mt-1 text-sm text-slate-500">Keep important contact details available when planning or sharing a journey.</p></div><button onClick={openNew} disabled={contacts.length >= 10} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"><Plus className="h-4 w-4" /> Add contact</button></div>
    <div className="grid gap-3 sm:grid-cols-3"><Metric label="Saved contacts" value={contacts.length} /><Metric label="Trip sharing defaults" value={contacts.filter((contact) => contact.shareTripByDefault).length} /><Metric label="Primary contact" value={contacts.find((contact) => contact.isPrimary)?.name || 'Not set'} /></div>
    {showForm && <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 sm:grid-cols-2"><div className="sm:col-span-2"><h3 className="font-extrabold text-slate-900">{editingId ? 'Edit contact' : 'Add trusted contact'}</h3><p className="text-xs text-slate-500">Add up to 10 contacts. Contact data stays in this browser in the current prototype.</p></div><Field label="Full name"><input className={input} value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Contact name" /></Field><Field label="Phone number"><input className={input} value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="+91 98765 43210" /></Field><Field label="Relationship"><select className={input} value={form.relationship} onChange={(event) => update('relationship', event.target.value as ContactRelationship)}><option value="FAMILY">Family</option><option value="FRIEND">Friend</option><option value="COLLEAGUE">Colleague</option><option value="OTHER">Other</option></select></Field><Field label="Notes"><input className={input} value={form.notes} onChange={(event) => update('notes', event.target.value)} placeholder="Optional note" /></Field><div className="flex flex-wrap gap-4 sm:col-span-2"><label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={form.isPrimary} onChange={(event) => update('isPrimary', event.target.checked)} /> Make primary contact</label><label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={form.shareTripByDefault} onChange={(event) => update('shareTripByDefault', event.target.checked)} /> Suggest for trip sharing</label></div><div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600">Cancel</button><button disabled={!editingId && contacts.length >= 10} className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white">{editingId ? 'Save changes' : 'Save contact'}</button></div></form>}
    <div className="flex flex-col gap-2 sm:flex-row"><input className={`${input} flex-1`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search contacts" /><select className={`${input} sm:max-w-48`} value={relationshipFilter} onChange={(event) => setRelationshipFilter(event.target.value as typeof relationshipFilter)}><option value="ALL">All relationships</option><option value="FAMILY">Family</option><option value="FRIEND">Friend</option><option value="COLLEAGUE">Colleague</option><option value="OTHER">Other</option></select></div>
    {visible.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center"><ContactRound className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 font-bold text-slate-700">No trusted contacts found</p><p className="mt-1 text-sm text-slate-500">Add family or friends you may want to contact during a trip.</p></div> : <div className="grid gap-3 md:grid-cols-2">{visible.map((contact) => <article key={contact.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-start gap-3"><span className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><UserRound className="h-5 w-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-extrabold text-slate-900">{contact.name}</h3>{contact.isPrimary && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-black text-amber-700"><Star className="mr-1 inline h-3 w-3" />Primary</span>}</div><p className="mt-1 text-xs text-slate-500">{getRelationshipLabel(contact.relationship)}</p><button onClick={() => copyPhone(contact)} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700"><Phone className="h-3.5 w-3.5" />{contact.phone}{copiedId === contact.id && <Check className="h-3.5 w-3.5" />}</button>{contact.notes && <p className="mt-2 text-xs text-slate-500">{contact.notes}</p>}</div></div><div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><span className="inline-flex items-center gap-1 text-[10px] text-slate-500"><ShieldCheck className="h-3 w-3" />{contact.shareTripByDefault ? 'Suggested for trip sharing' : 'Manual sharing only'}</span><div className="flex gap-1"><button onClick={() => makePrimary(contact)} title="Set primary" className="rounded-lg p-2 text-slate-400 hover:text-amber-500"><Star className="h-4 w-4" /></button><button onClick={() => openEdit(contact)} title="Edit" className="rounded-lg p-2 text-slate-400 hover:text-emerald-600"><Edit3 className="h-4 w-4" /></button><button onClick={() => remove(contact)} title="Remove" className="rounded-lg p-2 text-slate-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></div></div></article>)}</div>}
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><strong>Privacy note:</strong> Saving a contact does not send them a message or share your location. A future server-backed sharing feature should ask for permission each time and provide a clear stop-sharing control.</div>
  </section>;
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase text-slate-500">{label}</span>{children}</label>;
const Metric: React.FC<{ label: string; value: string | number }> = ({ label, value }) => <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 truncate text-xl font-black text-slate-900">{value}</p></div>;
