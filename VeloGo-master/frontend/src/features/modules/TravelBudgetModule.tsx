import React, { useMemo, useState } from 'react';
import { AlertTriangle, BellRing, Download, Plus, Target, Trash2 } from 'lucide-react';
import { calculateBudgetStatus, rowsToCsv } from '../extendedFeatureAlgorithms';
import { appendExtendedRecord, createStoredRecord, downloadTextFile, formatIndianCurrency, readExtendedCollection, recordExtendedAudit, StoredRecord, writeExtendedCollection } from '../extendedFeatureStore';

interface BudgetEntry extends StoredRecord {
  title: string;
  month: string;
  category: 'RIDES' | 'COMMUTE' | 'AIRPORT' | 'OTHER';
  limit: number;
  warningAt: number;
  notes: string;
  archived: boolean;
}

interface BudgetExpense extends StoredRecord {
  budgetId: string;
  title: string;
  date: string;
  amount: number;
  category: string;
  note: string;
}

interface Props { userId: string; onNotice: (message: string, tone?: 'success' | 'error' | 'info') => void; }

const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100';
const label = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500';
const monthNow = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; };
const dateNow = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };

function monthLabel(value: string): string {
  const date = new Date(`${value}-01T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export const TravelBudgetModule: React.FC<Props> = ({ userId, onNotice }) => {
  const [budgets, setBudgets] = useState<BudgetEntry[]>(() => readExtendedCollection<BudgetEntry>(userId, 'travel-budgets'));
  const [expenses, setExpenses] = useState<BudgetExpense[]>(() => readExtendedCollection<BudgetExpense>(userId, 'budget-expenses'));
  const [title, setTitle] = useState('Monthly ride budget');
  const [month, setMonth] = useState(monthNow());
  const [category, setCategory] = useState<BudgetEntry['category']>('RIDES');
  const [limit, setLimit] = useState('2000');
  const [warningAt, setWarningAt] = useState('80');
  const [notes, setNotes] = useState('');
  const [activeBudgetId, setActiveBudgetId] = useState<string | null>(null);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseDate, setExpenseDate] = useState(dateNow());
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseNote, setExpenseNote] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const visibleBudgets = budgets.filter((item) => showArchived || !item.archived)
    .sort((a, b) => b.month.localeCompare(a.month));
  const activeBudget = budgets.find((item) => item.id === activeBudgetId) || null;
  const activeExpenses = expenses.filter((item) => item.budgetId === activeBudgetId);
  const spent = activeExpenses.reduce((sum, item) => sum + item.amount, 0);
  const status = activeBudget ? calculateBudgetStatus(spent, activeBudget.limit, activeBudget.warningAt) : null;
  const overallMonthSpend = useMemo(() => expenses.filter((item) => item.date.slice(0, 7) === monthNow()).reduce((sum, item) => sum + item.amount, 0), [expenses]);

  const refresh = () => setBudgets(readExtendedCollection<BudgetEntry>(userId, 'travel-budgets'));
  const persistExpenses = (next: BudgetExpense[]) => {
    const result = writeExtendedCollection(userId, 'budget-expenses', next);
    if (result.ok) setExpenses(next);
    return result.ok;
  };

  const createBudget = (event: React.FormEvent) => {
    event.preventDefault();
    const amountValue = Number(limit);
    const warning = Number(warningAt);
    if (!title.trim()) return onNotice('Enter a budget name.', 'error');
    if (!/^\d{4}-\d{2}$/.test(month)) return onNotice('Choose a valid budget month.', 'error');
    if (!Number.isFinite(amountValue) || amountValue <= 0 || amountValue > 10000000) return onNotice('Budget must be greater than zero and below ₹1 crore.', 'error');
    if (!Number.isInteger(warning) || warning < 1 || warning > 100) return onNotice('Warning threshold must be between 1 and 100%.', 'error');
    const duplicate = budgets.some((item) => item.month === month && item.category === category && !item.archived);
    if (duplicate) return onNotice('An active budget already exists for this month and category.', 'error');
    const record = createStoredRecord({ title: title.trim(), month, category, limit: amountValue, warningAt: warning, notes: notes.trim(), archived: false });
    const result = appendExtendedRecord(userId, 'travel-budgets', record);
    if (!result.ok) return onNotice(result.error || 'Could not save budget.', 'error');
    recordExtendedAudit(userId, { collection: 'travel-budgets', action: 'CREATE', recordId: record.id, message: `Created travel budget: ${record.title}` });
    refresh();
    setActiveBudgetId(record.id);
    setTitle(''); setNotes('');
    onNotice('Travel budget created.');
  };

  const addExpense = (event: React.FormEvent) => {
    event.preventDefault();
    const amountValue = Number(expenseAmount);
    if (!activeBudget) return onNotice('Select a budget first.', 'error');
    if (!expenseTitle.trim()) return onNotice('Enter an expense description.', 'error');
    if (!Number.isFinite(amountValue) || amountValue <= 0) return onNotice('Enter an expense amount greater than zero.', 'error');
    if (!expenseDate || expenseDate.slice(0, 7) !== activeBudget.month) return onNotice('Expense date must be inside the selected budget month.', 'error');
    const record = createStoredRecord({ budgetId: activeBudget.id, title: expenseTitle.trim(), date: expenseDate, amount: amountValue, category: activeBudget.category, note: expenseNote.trim() }) as BudgetExpense;
    if (!persistExpenses([record, ...expenses])) return onNotice('Could not save expense. Browser storage may be full.', 'error');
    setExpenseTitle(''); setExpenseAmount(''); setExpenseNote('');
    onNotice('Expense added to budget.');
  };

  const deleteExpense = (record: BudgetExpense) => {
    if (!window.confirm(`Remove expense "${record.title}"?`)) return;
    if (!persistExpenses(expenses.filter((item) => item.id !== record.id))) return onNotice('Could not remove expense.', 'error');
    onNotice('Expense removed.');
  };

  const archiveBudget = (record: BudgetEntry) => {
    const next = budgets.map((item) => item.id === record.id ? { ...item, archived: !item.archived, updatedAt: new Date().toISOString(), version: item.version + 1 } : item);
    const result = writeExtendedCollection(userId, 'travel-budgets', next);
    if (!result.ok) return onNotice(result.error || 'Could not archive budget.', 'error');
    recordExtendedAudit(userId, { collection: 'travel-budgets', action: 'UPDATE', recordId: record.id, message: `${record.archived ? 'Restored' : 'Archived'} budget: ${record.title}` });
    refresh();
    onNotice(record.archived ? 'Budget restored.' : 'Budget archived.');
  };

  const removeBudget = (record: BudgetEntry) => {
    if (!window.confirm(`Delete budget "${record.title}" and its expense records?`)) return;
    const result = writeExtendedCollection(userId, 'travel-budgets', budgets.filter((item) => item.id !== record.id));
    if (!result.ok) return onNotice(result.error || 'Could not delete budget.', 'error');
    persistExpenses(expenses.filter((item) => item.budgetId !== record.id));
    refresh();
    if (activeBudgetId === record.id) setActiveBudgetId(null);
    onNotice('Budget and linked local expenses deleted.');
  };

  const exportBudget = (record: BudgetEntry) => {
    const linked = expenses.filter((item) => item.budgetId === record.id);
    const csv = rowsToCsv(['Expense', 'Date', 'Amount INR', 'Category', 'Notes'], linked.map((item) => [item.title, item.date, item.amount, item.category, item.note]));
    downloadTextFile(`velogo-budget-${record.month}-${record.id}.csv`, csv, 'text/csv;charset=utf-8');
    onNotice('Budget expenses exported.');
  };

  return <div className="space-y-6">
    <section className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-5">
      <div className="flex items-center gap-3"><span className="rounded-xl bg-white p-3 text-rose-700 shadow-sm"><Target className="h-6 w-6" /></span><div><h3 className="text-lg font-black text-slate-900">Travel budget planner</h3><p className="text-sm text-slate-500">Set a monthly limit and record expenses against it.</p></div></div>
      <div className="mt-5 grid grid-cols-2 gap-3"><Summary label="Current month recorded" value={formatIndianCurrency(overallMonthSpend)} /><Summary label="Saved budgets" value={String(budgets.length)} /></div>
    </section>

    <form onSubmit={createBudget} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div><h3 className="font-black text-slate-900">Create a monthly budget</h3><p className="text-xs text-slate-500">Use separate budgets for rides, commuting or airport travel.</p></div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3"><label><span className={label}>Budget name</span><input className={field} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} /></label><label><span className={label}>Month</span><input className={field} type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label><label><span className={label}>Category</span><select className={field} value={category} onChange={(event) => setCategory(event.target.value as BudgetEntry['category'])}><option value="RIDES">All rides</option><option value="COMMUTE">Commute</option><option value="AIRPORT">Airport transfers</option><option value="OTHER">Other travel</option></select></label><label><span className={label}>Monthly limit (₹)</span><input className={field} type="number" min="1" step="1" value={limit} onChange={(event) => setLimit(event.target.value)} /></label><label><span className={label}>Warning threshold (%)</span><input className={field} type="number" min="1" max="100" value={warningAt} onChange={(event) => setWarningAt(event.target.value)} /></label><label><span className={label}>Notes</span><input className={field} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={180} /></label></div>
      <button className="rounded-xl bg-rose-700 px-5 py-2.5 text-sm font-extrabold text-white">Create budget</button>
    </form>

    <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><h3 className="font-black text-slate-900">Your budgets</h3><label className="text-xs text-slate-500"><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} /> Archived</label></div>{visibleBudgets.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No budgets found.</p> : <div className="mt-3 space-y-2">{visibleBudgets.map((record) => { const amountSpent = expenses.filter((item) => item.budgetId === record.id).reduce((sum, item) => sum + item.amount, 0); const progress = calculateBudgetStatus(amountSpent, record.limit, record.warningAt); return <button key={record.id} onClick={() => setActiveBudgetId(record.id)} className={`w-full rounded-xl border p-3 text-left ${activeBudgetId === record.id ? 'border-rose-300 bg-rose-50' : 'border-slate-200 hover:bg-slate-50'}`}><div className="flex justify-between gap-2"><span className="font-bold text-slate-800">{record.title}</span><span className="text-xs font-black text-slate-600">{progress.percentUsed}%</span></div><p className="mt-1 text-xs text-slate-500">{monthLabel(record.month)} · {record.category}</p><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${progress.status === 'EXCEEDED' ? 'bg-rose-600' : progress.status === 'WARNING' ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, progress.percentUsed)}%` }} /></div><p className="mt-1 text-[10px] text-slate-400">{formatIndianCurrency(amountSpent)} of {formatIndianCurrency(record.limit)}</p></button>; })}</div>}</div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">{!activeBudget ? <div className="py-10 text-center"><BellRing className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-bold text-slate-700">Choose a budget</p><p className="mt-1 text-xs text-slate-400">Select a budget to record expenses and review progress.</p></div> : <><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-black text-slate-900">{activeBudget.title}</h3><p className="text-xs text-slate-500">{monthLabel(activeBudget.month)} · {activeBudget.category}</p></div><div className="flex gap-1"><button onClick={() => exportBudget(activeBudget)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Export budget"><Download className="h-4 w-4" /></button><button onClick={() => archiveBudget(activeBudget)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold">{activeBudget.archived ? 'Restore' : 'Archive'}</button><button onClick={() => removeBudget(activeBudget)} className="rounded-lg p-2 text-rose-500" aria-label="Delete budget"><Trash2 className="h-4 w-4" /></button></div></div><div className="mt-4 rounded-xl bg-slate-900 p-4 text-white"><p className="text-xs text-slate-400">Remaining budget</p><p className="mt-1 text-3xl font-black">{formatIndianCurrency(status?.remaining || 0)}</p><p className="mt-1 text-xs text-slate-400">Spent {formatIndianCurrency(spent)} / {formatIndianCurrency(activeBudget.limit)}</p>{status?.status !== 'HEALTHY' && <p className="mt-3 flex items-center gap-2 text-xs font-bold text-amber-300"><AlertTriangle className="h-4 w-4" />{status?.status === 'EXCEEDED' ? 'Budget limit exceeded.' : 'You have reached your warning threshold.'}</p>}</div><form onSubmit={addExpense} className="mt-4 space-y-3"><h4 className="text-sm font-extrabold text-slate-800">Add an expense</h4><label><span className={label}>Description</span><input className={field} value={expenseTitle} onChange={(event) => setExpenseTitle(event.target.value)} maxLength={80} placeholder="Morning ride" /></label><div className="grid grid-cols-2 gap-2"><label><span className={label}>Date</span><input className={field} type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} /></label><label><span className={label}>Amount (₹)</span><input className={field} type="number" min="0.01" step="0.01" value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} /></label></div><label><span className={label}>Note</span><input className={field} value={expenseNote} onChange={(event) => setExpenseNote(event.target.value)} maxLength={180} /></label><button className="rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-extrabold text-white">Add expense</button></form><div className="mt-5 border-t border-slate-100 pt-4"><h4 className="text-sm font-extrabold text-slate-800">Expense history</h4>{activeExpenses.length === 0 ? <p className="py-4 text-xs text-slate-400">No expenses recorded yet.</p> : <div className="mt-2 divide-y divide-slate-100">{activeExpenses.sort((a, b) => b.date.localeCompare(a.date)).map((item) => <div key={item.id} className="flex items-center justify-between gap-2 py-2"><div><p className="text-sm font-bold text-slate-700">{item.title}</p><p className="text-[10px] text-slate-400">{item.date}</p></div><div className="flex items-center gap-2"><strong className="text-sm">{formatIndianCurrency(item.amount)}</strong><button onClick={() => deleteExpense(item)} className="rounded p-1 text-rose-500" aria-label={`Delete ${item.title}`}><Trash2 className="h-3.5 w-3.5" /></button></div></div>)}</div>}</div></>}</div>
    </section>
  </div>;
};

const Summary: React.FC<{ label: string; value: string }> = ({ label: title, value }) => <div className="rounded-xl border border-rose-100 bg-white p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{title}</p><p className="mt-1 text-xl font-black text-slate-900">{value}</p></div>;
