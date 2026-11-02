import React, { useMemo, useState } from 'react';
import { Award, Gift, History, Sparkles, Wallet } from 'lucide-react';
import { DEFAULT_REWARD_CATALOG, RewardCatalogItem, RewardProfile, RewardTransaction, createFeatureRecord, emptyRewardProfile } from '../featureModels';
import { readCollection, recordAudit, writeCollection } from '../featureStorage';
import { calculateRewardTier, getRewardProgress } from '../featureAlgorithms';
import { formatDateTime } from '../featureValidation';

interface Props { userId: string; completedRideCount: number; onNotice: (message: string, tone?: 'success' | 'error' | 'info') => void; }
const tierDescriptions: Record<RewardProfile['currentTier'], string> = {
  STARTER: 'You are getting started. Complete rides to earn your first rewards.',
  SILVER: 'You have built a steady travel habit. Keep earning points on completed rides.',
  GOLD: 'You are a regular VeloGo traveller. Enjoy access to higher-value rewards.',
  PLATINUM: 'You have reached the highest demo tier. Thank you for travelling with VeloGo.',
};

export const RewardsModule: React.FC<Props> = ({ userId, completedRideCount, onNotice }) => {
  const [profile, setProfile] = useState<RewardProfile>(() => readCollection(userId, 'rewards') || emptyRewardProfile());
  const [catalog] = useState<RewardCatalogItem[]>(DEFAULT_REWARD_CATALOG);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | RewardCatalogItem['category']>('ALL');
  const progress = getRewardProgress(profile.lifetimePoints);
  const availableRewards = useMemo(() => catalog.filter((item) => item.active && (selectedCategory === 'ALL' || item.category === selectedCategory)), [catalog, selectedCategory]);
  const earned = profile.transactions.filter((transaction) => transaction.kind === 'EARNED').reduce((sum, transaction) => sum + transaction.points, 0);
  const redeemed = profile.transactions.filter((transaction) => transaction.kind === 'REDEEMED').reduce((sum, transaction) => sum + Math.abs(transaction.points), 0);

  const refresh = (next: RewardProfile) => { writeCollection(userId, 'rewards', next); setProfile(next); };
  const addDemoPoints = () => {
    const points = 25;
    const transaction = createFeatureRecord({ kind: 'ADJUSTMENT' as const, points, description: 'Demo points added for exploring the rewards module.' }) as RewardTransaction;
    const next = {
      ...profile,
      pointsBalance: profile.pointsBalance + points,
      lifetimePoints: profile.lifetimePoints + points,
      currentTier: calculateRewardTier(profile.lifetimePoints + points),
      transactions: [transaction, ...profile.transactions],
      updatedAt: new Date().toISOString(),
      version: profile.version + 1,
    };
    refresh(next); recordAudit(userId, 'rewards', 'DEMO_POINTS', 'Added demo reward points.');
    onNotice('25 demo points added. This does not represent real ride credits.');
  };

  const redeem = (item: RewardCatalogItem) => {
    if (profile.pointsBalance < item.pointsCost) { onNotice(`You need ${item.pointsCost - profile.pointsBalance} more points.`, 'error'); return; }
    const alreadyRedeemed = profile.redeemedRewardIds.filter((id) => id === item.id).length;
    if (alreadyRedeemed >= item.limitPerCustomer) { onNotice('You have reached the demo redemption limit for this reward.', 'error'); return; }
    if (!window.confirm(`Redeem ${item.title} for ${item.pointsCost} points?`)) return;
    const transaction = createFeatureRecord({ kind: 'REDEEMED' as const, points: -item.pointsCost, description: `Redeemed ${item.title}.`, sourceId: item.id }) as RewardTransaction;
    const next = {
      ...profile,
      pointsBalance: profile.pointsBalance - item.pointsCost,
      redeemedRewardIds: [...profile.redeemedRewardIds, item.id],
      transactions: [transaction, ...profile.transactions],
      updatedAt: new Date().toISOString(),
      version: profile.version + 1,
    };
    refresh(next); recordAudit(userId, 'rewards', 'REDEEMED', `Redeemed ${item.title}.`, item.id);
    onNotice('Demo reward redeemed. No real coupon or wallet credit has been issued.');
  };

  const clearDemo = () => {
    if (!window.confirm('Reset your local demo points and reward history?')) return;
    const next = emptyRewardProfile();
    refresh(next); onNotice('Demo reward profile reset.');
  };

  return <section className="space-y-5">
    <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-6 text-white shadow-lg"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/80"><Award className="h-4 w-4" /> VeloGo rewards club</div><h2 className="mt-3 text-3xl font-black">{profile.pointsBalance.toLocaleString()} <span className="text-lg font-bold">points</span></h2><p className="mt-1 max-w-md text-sm text-white/85">{tierDescriptions[profile.currentTier]}</p></div><div className="rounded-2xl border border-white/20 bg-white/15 p-4 text-right"><p className="text-[10px] font-black uppercase tracking-widest text-white/75">Your tier</p><p className="mt-1 text-2xl font-black">{profile.currentTier}</p><Sparkles className="ml-auto mt-2 h-5 w-5" /></div></div><div className="mt-6"><div className="mb-2 flex justify-between text-xs font-bold"><span>{progress.tier}</span><span>{progress.nextTier ? `${progress.current.toLocaleString()} / ${progress.target.toLocaleString()} points to ${progress.nextTier}` : 'Top tier reached'}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white transition-all" style={{ width: `${progress.percentage}%` }} /></div></div></div>
    <div className="grid gap-3 sm:grid-cols-3"><Metric label="Lifetime points" value={profile.lifetimePoints.toLocaleString()} icon={<Award className="h-5 w-5" />} /><Metric label="Points earned" value={earned.toLocaleString()} icon={<Sparkles className="h-5 w-5" />} /><Metric label="Points redeemed" value={redeemed.toLocaleString()} icon={<Wallet className="h-5 w-5" />} /></div>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-black text-slate-900">Reward catalogue</h3><p className="text-xs text-slate-500">{completedRideCount} completed rides in your current ride history.</p></div><div className="flex gap-2"><button onClick={addDemoPoints} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">Add demo points</button><button onClick={() => setShowHistory((value) => !value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">{showHistory ? 'Hide history' : 'View history'}</button></div></div>
    <div className="flex flex-wrap gap-2">{(['ALL', 'RIDE_CREDIT', 'UPGRADE', 'PARTNER'] as const).map((category) => <button key={category} onClick={() => setSelectedCategory(category)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${selectedCategory === category ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}>{category === 'ALL' ? 'All rewards' : category.replace('_', ' ')}</button>)}</div>
    <div className="grid gap-3 md:grid-cols-2">{availableRewards.map((item) => { const canRedeem = profile.pointsBalance >= item.pointsCost; const count = profile.redeemedRewardIds.filter((id) => id === item.id).length; return <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-start gap-3"><span className="rounded-xl bg-amber-50 p-3 text-amber-600"><Gift className="h-5 w-5" /></span><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><h4 className="font-extrabold text-slate-900">{item.title}</h4><span className="whitespace-nowrap rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">{item.pointsCost} pts</span></div><p className="mt-1 text-sm text-slate-500">{item.description}</p><p className="mt-2 text-xs font-bold text-slate-600">Value: {item.valueLabel} · Redeemed {count}/{item.limitPerCustomer}</p></div></div><button disabled={!canRedeem || count >= item.limitPerCustomer} onClick={() => redeem(item)} className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">{count >= item.limitPerCustomer ? 'Limit reached' : canRedeem ? 'Redeem demo reward' : `Need ${item.pointsCost - profile.pointsBalance} more points`}</button></article>; })}</div>
    {showHistory && <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="mb-3 flex items-center gap-2"><History className="h-4 w-4 text-slate-500" /><h3 className="font-extrabold text-slate-900">Points activity</h3></div>{profile.transactions.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">No point activity yet.</p> : <div className="divide-y divide-slate-100">{profile.transactions.map((transaction) => <div key={transaction.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-bold text-slate-800">{transaction.description}</p><p className="mt-1 text-xs text-slate-400">{formatDateTime(transaction.createdAt)}</p></div><span className={`text-sm font-black ${transaction.points >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{transaction.points > 0 ? '+' : ''}{transaction.points}</span></div>)}</div>}</div>}
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><p><strong>Demo mode:</strong> Points and rewards are stored locally. Actual points must be calculated by the backend from verified completed rides, and reward redemption must issue a real server-side coupon.</p><button onClick={clearDemo} className="shrink-0 rounded-lg border border-amber-300 px-3 py-1.5 font-bold">Reset demo</button></div>
  </section>;
};

const Metric: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({ label, value, icon }) => <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4"><span className="rounded-xl bg-amber-50 p-2 text-amber-600">{icon}</span><div><p className="text-xs text-slate-500">{label}</p><p className="text-xl font-black text-slate-900">{value}</p></div></div>;
