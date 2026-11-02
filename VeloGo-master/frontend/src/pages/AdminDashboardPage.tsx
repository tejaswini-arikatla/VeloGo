import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  AdminOverview,
  CaptainSummary,
  FareConfiguration,
  Coupon,
  VehicleCategory,
  VerificationStatus,
  Company,
} from '../types';
import {
  Shield,
  ShieldCheck,
  Users,
  Car,
  Clock,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Tag,
  AlertTriangle,
  FileText,
  Settings,
  RefreshCw,
  MessageSquare,
  HelpCircle,
  Building2,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'captains' | 'rides' | 'pricing' | 'coupons' | 'audit' | 'tickets' | 'corporate'>('overview');

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [captains, setCaptains] = useState<any[]>([]);
  const [rides, setRides] = useState<any[]>([]);
  const [pricing, setPricing] = useState<FareConfiguration[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyRejectReason, setCompanyRejectReason] = useState('');
  const [isVerifyingCompany, setIsVerifyingCompany] = useState(false);
  const [companyStatusFilter, setCompanyStatusFilter] = useState<string>('ALL');

  const [loading, setLoading] = useState(true);

  // Support ticket modal
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [ticketResponse, setTicketResponse] = useState('');
  const [ticketStatus, setTicketStatus] = useState('RESOLVED');
  const [isUpdatingTicket, setIsUpdatingTicket] = useState(false);

  // Captain review modal
  const [selectedCaptain, setSelectedCaptain] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Women-Only program review modal
  const [womenOnlyModalCaptain, setWomenOnlyModalCaptain] = useState<any | null>(null);
  const [womenOnlyRejectReason, setWomenOnlyRejectReason] = useState('');
  const [isWomenOnlyVerifying, setIsWomenOnlyVerifying] = useState(false);

  // New coupon form
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    description: '',
    discountPercent: 20,
    maxDiscount: 50,
    minRideAmount: 50,
    validDays: 30,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [ovRes, capRes, rRes, prRes, cpnRes, audRes, tktRes, cmpRes] = await Promise.allSettled([
        api.admin.getOverview(),
        api.admin.getCaptains(),
        api.admin.getAllRides(),
        api.admin.getPricing(),
        api.admin.getCoupons(),
        api.admin.getAuditLogs(),
        api.admin.getAllTickets(),
        api.corporate.getAllCompanies(),
      ]);
      if (ovRes.status === 'fulfilled') setOverview(ovRes.value);
      if (capRes.status === 'fulfilled') setCaptains(capRes.value?.content || []);
      if (rRes.status === 'fulfilled') setRides(rRes.value?.content || []);
      if (prRes.status === 'fulfilled') setPricing(prRes.value || []);
      if (cpnRes.status === 'fulfilled') setCoupons(cpnRes.value || []);
      if (audRes.status === 'fulfilled') setAuditLogs(audRes.value?.content || []);
      if (tktRes.status === 'fulfilled') setTickets(tktRes.value?.content || []);
      if (cmpRes.status === 'fulfilled') setCompanies(cmpRes.value || []);
    } catch (e) {
      console.error('Error loading admin dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRespondTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setIsUpdatingTicket(true);
    try {
      await api.admin.respondTicket(selectedTicket.id, ticketResponse, ticketStatus);
      setSelectedTicket(null);
      setTicketResponse('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update ticket response');
    } finally {
      setIsUpdatingTicket(false);
    }
  };

  const handleVerifyCaptain = async (status: VerificationStatus) => {
    if (!selectedCaptain) return;
    setIsVerifying(true);
    try {
      await api.admin.verifyCaptain(selectedCaptain.id, status, status === 'REJECTED' ? rejectionReason : undefined);
      setSelectedCaptain(null);
      setRejectionReason('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Verification update failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyWomenOnly = async (captainId: string, status: 'APPROVED' | 'REJECTED') => {
    setIsWomenOnlyVerifying(true);
    try {
      await api.admin.verifyWomenOnlyCaptain(
        captainId,
        status,
        status === 'REJECTED' ? womenOnlyRejectReason : undefined
      );
      setWomenOnlyModalCaptain(null);
      setWomenOnlyRejectReason('');
      if (selectedCaptain && selectedCaptain.id === captainId) {
        setSelectedCaptain(null);
      }
      loadData();
    } catch (err: any) {
      alert(err.message || 'Women-only status update failed');
    } finally {
      setIsWomenOnlyVerifying(false);
    }
  };

  const handleUpdatePrice = async (category: VehicleCategory, field: string, val: number) => {
    try {
      await api.admin.updatePricing(category, { [field]: val });
      loadData();
    } catch (e) {
      alert('Failed to update pricing');
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.admin.createCoupon({
        code: newCoupon.code,
        description: newCoupon.description,
        discountPercent: Number(newCoupon.discountPercent),
        maxDiscount: Number(newCoupon.maxDiscount),
        minRideAmount: Number(newCoupon.minRideAmount),
        validDays: Number(newCoupon.validDays),
        active: true,
      });
      setNewCoupon({
        code: '',
        description: '',
        discountPercent: 20,
        maxDiscount: 50,
        minRideAmount: 50,
        validDays: 30,
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create coupon');
    }
  };

  const handleVerifyCompany = async (companyId: string, status: string, reason?: string) => {
    setIsVerifyingCompany(true);
    try {
      await api.corporate.verifyCompany(companyId, { status, rejectionReason: reason });
      setSelectedCompany(null);
      setCompanyRejectReason('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update company verification status');
    } finally {
      setIsVerifyingCompany(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-navy-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-brand-400 bg-brand-500/10 border border-brand-500/20 px-3 py-1 rounded-full">
            SYSTEM ADMINISTRATION CONSOLE
          </span>
          <h1 className="text-3xl font-black tracking-tight text-white mt-2">Platform Overview</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time management for fleet operations, safety compliance, and financials.
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto space-x-8 text-sm font-bold">
        {[
          { id: 'overview', label: 'Metrics Overview' },
          { id: 'corporate', label: `Corporate Accounts (${companies.filter((c) => c.status === 'PENDING_VERIFICATION').length})` },
          { id: 'captains', label: `Captain Approvals (${overview?.pendingCaptains || 0})` },
          { id: 'rides', label: 'All Platform Rides' },
          { id: 'pricing', label: 'Fares & Pricing' },
          { id: 'coupons', label: 'Coupons & Promos' },
          { id: 'audit', label: 'Audit Trail' },
          { id: 'tickets', label: `Support & Safety (${tickets.filter((t) => t.status === 'OPEN').length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`py-3 px-1 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'border-brand-500 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: METRICS OVERVIEW */}
      {activeTab === 'overview' && (
        overview ? (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase">Gross Booking Value</p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                ₹{Number(overview.grossBookingValue || 0).toFixed(2)}
              </p>
              <span className="text-[10px] text-emerald-600 font-bold">Live Bookings</span>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase">Collected Payments</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                ₹{Number(overview.totalCollectedPayments || 0).toFixed(2)}
              </p>
              <span className="text-[10px] text-slate-400 font-bold">Processed Transactions</span>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase">Total Rides</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{overview.totalRides}</p>
              <span className="text-[10px] text-slate-400 font-bold">
                {overview.completedRides} Completed &bull; {overview.cancelledRides} Cancelled
              </span>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase">Captains Fleet</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{overview.totalCaptains}</p>
              <span className="text-[10px] text-brand-600 font-bold">
                {overview.onlineCaptains} Online Now &bull; {overview.pendingCaptains} Pending
              </span>
            </div>
          </div>

          {/* Recent Rides Table */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
            <h3 className="font-extrabold text-base text-slate-900">Recent Platform Ride Stream</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="pb-3">Ride ID</th>
                    <th className="pb-3">Customer</th>
                    <th className="pb-3">Captain</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Fare</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!overview.recentRides || overview.recentRides.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No recent rides found.
                      </td>
                    </tr>
                  ) : (
                    overview.recentRides.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="py-3 font-mono font-bold text-slate-700">#{r.id.slice(0, 8)}</td>
                      <td className="py-3 font-bold text-slate-900">{r.customerName}</td>
                      <td className="py-3 text-slate-600">{r.captainName}</td>
                      <td className="py-3 font-semibold">{r.category}</td>
                      <td className="py-3">
                        <span className="font-bold text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 font-bold text-slate-900">₹{Number(r.fare).toFixed(2)}</td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500">
            {loading ? (
              <div className="flex flex-col items-center justify-center space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-brand-500" />
                <p className="font-semibold text-sm">Loading platform metrics...</p>
              </div>
            ) : (
              <p className="font-semibold text-sm">Platform metrics currently unavailable.</p>
            )}
          </div>
        )
      )}

      {/* TAB 2: CAPTAIN APPROVALS */}
      {activeTab === 'captains' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-slate-900">Captain Onboarding & Verification</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="pb-3">Captain</th>
                  <th className="pb-3">License Number</th>
                  <th className="pb-3">Vehicle Details</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Women-Only</th>
                  <th className="pb-3">Rating / Rides</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {captains.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No captain registrations found.
                    </td>
                  </tr>
                ) : (
                  captains.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-3.5">
                      <p className="font-bold text-slate-900">{c.user?.fullName}</p>
                      <p className="text-slate-400 text-[11px]">{c.user?.email}</p>
                    </td>
                    <td className="py-3.5 font-mono font-semibold">{c.drivingLicenseNumber}</td>
                    <td className="py-3.5">
                      <p className="font-semibold text-slate-800">
                        {c.vehicle?.model} ({c.vehicle?.category})
                      </p>
                      <p className="text-[10px] font-mono text-slate-500">
                        {c.vehicle?.registrationNumber}
                      </p>
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                          c.verificationStatus === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.verificationStatus === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {c.verificationStatus}
                      </span>
                    </td>
                    <td className="py-3.5">
                      {c.vehicle?.category !== 'BIKE' ? (
                        <span className="text-[10px] text-slate-400 font-medium">N/A (Non-Bike)</span>
                      ) : c.womenOnlyStatus === 'APPROVED' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                          <ShieldCheck className="w-3 h-3 text-purple-700" /> Approved
                        </span>
                      ) : c.womenOnlyStatus === 'APPLIED' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                          <Clock className="w-3 h-3 text-amber-700" /> Pending Review
                        </span>
                      ) : c.womenOnlyStatus === 'REJECTED' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                          <XCircle className="w-3 h-3 text-red-700" /> Rejected
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">Not Applied</span>
                      )}
                    </td>
                    <td className="py-3.5 font-semibold text-slate-700">
                      ★ {c.ratingAvg} ({c.totalRides} trips)
                    </td>
                    <td className="py-3.5 text-right space-x-2">
                      {c.vehicle?.category === 'BIKE' && (
                        <button
                          onClick={() => {
                            setWomenOnlyModalCaptain(c);
                            setWomenOnlyRejectReason('');
                          }}
                          className={`px-2.5 py-1 font-bold rounded-lg text-xs transition-colors ${
                            c.womenOnlyStatus === 'APPLIED'
                              ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm ring-2 ring-purple-300'
                              : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200'
                          }`}
                        >
                          Women-Only
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedCaptain(c)}
                        className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs transition-colors"
                      >
                        Review Documents
                      </button>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ALL PLATFORM RIDES */}
      {activeTab === 'rides' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
          <h3 className="font-extrabold text-base text-slate-900">Platform Ride Management</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="pb-3">Ride ID</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Captain</th>
                  <th className="pb-3">Route</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Fare</th>
                  <th className="pb-3">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rides.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No platform rides found.
                    </td>
                  </tr>
                ) : (
                  rides.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-3 font-mono font-bold text-slate-800">#{r.id.slice(0, 8)}</td>
                    <td className="py-3 font-bold text-slate-900">{r.customerName}</td>
                    <td className="py-3 text-slate-600">{r.captainName || '—'}</td>
                    <td className="py-3 max-w-xs truncate text-[11px] text-slate-500">
                      {r.pickupAddress} &rarr; {r.destAddress}
                    </td>
                    <td className="py-3">
                      <span className="font-bold text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 font-extrabold text-slate-900">
                      ₹{(r.finalFare || r.estimatedFare).toFixed(2)}
                    </td>
                    <td className="py-3 font-semibold text-[11px] text-emerald-700">
                      {r.paymentStatus} ({r.paymentMethod})
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PRICING CONFIGURATION */}
      {activeTab === 'pricing' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">Fare Calculation Engine Rules</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Updates to fare configurations are auditable and take effect immediately for new estimates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricing.length === 0 ? (
              <div className="col-span-3 text-center py-8 text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                No fare configurations found.
              </div>
            ) : (
              pricing.map((p) => (
              <div key={p.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <h4 className="font-black text-lg text-slate-900">{p.category} TAXI</h4>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                    ACTIVE
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-500 font-semibold block mb-1">Base Fare (₹)</label>
                    <input
                      type="number"
                      defaultValue={p.baseFare}
                      onBlur={(e) => handleUpdatePrice(p.category, 'baseFare', Number(e.target.value))}
                      className="w-full p-2 rounded-lg border border-slate-200 bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 font-semibold block mb-1">Per Kilometre Rate (₹)</label>
                    <input
                      type="number"
                      defaultValue={p.perKmRate}
                      onBlur={(e) => handleUpdatePrice(p.category, 'perKmRate', Number(e.target.value))}
                      className="w-full p-2 rounded-lg border border-slate-200 bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 font-semibold block mb-1">Per Minute Rate (₹)</label>
                    <input
                      type="number"
                      defaultValue={p.perMinRate}
                      onBlur={(e) => handleUpdatePrice(p.category, 'perMinRate', Number(e.target.value))}
                      className="w-full p-2 rounded-lg border border-slate-200 bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 font-semibold block mb-1">Platform Fee (₹)</label>
                    <input
                      type="number"
                      defaultValue={p.bookingFee}
                      onBlur={(e) => handleUpdatePrice(p.category, 'bookingFee', Number(e.target.value))}
                      className="w-full p-2 rounded-lg border border-slate-200 bg-white font-bold"
                    />
                  </div>
                </div>
              </div>
            )))}
          </div>
        </div>
      )}

      {/* TAB 5: COUPONS */}
      {activeTab === 'coupons' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Create coupon */}
          <div className="md:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
            <h3 className="font-extrabold text-base text-slate-900">Create Promotional Coupon</h3>
            <form onSubmit={handleCreateCoupon} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Coupon Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MONSOON30"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 uppercase font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1">Description</label>
                <input
                  type="text"
                  placeholder="30% discount on city rides"
                  value={newCoupon.description}
                  onChange={(e) => setNewCoupon({ ...newCoupon, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Discount %</label>
                  <input
                    type="number"
                    required
                    value={newCoupon.discountPercent}
                    onChange={(e) => setNewCoupon({ ...newCoupon, discountPercent: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Max Cap (₹)</label>
                  <input
                    type="number"
                    required
                    value={newCoupon.maxDiscount}
                    onChange={(e) => setNewCoupon({ ...newCoupon, maxDiscount: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-brand-500 hover:bg-brand-600 text-slate-950 font-black py-3 rounded-xl shadow-glow transition-all mt-2"
              >
                Create Promo Code
              </button>
            </form>
          </div>

          {/* List Coupons */}
          <div className="md:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
            <h3 className="font-extrabold text-base text-slate-900">Active Coupons</h3>
            <div className="space-y-3">
              {coupons.length === 0 ? (
                <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                  No promotional coupons created yet.
                </div>
              ) : (
                coupons.map((cpn) => (
                <div
                  key={cpn.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                      <Tag className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-black text-slate-900 tracking-wider text-sm">{cpn.code}</p>
                      <p className="text-slate-500 text-[11px]">{cpn.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-900">{cpn.discountPercent}% OFF</p>
                    <p className="text-[10px] text-slate-400">Up to ₹{cpn.maxDiscount}</p>
                  </div>
                </div>
              )))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
          <h3 className="font-extrabold text-base text-slate-900">Security & Administrative Audit Trail</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="pb-3">Action</th>
                  <th className="pb-3">Target</th>
                  <th className="pb-3">Details</th>
                  <th className="pb-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No audit events logged yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 font-bold text-slate-900">{log.action}</td>
                    <td className="py-3 font-mono text-slate-600">
                      {log.targetEntity}: {log.targetId}
                    </td>
                    <td className="py-3 text-slate-600">{log.details}</td>
                    <td className="py-3 text-slate-400 text-[11px]">{log.createdAt}</td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: SUPPORT & SAFETY TICKETS */}
      {activeTab === 'tickets' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Support & Safety Incidents</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review and resolve customer inquiries, safety reports, and trip grievances.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="pb-3">Ticket ID</th>
                  <th className="pb-3">User</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Subject & Description</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No support tickets submitted yet.
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="py-3 font-mono font-bold text-slate-800">#{t.id.slice(0, 8)}</td>
                      <td className="py-3">
                        <p className="font-bold text-slate-900">{t.userName}</p>
                        <p className="text-slate-400 text-[11px]">{t.userEmail}</p>
                      </td>
                      <td className="py-3">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                          t.category === 'SAFETY'
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {t.category}
                        </span>
                      </td>
                      <td className="py-3 max-w-xs">
                        <p className="font-bold text-slate-900">{t.subject}</p>
                        <p className="text-slate-500 text-[11px] truncate">{t.description}</p>
                        {t.adminResponse && (
                          <p className="text-emerald-700 text-[10px] font-medium mt-0.5 truncate">
                            <strong>Reply:</strong> {t.adminResponse}
                          </p>
                        )}
                      </td>
                      <td className="py-3">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                          t.status === 'RESOLVED' || t.status === 'CLOSED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.status === 'IN_PROGRESS'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400 text-[11px]">{t.createdAt}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedTicket(t);
                            setTicketResponse(t.adminResponse || '');
                            setTicketStatus(t.status === 'OPEN' ? 'RESOLVED' : t.status);
                          }}
                          className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs transition-colors"
                        >
                          Resolve
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 8: CORPORATE ACCOUNTS MODERATION */}
      {activeTab === 'corporate' && (
        <div className="space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase">Total Organizations</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{companies.length}</p>
              <span className="text-[10px] text-slate-500 font-medium">Registered Accounts</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm bg-gradient-to-br from-white to-amber-50/50">
              <p className="text-xs font-bold text-amber-700 uppercase">Pending Verification</p>
              <p className="text-2xl font-black text-amber-600 mt-1">
                {companies.filter((c) => c.status === 'PENDING_VERIFICATION').length}
              </p>
              <span className="text-[10px] text-amber-600 font-bold">Needs Review</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase">Active Enterprise Accounts</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                {companies.filter((c) => c.status === 'ACTIVE').length}
              </p>
              <span className="text-[10px] text-emerald-600 font-bold">Eligible for Invoicing</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase">Total Credit Allocated</p>
              <p className="text-2xl font-black text-slate-900 mt-1 font-mono">
                ₹{companies.reduce((sum, c) => sum + (Number(c.creditLimit) || 0), 0).toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-500 font-medium">Platform Exposure</span>
            </div>
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-2">
            {['ALL', 'PENDING_VERIFICATION', 'ACTIVE', 'REJECTED', 'SUSPENDED'].map((st) => (
              <button
                key={st}
                onClick={() => setCompanyStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  companyStatusFilter === st
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {st.replace('_', ' ')}
                {st !== 'ALL' && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-800">
                    {companies.filter((c) => c.status === st).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Companies Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-500" />
                <span>Enterprise Organizations Directory</span>
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                Showing {companies.filter((c) => companyStatusFilter === 'ALL' || c.status === companyStatusFilter).length} companies
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3">Company Name & Domain</th>
                    <th className="px-4 py-3">GSTIN / Tax ID</th>
                    <th className="px-4 py-3">Contact Email</th>
                    <th className="px-4 py-3">Credit Limit</th>
                    <th className="px-4 py-3">Approval Threshold</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {companies
                    .filter((c) => companyStatusFilter === 'ALL' || c.status === companyStatusFilter)
                    .map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-slate-900 text-sm">{c.name}</p>
                          {c.domain ? (
                            <span className="text-[10px] font-mono font-semibold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200">
                              @{c.domain} (auto-match)
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Manual Invites Only</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-700 font-semibold">{c.taxId}</td>
                        <td className="px-4 py-3.5 text-slate-600">{c.contactEmail}</td>
                        <td className="px-4 py-3.5 font-mono font-bold text-slate-900">₹{Number(c.creditLimit).toLocaleString()}</td>
                        <td className="px-4 py-3.5 font-mono text-amber-700 font-bold">₹{Number(c.approvalThreshold).toLocaleString()}</td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                              c.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : c.status === 'PENDING_VERIFICATION'
                                ? 'bg-amber-100 text-amber-800 animate-pulse'
                                : c.status === 'REJECTED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {c.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right space-x-2">
                          {c.status === 'PENDING_VERIFICATION' && (
                            <>
                              <button
                                disabled={isVerifyingCompany}
                                onClick={() => handleVerifyCompany(c.id, 'ACTIVE')}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition shadow-sm cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                disabled={isVerifyingCompany}
                                onClick={() => {
                                  setSelectedCompany(c);
                                  setCompanyRejectReason('');
                                }}
                                className="px-3 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 font-bold rounded-lg text-xs transition cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {c.status === 'ACTIVE' && (
                            <button
                              disabled={isVerifyingCompany}
                              onClick={() => handleVerifyCompany(c.id, 'SUSPENDED', 'Administrative hold')}
                              className="px-3 py-1.5 border border-slate-300 text-slate-600 hover:bg-slate-100 font-medium rounded-lg text-xs transition cursor-pointer"
                            >
                              Suspend
                            </button>
                          )}
                          {(c.status === 'SUSPENDED' || c.status === 'REJECTED') && (
                            <button
                              disabled={isVerifyingCompany}
                              onClick={() => handleVerifyCompany(c.id, 'ACTIVE')}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                            >
                              Reactivate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  {companies.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        No corporate accounts registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Response Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative space-y-4 animate-fadeIn">
            <div className="flex justify-between items-start">
              <div>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  selectedTicket.category === 'SAFETY' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-slate-100 text-slate-700'
                }`}>
                  {selectedTicket.category} TICKET #{selectedTicket.id.slice(0, 8)}
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">{selectedTicket.subject}</h3>
                <p className="text-xs text-slate-500">From: {selectedTicket.userName} ({selectedTicket.userEmail})</p>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <p className="text-slate-700 leading-relaxed font-medium">
                {selectedTicket.description}
              </p>
              {selectedTicket.rideId && (
                <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-200 font-mono">
                  Related Ride ID: {selectedTicket.rideId}
                </p>
              )}
            </div>

            <form onSubmit={handleRespondTicket} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Status</label>
                <select
                  value={ticketStatus}
                  onChange={(e) => setTicketStatus(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold bg-white"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Official Resolution / Response</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain steps taken or resolution provided to user..."
                  value={ticketResponse}
                  onChange={(e) => setTicketResponse(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="border border-slate-300 hover:bg-slate-50 font-bold py-2.5 rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingTicket}
                  className="bg-brand-500 hover:bg-brand-600 text-slate-950 font-black py-2.5 rounded-xl text-xs transition-colors shadow-glow"
                >
                  {isUpdatingTicket ? 'Updating...' : 'Submit Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Captain Review Modal */}
      {selectedCaptain && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-4 animate-fadeIn">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-black text-slate-900">Review Captain Application</h3>
                <p className="text-xs text-slate-500">{selectedCaptain.user?.fullName}</p>
              </div>
              <button onClick={() => setSelectedCaptain(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <p>
                <strong>License:</strong> {selectedCaptain.drivingLicenseNumber}
              </p>
              <p>
                <strong>Vehicle:</strong> {selectedCaptain.vehicle?.model} ({selectedCaptain.vehicle?.color})
              </p>
              <p>
                <strong>Registration:</strong> {selectedCaptain.vehicle?.registrationNumber}
              </p>
              <p>
                <strong>Category:</strong> {selectedCaptain.vehicle?.category}
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                Rejection Reason (if rejecting)
              </label>
              <input
                type="text"
                placeholder="e.g. Unclear license photo or expired document"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
              />
            </div>

            {selectedCaptain.vehicle?.category === 'BIKE' && (
              <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-900 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-purple-600" /> Women-Only Program
                  </span>
                  <span className="font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase bg-purple-100 text-purple-800">
                    {selectedCaptain.womenOnlyStatus || 'NOT_APPLIED'}
                  </span>
                </div>
                {selectedCaptain.womenOnlyRejectionReason && (
                  <p className="text-red-700 text-[11px]">
                    <strong>Rejection reason:</strong> {selectedCaptain.womenOnlyRejectionReason}
                  </p>
                )}
                {selectedCaptain.womenOnlyStatus === 'APPLIED' && (
                  <p className="text-[11px] text-purple-700">
                    Captain has submitted self-declaration for the Women-Only Bike program and is awaiting review.
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                disabled={isVerifying}
                onClick={() => handleVerifyCaptain('REJECTED')}
                className="border-2 border-red-500 text-red-600 hover:bg-red-50 font-bold py-2.5 rounded-xl text-xs transition-colors"
              >
                Reject Application
              </button>
              <button
                disabled={isVerifying}
                onClick={() => handleVerifyCaptain('APPROVED')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 rounded-xl text-xs transition-colors"
              >
                Approve Captain
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Women-Only Review Modal */}
      {womenOnlyModalCaptain && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-4 animate-fadeIn">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200">
                  DEMO VERIFICATION
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">Women-Only Bike Eligibility</h3>
                <p className="text-xs text-slate-500">{womenOnlyModalCaptain.user?.fullName} ({womenOnlyModalCaptain.user?.email})</p>
              </div>
              <button onClick={() => setWomenOnlyModalCaptain(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Current Status:</span>
                <span className="font-bold text-slate-900">{womenOnlyModalCaptain.womenOnlyStatus || 'NOT_APPLIED'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Currently Eligible:</span>
                <span className="font-bold">{womenOnlyModalCaptain.womenOnlyEligible ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vehicle:</span>
                <span className="font-bold">{womenOnlyModalCaptain.vehicle?.model} ({womenOnlyModalCaptain.vehicle?.registrationNumber})</span>
              </div>
              {womenOnlyModalCaptain.womenOnlyRejectionReason && (
                <div className="text-red-700 pt-1 border-t border-slate-200">
                  <strong>Previous rejection:</strong> {womenOnlyModalCaptain.womenOnlyRejectionReason}
                </div>
              )}
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                Demo Self-Declaration Notice
              </p>
              <p className="text-[11px] mt-1 text-amber-700">
                This verification workflow is a demo prototype. Approving grants this captain eligibility to receive and accept Women-Only ride requests.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                Rejection Reason (if rejecting)
              </label>
              <input
                type="text"
                placeholder="e.g. Ineligible vehicle or declaration criteria unmet"
                value={womenOnlyRejectReason}
                onChange={(e) => setWomenOnlyRejectReason(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                disabled={isWomenOnlyVerifying}
                onClick={() => handleVerifyWomenOnly(womenOnlyModalCaptain.id, 'REJECTED')}
                className="border-2 border-red-500 text-red-600 hover:bg-red-50 font-bold py-2.5 rounded-xl text-xs transition-colors disabled:opacity-50"
              >
                Reject Eligibility
              </button>
              <button
                disabled={isWomenOnlyVerifying}
                onClick={() => handleVerifyWomenOnly(womenOnlyModalCaptain.id, 'APPROVED')}
                className="bg-purple-600 hover:bg-purple-700 text-white font-black py-2.5 rounded-xl text-xs transition-colors disabled:opacity-50"
              >
                Approve for Women-Only
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Company Rejection Modal */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-4 animate-fadeIn">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-black text-slate-900">Reject Company Registration</h3>
                <p className="text-xs text-slate-500">{selectedCompany.name}</p>
              </div>
              <button
                onClick={() => setSelectedCompany(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <p>
                <strong>GSTIN / Tax ID:</strong> {selectedCompany.taxId}
              </p>
              <p>
                <strong>Domain:</strong> {selectedCompany.domain || 'N/A'}
              </p>
              <p>
                <strong>Contact Email:</strong> {selectedCompany.contactEmail}
              </p>
              <p>
                <strong>Billing Address:</strong> {selectedCompany.billingAddress}
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                Rejection Reason (Required)
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Invalid GSTIN or company verification documents missing"
                value={companyRejectReason}
                onChange={(e) => setCompanyRejectReason(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-red-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedCompany(null)}
                className="border border-slate-300 hover:bg-slate-50 font-bold py-2.5 rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={isVerifyingCompany || !companyRejectReason.trim()}
                onClick={() => handleVerifyCompany(selectedCompany.id, 'REJECTED', companyRejectReason.trim())}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isVerifyingCompany ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
