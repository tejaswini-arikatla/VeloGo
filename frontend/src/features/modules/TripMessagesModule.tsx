import React, { useMemo, useState } from 'react';
import { Archive, CheckCheck, MessageCircle, Plus, Send, ShieldAlert } from 'lucide-react';
import { Conversation, FeatureMessage } from '../featureModels';
import { appendRecord, readCollection, recordAudit, updateCollection } from '../featureStorage';
import { createFeatureRecord } from '../featureModels';
import { sanitizePlainText } from '../featureValidation';

interface Props { userId: string; userName: string; onNotice: (message: string, tone?: 'success' | 'error' | 'info') => void; }
type Category = FeatureMessage['category'];
const categories: Array<{ value: Category; label: string; hint: string }> = [
  { value: 'GENERAL', label: 'General question', hint: 'A general question about using VeloGo.' },
  { value: 'BOOKING', label: 'Booking help', hint: 'Help with a booking or a planned trip.' },
  { value: 'PAYMENT', label: 'Payment question', hint: 'A question about a fare or payment.' },
  { value: 'SAFETY', label: 'Safety concern', hint: 'Use emergency services first if anyone is in immediate danger.' },
  { value: 'LOST_ITEM', label: 'Lost item', hint: 'Follow up on an item report.' },
];
const quickReplies = [
  'How can I view my previous rides?',
  'Where can I find my payment receipt?',
  'How do I update my profile details?',
  'How can I cancel a booking?',
  'How do I report a lost item?',
];

export const TripMessagesModule: React.FC<Props> = ({ userId, userName, onNotice }) => {
  const [conversations, setConversations] = useState(() => readCollection(userId, 'conversations'));
  const [selectedId, setSelectedId] = useState<string | null>(conversations[0]?.id || null);
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<Category>('GENERAL');
  const [subject, setSubject] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState('');

  const selected = conversations.find((conversation) => conversation.id === selectedId) || null;
  const visible = useMemo(() => conversations
    .filter((conversation) => filter === 'ALL' || conversation.status === filter)
    .filter((conversation) => `${conversation.title} ${conversation.category}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)), [conversations, filter, search]);
  const refresh = () => setConversations(readCollection(userId, 'conversations'));

  const createConversation = (event: React.FormEvent) => {
    event.preventDefault();
    const cleanSubject = sanitizePlainText(subject, 100);
    if (!cleanSubject) { onNotice('Enter a subject for your conversation.', 'error'); return; }
    const now = new Date().toISOString();
    const conversation = createFeatureRecord({
      title: cleanSubject,
      category,
      status: 'OPEN' as const,
      lastMessageAt: now,
      unreadCount: 0,
      messages: [],
    }) as Conversation;
    appendRecord(userId, 'conversations', conversation);
    recordAudit(userId, 'messages', 'CREATED', `Started a support conversation: ${cleanSubject}.`, conversation.id);
    setSelectedId(conversation.id); setSubject(''); setShowNew(false); refresh();
    onNotice('Conversation created in your local inbox.');
  };

  const addMessage = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) { onNotice('Choose or create a conversation first.', 'error'); return; }
    const body = sanitizePlainText(message, 1500);
    if (!body) return;
    const now = new Date().toISOString();
    const nextMessage = createFeatureRecord({
      conversationId: selected.id,
      author: 'CUSTOMER' as const,
      authorName: userName,
      body,
      category: selected.category,
    }) as FeatureMessage;
    updateCollection(userId, 'conversations', (items) => items.map((conversation) => conversation.id === selected.id
      ? { ...conversation, status: 'WAITING', lastMessageAt: now, messages: [...conversation.messages, nextMessage], updatedAt: now, version: conversation.version + 1 }
      : conversation));
    recordAudit(userId, 'messages', 'MESSAGE_SENT', 'Added a message to a support conversation.', selected.id);
    setMessage(''); refresh(); onNotice('Message saved to your local conversation.');
  };

  const resolveConversation = (conversation: Conversation) => {
    updateCollection(userId, 'conversations', (items) => items.map((item) => item.id === conversation.id
      ? { ...item, status: item.status === 'RESOLVED' ? 'OPEN' : 'RESOLVED', updatedAt: new Date().toISOString(), version: item.version + 1 }
      : item));
    refresh(); onNotice(conversation.status === 'RESOLVED' ? 'Conversation reopened.' : 'Conversation marked resolved.');
  };

  const addQuickReply = (value: string) => setMessage(value);
  const selectedCategory = selected ? categories.find((item) => item.value === selected.category) : null;

  return <section className="space-y-5">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-xl font-black text-slate-900">Trip messages and support inbox</h2><p className="mt-1 text-sm text-slate-500">Organise questions by booking, payment, safety or lost-item topic.</p></div><button onClick={() => setShowNew((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white"><Plus className="h-4 w-4" /> New conversation</button></div>
    {showNew && <form onSubmit={createConversation} className="grid gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 sm:grid-cols-[1fr_200px_auto]"><label className="block"><span className="mb-1 block text-xs font-bold uppercase text-slate-500">Subject</span><input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="What do you need help with?" /></label><label className="block"><span className="mb-1 block text-xs font-bold uppercase text-slate-500">Category</span><select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" value={category} onChange={(event) => setCategory(event.target.value as Category)}>{categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><button className="self-end rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white">Create</button></form>}
    <div className="grid min-h-[460px] gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-3"><div className="flex gap-2"><input className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search inbox" /><select className="rounded-lg border border-slate-200 px-2 text-xs" value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}><option value="ALL">All</option><option value="OPEN">Open</option><option value="RESOLVED">Resolved</option></select></div><div className="mt-3 space-y-1">{visible.map((conversation) => <button key={conversation.id} onClick={() => setSelectedId(conversation.id)} className={`w-full rounded-xl p-3 text-left transition ${selectedId === conversation.id ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'}`}><div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-bold text-slate-800">{conversation.title}</span>{conversation.unreadCount > 0 && <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold text-white">{conversation.unreadCount}</span>}</div><p className="mt-1 text-[10px] uppercase text-slate-400">{conversation.category.replace('_', ' ')} · {conversation.status}</p><p className="mt-1 truncate text-xs text-slate-500">{conversation.messages.at(-1)?.body || 'No messages yet'}</p></button>)}{visible.length === 0 && <p className="px-3 py-8 text-center text-xs text-slate-400">No conversations found.</p>}</div></aside>
      <div className="flex min-h-[460px] flex-col rounded-2xl border border-slate-200 bg-white">{selected ? <><header className="flex items-center justify-between gap-3 border-b border-slate-100 p-4"><div><h3 className="font-extrabold text-slate-900">{selected.title}</h3><p className="mt-1 text-xs text-slate-500">{selectedCategory?.hint}</p></div><button onClick={() => resolveConversation(selected)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"><Archive className="h-3.5 w-3.5" />{selected.status === 'RESOLVED' ? 'Reopen' : 'Resolve'}</button></header><div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4">{selected.messages.length === 0 && <div className="py-12 text-center"><MessageCircle className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-sm font-bold text-slate-600">Start the conversation</p><p className="mt-1 text-xs text-slate-400">Add a message below to keep your question with this topic.</p></div>}{selected.messages.map((item) => <div key={item.id} className={`max-w-[85%] rounded-2xl p-3 ${item.author === 'CUSTOMER' ? 'ml-auto bg-blue-600 text-white' : 'bg-white text-slate-700 shadow-sm'}`}><div className="mb-1 flex items-center justify-between gap-4"><span className="text-[10px] font-bold opacity-70">{item.authorName}</span><span className="text-[9px] opacity-60">{new Date(item.createdAt).toLocaleString()}</span></div><p className="whitespace-pre-wrap text-sm leading-5">{item.body}</p></div>)}</div><div className="border-t border-slate-100 p-3"><div className="mb-2 flex flex-wrap gap-1">{quickReplies.map((reply) => <button key={reply} onClick={() => addQuickReply(reply)} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] text-slate-600 hover:bg-blue-50">{reply}</button>)}</div><form onSubmit={addMessage} className="flex gap-2"><input className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write a message..." maxLength={1500} /><button className="rounded-xl bg-blue-600 px-4 text-white"><Send className="h-4 w-4" /></button></form></div></> : <div className="m-auto max-w-sm px-6 text-center"><MessageCircle className="mx-auto h-9 w-9 text-slate-300" /><h3 className="mt-3 font-bold text-slate-700">Choose a conversation</h3><p className="mt-1 text-sm text-slate-500">Select an item from your inbox or create a new conversation.</p></div>}</div>
    </div>
    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /><p><strong>Prototype limitation:</strong> Messages are stored locally and no support agent receives them. For emergencies, contact local emergency services instead of using this demo inbox.</p></div>
  </section>;
};
