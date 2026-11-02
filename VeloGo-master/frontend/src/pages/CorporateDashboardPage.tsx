import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Users,
  CheckCircle2,
  XCircle,
  FileText,
  CreditCard,
  Plus,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Receipt,
  Download,
  Calendar,
  Settings,
  Clock,
  Sparkles,
} from 'lucide-react';
import { CompanyMemberRole, CompanyMemberStatus } from '../types';

export const CorporateDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'members' | 'approvals' | 'invoices' | 'settings'>('members');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showRegisterCompanyModal, setShowRegisterCompanyModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Form states for Add Member
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<CompanyMemberRole>('EMPLOYEE');
  const [newMemberBudget, setNewMemberBudget] = useState('5000');

  // Form states for Register Company
  const [companyName, setCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [domain, setDomain] = useState('');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [creditLimit, setCreditLimit] = useState('100000');
  const [approvalThreshold, setApprovalThreshold] = useState('500');

  // Query corporate dashboard
  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: ['corporate-dashboard'],
    queryFn: () => api.corporate.getDashboard(),
    retry: 1,
  });

  // Mutations
  const addMemberMutation = useMutation({
    mutationFn: (data: { userEmail: string; role: CompanyMemberRole; monthlyBudget: number }) =>
      api.corporate.addMember(dashboard!.company.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corporate-dashboard'] });
      setShowAddMemberModal(false);
      setNewMemberEmail('');
      setNewMemberBudget('5000');
    },
  });

  const registerCompanyMutation = useMutation({
    mutationFn: (data: any) => api.corporate.registerCompany(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corporate-dashboard'] });
      setShowRegisterCompanyModal(false);
    },
  });

  const reviewApprovalMutation = useMutation({
    mutationFn: ({ requestId, approved, reason }: { requestId: string; approved: boolean; reason?: string }) =>
      api.corporate.reviewApproval(requestId, { approved, rejectionReason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corporate-dashboard'] });
      setShowRejectModal(null);
      setRejectionReason('');
    },
  });

  const generateInvoiceMutation = useMutation({
    mutationFn: () => api.corporate.generateInvoice(dashboard!.company.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corporate-dashboard'] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-300">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span>Loading Corporate B2B Account...</span>
        </div>
      </div>
    );
  }

  // Not enrolled state
  if (error || !dashboard) {
    return (
      <div className="min-h-[85vh] bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12">
        <div className="max-w-xl w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl text-center">
          <div className="w-16 h-16 bg-amber-400/10 border border-amber-400/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">VeloGo Corporate Accounts</h1>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Manage employee travel allowances, enforce trip approval workflows, and receive consolidated monthly B2B invoices with GST compliance.
          </p>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 mb-6 text-left space-y-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
              <div className="text-xs text-slate-300">
                <span className="font-semibold text-white">Centralized Allowance:</span> Assign customized monthly budgets to employees, managers, and executives.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
              <div className="text-xs text-slate-300">
                <span className="font-semibold text-white">Automated Approval Policies:</span> Require manager approval for trips exceeding your budget thresholds.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-cyan-400 mt-0.5 shrink-0" />
              <div className="text-xs text-slate-300">
                <span className="font-semibold text-white">Consolidated Invoicing:</span> Auto-generated monthly billing statements with 5% GST tax breakdown.
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowRegisterCompanyModal(true)}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-semibold rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Register Your Enterprise Company</span>
          </button>
        </div>

        {/* Modal: Register Company */}
        {showRegisterCompanyModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-1">Register Enterprise Account</h2>
              <p className="text-xs text-slate-400 mb-4">You will be designated as the Corporate Administrator.</p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  registerCompanyMutation.mutate({
                    name: companyName,
                    taxId,
                    billingAddress,
                    domain,
                    contactEmail,
                    creditLimit: parseFloat(creditLimit),
                    approvalThreshold: parseFloat(approvalThreshold),
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Company Legal Name</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Technologies India Pvt Ltd"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">GSTIN / Tax ID</label>
                    <input
                      type="text"
                      required
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      placeholder="29AABCA1234F1Z8"
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Corporate Domain</label>
                    <input
                      type="text"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      placeholder="acme.corp"
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Contact Email</label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="admin@company.com"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Registered Billing Address</label>
                  <textarea
                    required
                    rows={2}
                    value={billingAddress}
                    onChange={(e) => setBillingAddress(e.target.value)}
                    placeholder="Headquarters address, City, PIN"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Monthly Credit Limit (₹)</label>
                    <input
                      type="number"
                      required
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Approval Threshold (₹)</label>
                    <input
                      type="number"
                      required
                      value={approvalThreshold}
                      onChange={(e) => setApprovalThreshold(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowRegisterCompanyModal(false)}
                    className="flex-1 py-2.5 border border-slate-700 text-slate-300 font-medium rounded-xl hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={registerCompanyMutation.isPending}
                    className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-semibold rounded-xl transition"
                  >
                    {registerCompanyMutation.isPending ? 'Registering...' : 'Confirm Registration'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  const { company, members, pendingApprovals, recentInvoices, totalRidesTaken, totalSpentCurrentMonth } = dashboard;
  const isCallerAdmin = members.some((m) => m.userId === user?.id && m.role === 'ADMIN');
  const isCallerManager = members.some((m) => m.userId === user?.id && (m.role === 'ADMIN' || m.role === 'MANAGER'));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center text-slate-950 shadow-md">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">{company.name}</h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    company.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : company.status === 'PENDING_VERIFICATION'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                      : company.status === 'REJECTED'
                      ? 'bg-red-500/10 text-red-400 border-red-500/20'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {company.status.replace('_', ' ')}
                </span>
                {company.domain && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                    @{company.domain}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                GSTIN: <span className="font-mono text-slate-300">{company.taxId}</span> • Approval Threshold: <span className="font-semibold text-amber-400">₹{company.approvalThreshold}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isCallerManager && (
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-md shadow-amber-400/10 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Employee</span>
              </button>
            )}
            <button
              onClick={() => generateInvoiceMutation.mutate()}
              disabled={generateInvoiceMutation.isPending}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Receipt className="w-4 h-4 text-cyan-400" />
              <span>{generateInvoiceMutation.isPending ? 'Generating...' : 'Generate Invoice'}</span>
            </button>
          </div>
        </div>

        {/* Verification Alert Banners */}
        {company.status === 'PENDING_VERIFICATION' && (
          <div className="p-4 bg-amber-400/10 border border-amber-400/30 rounded-2xl flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-white block">Account Under Super Admin Verification</span>
                <span className="text-[11px] text-amber-300/80">
                  Your enterprise account is currently being reviewed. You can invite team members and set policies now; corporate ride billing will activate once approved.
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full font-bold uppercase tracking-wider bg-amber-400 text-slate-950 text-[10px]">
              Pending Approval
            </span>
          </div>
        )}

        {company.status === 'REJECTED' && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-xs text-red-300">
            <XCircle className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <span className="font-bold text-white block">Registration Request Rejected</span>
              <span className="text-[11px] text-red-300/80">
                Reason: {company.rejectionReason || 'Corporate verification requirements were not met. Please contact support@velogo.com.'}
              </span>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="text-slate-400 text-xs font-medium mb-1">Available Credit</div>
            <div className="text-2xl font-bold text-emerald-400">₹{company.availableCredit.toLocaleString('en-IN')}</div>
            <div className="text-[11px] text-slate-500 mt-1">Limit: ₹{company.creditLimit.toLocaleString('en-IN')}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="text-slate-400 text-xs font-medium mb-1">Spent This Month</div>
            <div className="text-2xl font-bold text-amber-400">₹{totalSpentCurrentMonth.toLocaleString('en-IN')}</div>
            <div className="text-[11px] text-slate-500 mt-1">{totalRidesTaken} corporate rides</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="text-slate-400 text-xs font-medium mb-1">Enrolled Members</div>
            <div className="text-2xl font-bold text-white">{members.length}</div>
            <div className="text-[11px] text-slate-500 mt-1">Across all departments</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="text-slate-400 text-xs font-medium mb-1">Pending Approvals</div>
            <div className="text-2xl font-bold text-cyan-400">{pendingApprovals.length}</div>
            <div className="text-[11px] text-slate-500 mt-1">Awaiting manager review</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 gap-6">
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-3 text-sm font-semibold transition border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'members'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Employees & Budget ({members.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('approvals')}
            className={`pb-3 text-sm font-semibold transition border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'approvals'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Trip Approvals</span>
            {pendingApprovals.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] flex items-center justify-center font-bold">
                {pendingApprovals.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            className={`pb-3 text-sm font-semibold transition border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'invoices'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>B2B Invoices ({recentInvoices.length})</span>
          </button>
        </div>

        {/* Tab 1: Member Roster & Allowance */}
        {activeTab === 'members' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Employee Travel Allowances</h3>
                <p className="text-xs text-slate-400">Monthly budget resets automatically on the 1st of every month.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/50 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-3.5">Employee</th>
                    <th className="px-6 py-3.5">Role</th>
                    <th className="px-6 py-3.5">Monthly Allowance</th>
                    <th className="px-6 py-3.5">Spent This Month</th>
                    <th className="px-6 py-3.5">Remaining</th>
                    <th className="px-6 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {members.map((m) => {
                    const pct = Math.min(100, Math.round((m.currentMonthSpent / (m.monthlyBudget || 1)) * 100));
                    return (
                      <tr key={m.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-white">{m.userName}</div>
                          <div className="text-[11px] text-slate-400">{m.userEmail}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              m.role === 'ADMIN'
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : m.role === 'MANAGER'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-slate-700/50 text-slate-300'
                            }`}
                          >
                            {m.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono font-semibold text-white">
                          ₹{m.monthlyBudget.toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-300">₹{m.currentMonthSpent}</span>
                            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${pct > 80 ? 'bg-red-500' : 'bg-amber-400'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-500">{pct}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono font-semibold text-emerald-400">
                          ₹{m.remainingBudget.toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400">
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Trip Approvals */}
        {activeTab === 'approvals' && (
          <div className="space-y-4">
            {pendingApprovals.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-60" />
                <h3 className="text-base font-bold text-white mb-1">Approval Queue is Clear</h3>
                <p className="text-xs text-slate-400">No corporate ride requests are currently awaiting manager approval.</p>
              </div>
            ) : (
              pendingApprovals.map((req) => (
                <div key={req.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-2 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{req.employeeName}</span>
                      <span className="text-xs text-slate-400">({req.employeeEmail})</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Awaiting Review
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 flex items-center gap-2">
                      <span className="font-medium text-slate-400 truncate max-w-[200px]">{req.pickupAddress || 'Pickup'}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-medium text-slate-400 truncate max-w-[200px]">{req.destAddress || 'Destination'}</span>
                    </div>

                    <div className="text-xs text-slate-400 italic">
                      Purpose: "{req.reason || 'Client meeting / Corporate travel'}"
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Estimated Fare</div>
                      <div className="text-xl font-bold text-white font-mono">₹{req.estimatedFare}</div>
                    </div>

                    {isCallerManager && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => reviewApprovalMutation.mutate({ requestId: req.id, approved: true })}
                          disabled={reviewApprovalMutation.isPending}
                          className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => setShowRejectModal(req.id)}
                          className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold rounded-xl text-xs border border-red-500/20 transition flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: B2B Invoices */}
        {activeTab === 'invoices' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Consolidated Monthly Invoices</h3>
                <p className="text-xs text-slate-400">Invoices are compliant with 5% GST and include itemized ride summaries.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/50 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-3.5">Invoice #</th>
                    <th className="px-6 py-3.5">Billing Period</th>
                    <th className="px-6 py-3.5">Trips</th>
                    <th className="px-6 py-3.5">Subtotal</th>
                    <th className="px-6 py-3.5">5% GST</th>
                    <th className="px-6 py-3.5">Total Payable</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-6 py-4 font-mono font-semibold text-white">{inv.invoiceNumber}</td>
                      <td className="px-6 py-4 text-slate-300">
                        {new Date(inv.billingPeriodStart).toLocaleDateString()} — {new Date(inv.billingPeriodEnd).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-300">{inv.ridesCount} rides</td>
                      <td className="px-6 py-4 font-mono text-slate-300">₹{inv.subtotalAmount}</td>
                      <td className="px-6 py-4 font-mono text-slate-400">₹{inv.taxAmount}</td>
                      <td className="px-6 py-4 font-mono font-bold text-amber-400">₹{inv.totalAmount}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            alert(`Downloading receipt for invoice ${inv.invoiceNumber} (Total: ₹${inv.totalAmount})`);
                          }}
                          className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Add Employee */}
        {showAddMemberModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl">
              <h2 className="text-lg font-bold text-white mb-1">Add Employee to Roster</h2>
              <p className="text-xs text-slate-400 mb-4">Allocate a corporate travel allowance for business rides.</p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addMemberMutation.mutate({
                    userEmail: newMemberEmail,
                    role: newMemberRole,
                    monthlyBudget: parseFloat(newMemberBudget),
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Registered User Email</label>
                  <input
                    type="email"
                    required
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="employee@company.com"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Designated Role</label>
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value as CompanyMemberRole)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400"
                  >
                    <option value="EMPLOYEE">EMPLOYEE (Standard threshold approvals)</option>
                    <option value="MANAGER">MANAGER (Can approve employee rides)</option>
                    <option value="ADMIN">ADMIN (Full roster & billing access)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Monthly Allowance Budget (₹)</label>
                  <input
                    type="number"
                    required
                    value={newMemberBudget}
                    onChange={(e) => setNewMemberBudget(e.target.value)}
                    placeholder="5000"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>

                {addMemberMutation.isError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                    {(addMemberMutation.error as Error).message}
                  </div>
                )}

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddMemberModal(false)}
                    className="flex-1 py-2.5 border border-slate-700 text-slate-300 font-medium rounded-xl hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addMemberMutation.isPending}
                    className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-semibold rounded-xl transition"
                  >
                    {addMemberMutation.isPending ? 'Adding...' : 'Allocate & Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Reject Approval */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl">
              <h2 className="text-lg font-bold text-white mb-1">Reject Ride Request</h2>
              <p className="text-xs text-slate-400 mb-4">Provide a reason so the employee knows why this trip was rejected.</p>

              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Non-work related travel / Please take public transport / Budget freeze"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-red-400 mb-4"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(null)}
                  className="flex-1 py-2.5 border border-slate-700 text-slate-300 font-medium rounded-xl hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => reviewApprovalMutation.mutate({ requestId: showRejectModal, approved: false, reason: rejectionReason })}
                  disabled={reviewApprovalMutation.isPending}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition"
                >
                  {reviewApprovalMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CorporateDashboardPage;
