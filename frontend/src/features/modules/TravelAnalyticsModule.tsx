import React, { useMemo, useState } from 'react';
import { BarChart3, CalendarDays, CarFront, IndianRupee, Route, TrendingUp } from 'lucide-react';
import { Ride } from '../../types';
import { summarizeRideHistory, calculateCancellationRate, calculateCompletionRate, roundTo } from '../featureAlgorithms';
import { formatCurrency } from '../featureValidation';
import { buildRideHistoryRows, createReport, downloadReport } from '../featureCsv';

interface Props { rides: Ride[]; loading: boolean; onRefresh?: () => void; }
type Range = 'ALL' | '30D' | '90D' | 'YEAR';
const rangeOptions: Array<{ value: Range; label: string }> = [
  { value: 'ALL', label: 'All time' },
  { value: '30D', label: 'Last 30 days' },
  { value: '90D', label: 'Last 90 days' },
  { value: 'YEAR', label: 'This year' },
];

export const TravelAnalyticsModule: React.FC<Props> = ({ rides, loading, onRefresh }) => {
  const [range, setRange] = useState<Range>('ALL');
  const [activeView, setActiveView] = useState<'spending' | 'vehicles' | 'destinations'>('spending');
  const filtered = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    if (range === '30D') start.setDate(now.getDate() - 30);
    if (range === '90D') start.setDate(now.getDate() - 90);
    if (range === 'YEAR') start.setMonth(0, 1);
    if (range === 'ALL') return rides;
    return rides.filter((ride) => {
      const date = new Date(ride.completedAt || ride.createdAt);
      return !Number.isNaN(date.getTime()) && date >= start && date <= now;
    });
  }, [rides, range]);
  const insight = useMemo(() => summarizeRideHistory(filtered), [filtered]);
  const completionRate = calculateCompletionRate(insight.totalRides, insight.completedRides);
  const cancellationRate = calculateCancellationRate(insight.totalRides, insight.cancelledRides);
  const maxMonthlySpend = Math.max(1, ...insight.monthlySpend.map((month) => month.amount));
  const maxVehicleCount = Math.max(1, ...insight.vehicleBreakdown.map((item) => item.rides));
  const topDestinations = insight.destinationBreakdown.slice(0, 5);
  const completed = filtered.filter((ride) => ride.status === 'COMPLETED');
  const highestFare = Math.max(0, ...completed.map((ride) => ride.finalFare ?? ride.estimatedFare ?? 0));
  const lowestFare = completed.length ? Math.min(...completed.map((ride) => ride.finalFare ?? ride.estimatedFare ?? 0)) : 0;
  const averageFare = insight.averageFare;

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading your ride history...</div>;

  return <section className="space-y-5">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-xl font-black text-slate-900">Travel analytics</h2><p className="mt-1 text-sm text-slate-500">Understand your completed trips, spending and travel habits.</p></div><div className="flex flex-wrap gap-2"><select value={range} onChange={(event) => setRange(event.target.value as Range)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">{rangeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><button onClick={() => downloadReport(createReport('velogo-ride-history', buildRideHistoryRows(filtered)))} className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700">Export CSV</button>{onRefresh && <button onClick={onRefresh} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">Refresh</button>}</div></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Kpi icon={<CarFront className="h-5 w-5" />} label="Completed rides" value={insight.completedRides.toLocaleString()} detail={`${completionRate}% completion rate`} /><Kpi icon={<IndianRupee className="h-5 w-5" />} label="Total spend" value={formatCurrency(insight.totalSpend)} detail={`Average ${formatCurrency(averageFare)} per ride`} /><Kpi icon={<Route className="h-5 w-5" />} label="Distance travelled" value={`${insight.totalDistanceKm.toLocaleString()} km`} detail={`${insight.averageDistanceKm} km average ride`} /><Kpi icon={<TrendingUp className="h-5 w-5" />} label="Estimated time saved" value={`${insight.estimatedTimeSavedMinutes} min`} detail="Illustrative comparison only" /></div>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]"><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-extrabold text-slate-900">Your travel patterns</h3><p className="mt-1 text-xs text-slate-500">A summary based on the selected date range.</p></div><div className="flex rounded-xl bg-slate-100 p-1">{(['spending', 'vehicles', 'destinations'] as const).map((view) => <button key={view} onClick={() => setActiveView(view)} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold capitalize ${activeView === view ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{view}</button>)}</div></div>
      {activeView === 'spending' && <div className="mt-6 space-y-4">{insight.monthlySpend.length === 0 ? <Empty /> : insight.monthlySpend.map((month) => <div key={month.month}><div className="mb-1 flex justify-between text-xs"><span className="font-bold text-slate-600">{formatMonth(month.month)}</span><span className="text-slate-500">{formatCurrency(month.amount)} · {month.rides} rides</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.max(2, month.amount / maxMonthlySpend * 100)}%` }} /></div></div>)}</div>}
      {activeView === 'vehicles' && <div className="mt-6 space-y-4">{insight.vehicleBreakdown.length === 0 ? <Empty /> : insight.vehicleBreakdown.map((vehicle) => <div key={vehicle.vehicle}><div className="mb-1 flex justify-between text-xs"><span className="font-bold text-slate-600">{vehicle.vehicle.replace('_', ' ')}</span><span className="text-slate-500">{vehicle.rides} rides · {vehicle.share}%</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${vehicle.rides / maxVehicleCount * 100}%` }} /></div></div>)}</div>}
      {activeView === 'destinations' && <div className="mt-5 divide-y divide-slate-100">{topDestinations.length === 0 ? <Empty /> : topDestinations.map((destination, index) => <div key={destination.destination} className="flex items-center justify-between py-3"><div className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-xs font-black text-indigo-700">{index + 1}</span><span className="text-sm font-bold text-slate-700">{destination.destination}</span></div><span className="text-xs text-slate-500">{destination.rides} trips</span></div>)}</div>}
    </div><div className="space-y-4"><div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-extrabold text-slate-900">Ride completion</h3><div className="mt-4 flex items-center gap-4"><ProgressRing value={completionRate} /><div><p className="text-sm font-bold text-slate-800">{insight.completedRides} completed</p><p className="mt-1 text-xs text-slate-500">{insight.cancelledRides} cancelled out of {insight.totalRides} rides.</p></div></div><div className="mt-4 grid grid-cols-2 gap-2"><SmallMetric label="Cancellation" value={`${cancellationRate}%`} /><SmallMetric label="Weekday rides" value={String(insight.weekdayRideCount)} /><SmallMetric label="Weekend rides" value={String(insight.weekendRideCount)} /><SmallMetric label="Top vehicle" value={insight.mostUsedVehicle.replace('_', ' ')} /></div></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-extrabold text-slate-900">Fare range</h3><div className="mt-4 grid grid-cols-2 gap-3"><div><p className="text-xs text-slate-500">Lowest</p><p className="mt-1 text-lg font-black text-emerald-600">{formatCurrency(lowestFare)}</p></div><div><p className="text-xs text-slate-500">Highest</p><p className="mt-1 text-lg font-black text-slate-900">{formatCurrency(highestFare)}</p></div></div><p className="mt-3 text-xs leading-5 text-slate-500">The amounts are calculated from completed rides in your selected date range.</p></div></div></div>
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-500"><strong>Data note:</strong> Analytics reads your existing ride history API response. It does not alter rides or payment records. Time-saved estimates are illustrative and should not be presented as measured traffic savings.</div>
  </section>;
};

const Kpi: React.FC<{ icon: React.ReactNode; label: string; value: string; detail: string }> = ({ icon, label, value, detail }) => <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-2 text-indigo-600">{icon}<span className="text-xs font-bold text-slate-500">{label}</span></div><p className="mt-2 text-2xl font-black text-slate-900">{value}</p><p className="mt-1 text-[11px] text-slate-400">{detail}</p></div>;
const SmallMetric: React.FC<{ label: string; value: string }> = ({ label, value }) => <div className="rounded-xl bg-slate-50 p-2.5"><p className="text-[10px] text-slate-400">{label}</p><p className="mt-1 truncate text-xs font-black text-slate-700">{value}</p></div>;
const Empty: React.FC = () => <p className="py-10 text-center text-sm text-slate-400">No completed ride data for this view.</p>;
const ProgressRing: React.FC<{ value: number }> = ({ value }) => <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(#4f46e5 ${value}%, #e2e8f0 ${value}% 100%)` }}><div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-sm font-black text-slate-900">{roundTo(value, 0)}%</div></div>;
function formatMonth(value: string): string { const [year, month] = value.split('-').map(Number); return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(new Date(year, month - 1, 1)); }
