import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';
import {
  Ticket,
  Sparkles,
  Check,
  ShieldCheck,
  Clock,
  Zap,
  TrendingDown,
  RefreshCw,
  AlertCircle,
  XCircle,
  CreditCard,
  Crown,
} from 'lucide-react';
import { SubscriptionPlan, SubscriptionTier } from '../types';

export const SubscriptionPlansPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [checkoutOrder, setCheckoutOrder] = useState<{
    orderId: string;
    planId: string;
    planName: string;
    amount: number;
    currency: string;
    keyId: string;
  } | null>(null);
  const [isInitiatingOrder, setIsInitiatingOrder] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Fetch subscription portal data
  const { data: portal, isLoading } = useQuery({
    queryKey: ['subscription-portal'],
    queryFn: () => api.subscriptions.getPortal(),
    enabled: !!user,
  });

  // Fetch plans if unauthenticated
  const { data: publicPlans } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => api.subscriptions.getPlans(),
    enabled: !user,
  });

  const plans = portal?.availablePlans || publicPlans || [];
  const activeSub = portal?.activeSubscription;

  // Mutations
  const subscribeMutation = useMutation({
    mutationFn: (planId: string) => api.subscriptions.subscribe(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-portal'] });
      setSelectedPlanId(null);
    },
  });

  const toggleAutoRenewMutation = useMutation({
    mutationFn: (subId: string) => api.subscriptions.toggleAutoRenew(subId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-portal'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (subId: string) => api.subscriptions.cancel(subId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-portal'] });
    },
  });

  const handleStartCheckout = async (plan: SubscriptionPlan) => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    setSelectedPlanId(plan.id);
    setIsInitiatingOrder(true);
    setPaymentError(null);
    try {
      const order = await api.subscriptions.createOrder(plan.id);
      setCheckoutOrder(order);
    } catch (err: any) {
      alert(err.message || 'Could not initiate subscription checkout order');
    } finally {
      setIsInitiatingOrder(false);
      setSelectedPlanId(null);
    }
  };

  const handleConfirmPayment = async () => {
    if (!checkoutOrder) return;
    setIsVerifyingPayment(true);
    setPaymentError(null);
    try {
      await api.subscriptions.verifyPayment({
        planId: checkoutOrder.planId,
        razorpayOrderId: checkoutOrder.orderId,
        razorpayPaymentId: 'pay_' + Date.now(),
        razorpaySignature: 'sig_' + Math.random().toString(36).substring(7),
      });

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      setCheckoutOrder(null);
      queryClient.invalidateQueries({ queryKey: ['subscription-portal'] });
    } catch (err: any) {
      setPaymentError(err.message || 'Payment verification failed');
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span>Loading VeloGo Commuter Passes...</span>
        </div>
      </div>
    );
  }

  const getTierBadge = (tier: SubscriptionTier) => {
    switch (tier) {
      case 'COMMUTER':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'PRO':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'VIP':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Header Section */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-400/10 text-amber-400 border border-amber-400/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>VeloGo Recurring Passes & Perks</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Commute Smarter. Save Big on Every Ride.
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Unlock guaranteed discounts on every trip, get monthly free rides, and enjoy priority captain matching with recurring commuter passes.
          </p>
        </div>

        {/* Active Subscription Banner (if user has one) */}
        {activeSub && (
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getTierBadge(activeSub.planTier)}`}>
                    {activeSub.planTier} TIER
                  </span>
                  <span className="text-xs text-slate-400">
                    Active through <span className="text-white font-semibold">{new Date(activeSub.currentPeriodEnd).toLocaleDateString()}</span>
                  </span>
                </div>

                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span>{activeSub.planName}</span>
                  <Crown className="w-5 h-5 text-amber-400" />
                </h2>

                <p className="text-xs text-slate-400">
                  Auto-renewal is <span className={activeSub.autoRenew ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>{activeSub.autoRenew ? 'ENABLED' : 'PAUSED'}</span>.
                  {activeSub.autoRenew ? ' Will renew automatically on expiration.' : ' Pass will expire at end of period.'}
                </p>
              </div>

              {/* Stats & Actions */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl px-5 py-3 text-center">
                  <div className="text-[11px] text-slate-400">Free Rides Left</div>
                  <div className="text-2xl font-extrabold text-amber-400 font-mono">{activeSub.remainingFreeRides}</div>
                </div>

                <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl px-5 py-3 text-center">
                  <div className="text-[11px] text-slate-400">Total Money Saved</div>
                  <div className="text-2xl font-extrabold text-emerald-400 font-mono">₹{portal?.totalSavings || 0}</div>
                </div>

                <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl px-5 py-3 text-center">
                  <div className="text-[11px] text-slate-400">Pass Rides</div>
                  <div className="text-2xl font-extrabold text-white font-mono">{portal?.ridesWithPass || 0}</div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => toggleAutoRenewMutation.mutate(activeSub.id)}
                    disabled={toggleAutoRenewMutation.isPending}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold rounded-xl text-slate-300 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{activeSub.autoRenew ? 'Pause Auto-Renew' : 'Enable Auto-Renew'}</span>
                  </button>

                  {activeSub.autoRenew && (
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to cancel your pass auto-renewal?')) {
                          cancelMutation.mutate(activeSub.id);
                        }
                      }}
                      className="px-4 py-1.5 text-red-400 hover:text-red-300 text-[11px] font-medium transition text-center cursor-pointer"
                    >
                      Cancel Membership
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pricing & Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => {
            const isCurrent = activeSub?.planId === p.id && activeSub.isActive;
            const isFeatured = p.tier === 'PRO';

            return (
              <div
                key={p.id}
                className={`bg-slate-900 border rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 relative shadow-xl ${
                  isFeatured
                    ? 'border-amber-400/60 shadow-amber-500/10 ring-1 ring-amber-400/30'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {isFeatured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wider shadow">
                    Most Popular
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getTierBadge(p.tier)}`}>
                      {p.tier}
                    </span>
                    <span className="text-xs text-slate-400 uppercase font-semibold">{p.interval}</span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2">{p.name}</h3>
                  <p className="text-xs text-slate-400 mb-6 leading-relaxed min-h-[36px]">{p.description}</p>

                  <div className="mb-6 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-white font-mono">₹{p.price}</span>
                    <span className="text-xs text-slate-400">/{p.interval === 'ANNUAL' ? 'year' : 'month'}</span>
                  </div>

                  <div className="space-y-3 border-t border-slate-800/80 pt-6 mb-8 text-xs text-slate-300">
                    <div className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong className="text-white">{p.discountPercentage}% OFF</strong> on every trip (up to ₹{p.maxDiscountPerRide}/ride)
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong className="text-white">{p.freeRidesCount} Free Rides</strong> included every cycle
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Check className={`w-4 h-4 shrink-0 ${p.priorityMatching ? 'text-cyan-400' : 'text-slate-600'}`} />
                      <span className={p.priorityMatching ? 'text-white' : 'text-slate-500'}>
                        Priority captain dispatch & matching
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Zero surge multiplier protections</span>
                    </div>
                  </div>
                </div>

                <div>
                  {isCurrent ? (
                    <div className="w-full py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold text-center">
                      ✓ Currently Active Pass
                    </div>
                  ) : (
                    <button
                      onClick={() => handleStartCheckout(p)}
                      disabled={isInitiatingOrder && selectedPlanId === p.id}
                      className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        isFeatured
                          ? 'bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-lg shadow-amber-400/20'
                          : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                      }`}
                    >
                      <Ticket className="w-4 h-4" />
                      <span>
                        {isInitiatingOrder && selectedPlanId === p.id
                          ? 'Initiating Checkout...'
                          : activeSub
                          ? 'Switch to this Pass'
                          : 'Subscribe Now'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Usage History Section */}
        {portal?.recentUsages && portal.recentUsages.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl p-6">
            <h3 className="text-base font-bold text-white mb-1">Pass Usage & Discount Log</h3>
            <p className="text-xs text-slate-400 mb-4">Itemized history of trip discounts saved with your active membership.</p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/50 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Trip Date</th>
                    <th className="px-4 py-3">Pass Benefit Applied</th>
                    <th className="px-4 py-3">Savings Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {portal.recentUsages.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3 text-slate-300">{new Date(u.usedAt).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        {u.wasFreeRide ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            🎟️ 100% Free Ride
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Tier % Discount
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-400">+₹{u.discountApplied}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payment Checkout Modal */}
        {checkoutOrder && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative overflow-hidden space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Subscribe to Pass</h3>
                    <p className="text-xs text-slate-400">Order #{checkoutOrder.orderId.slice(0, 10)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setCheckoutOrder(null)}
                  disabled={isVerifyingPayment}
                  className="text-slate-400 hover:text-white text-xs font-semibold p-1"
                >
                  ✕
                </button>
              </div>

              {paymentError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              {/* Order summary card */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Selected Plan</span>
                  <span className="text-xs font-bold text-white">{checkoutOrder.planName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Billing Cycle</span>
                  <span className="text-xs font-semibold text-slate-300">Monthly Recurring</span>
                </div>
                <div className="border-t border-slate-700/60 pt-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Total Amount Due</span>
                  <span className="text-xl font-mono font-extrabold text-amber-400">₹{checkoutOrder.amount}</span>
                </div>
              </div>

              {/* Payment Gateway badge */}
              <div className="p-3 bg-slate-800/40 border border-slate-700/40 rounded-xl flex items-center gap-3 text-xs text-slate-300">
                <CreditCard className="w-5 h-5 text-cyan-400 shrink-0" />
                <div>
                  <div className="font-semibold text-white">Razorpay Secure Checkout</div>
                  <div className="text-[11px] text-slate-400">Supports UPI, NetBanking, and Credit/Debit Cards</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCheckoutOrder(null)}
                  disabled={isVerifyingPayment}
                  className="flex-1 py-3 border border-slate-700 text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  disabled={isVerifyingPayment}
                  className="flex-1 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 text-xs font-bold rounded-xl transition shadow-lg shadow-amber-400/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isVerifyingPayment ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Pay ₹{checkoutOrder.amount} & Activate</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionPlansPage;
