import React, { useState, useEffect } from 'react';
import { Ride, PaymentMethod } from '../types';
import { api } from '../services/api';
import confetti from 'canvas-confetti';
import {
  Bike,
  Car,
  CheckCircle2,
  Clock,
  Compass,
  CreditCard,
  Download,
  Key,
  MapPin,
  Phone,
  Shield,
  Star,
  XCircle,
  AlertTriangle,
  Building2,
} from 'lucide-react';
import { RatingDialog } from './RatingDialog';
import { ReceiptModal } from './ReceiptModal';

interface RideStatusModalProps {
  ride: Ride;
  onRideCancelled: () => void;
  onPaymentCompleted?: () => void;
}

export const RideStatusModal: React.FC<RideStatusModalProps> = ({
  ride,
  onRideCancelled,
  onPaymentCompleted,
}) => {
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('Changed my mind');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Trigger celebration confetti on ride complete
  useEffect(() => {
    if (ride.status === 'COMPLETED' && ride.paymentStatus === 'SUCCESS') {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
      });
    }
  }, [ride.status, ride.paymentStatus]);

  const handleCancel = async () => {
    try {
      await api.rides.cancel(ride.id, cancelReason);
      onRideCancelled();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to cancel ride');
    }
  };

  const handlePayNow = async (method: PaymentMethod = 'RAZORPAY') => {
    setIsProcessingPayment(true);
    setErrorMsg(null);
    try {
      // 1. Create order
      const order = await api.payments.createOrder(ride.id, method);

      // 2. Complete payment via simulated/test verification
      await api.payments.verify({
        paymentId: order.paymentId,
        razorpayPaymentId: 'pay_test_' + Date.now(),
        razorpayOrderId: order.razorpayOrderId,
        razorpaySignature: 'sig_test_valid',
        simulatedSuccess: true,
      });

      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      if (onPaymentCompleted) onPaymentCompleted();
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment processing failed');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const getStepProgress = () => {
    switch (ride.status) {
      case 'SEARCHING':
        return 1;
      case 'ACCEPTED':
      case 'ARRIVING':
        return 2;
      case 'ARRIVED':
        return 3;
      case 'IN_PROGRESS':
        return 4;
      case 'COMPLETED':
        return 5;
      default:
        return 0;
    }
  };

  const step = getStepProgress();

  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
      {/* Header status bar */}
      <div className="bg-navy-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center">
            {ride.vehicleCategory === 'BIKE' ? (
              <Bike className="w-5 h-5" />
            ) : (
              <Car className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
              {ride.status === 'REQUESTED' && 'Corporate Approval Pending'}
              {ride.status === 'SEARCHING' && 'Connecting to Nearby Captain'}
              {ride.status === 'ACCEPTED' && 'Captain Assigned'}
              {ride.status === 'ARRIVING' && 'Captain On the Way'}
              {ride.status === 'ARRIVED' && 'Captain Has Arrived'}
              {ride.status === 'IN_PROGRESS' && 'Trip In Progress'}
              {ride.status === 'COMPLETED' && 'Trip Completed'}
              {ride.status === 'CANCELLED' && 'Ride Cancelled'}
            </h3>
            <p className="text-xs text-slate-400">Booking ID: #{ride.id.slice(0, 8)}</p>
          </div>
        </div>

        <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
          ride.status === 'REQUESTED'
            ? 'bg-amber-400 text-slate-950 animate-pulse'
            : 'bg-brand-500 text-slate-950'
        }`}>
          {ride.status === 'REQUESTED' ? 'PENDING APPROVAL' : ride.status}
        </span>
      </div>

      {errorMsg && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Progress Stepper */}
      {ride.status !== 'CANCELLED' && (
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span className={ride.status === 'REQUESTED' ? 'text-amber-600 font-extrabold' : step >= 1 ? 'text-brand-600' : ''}>
              {ride.status === 'REQUESTED' ? '0. Approval' : '1. Searching'}
            </span>
            <span className={step >= 2 ? 'text-brand-600' : ''}>2. Assigned</span>
            <span className={step >= 3 ? 'text-brand-600' : ''}>3. Arrived</span>
            <span className={step >= 4 ? 'text-brand-600' : ''}>4. Riding</span>
            <span className={step >= 5 ? 'text-brand-600' : ''}>5. Done</span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${ride.status === 'REQUESTED' ? 'bg-amber-400' : 'bg-brand-500'}`}
              style={{ width: `${ride.status === 'REQUESTED' ? 10 : (step / 5) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* State 0: Corporate Approval Pending */}
        {ride.status === 'REQUESTED' && (
          <div className="text-center py-6 space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-500 flex items-center justify-center mx-auto shadow-sm">
              <Building2 className="w-8 h-8" />
            </div>
            <h4 className="font-extrabold text-lg text-slate-900">
              Waiting for Corporate Admin Approval
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              This trip exceeds your company allowance or standard threshold and has been submitted to your manager. Once approved, we will automatically match you with a nearby captain.
            </p>
          </div>
        )}

        {/* State 1: SEARCHING Radar */}
        {ride.status === 'SEARCHING' && (
          <div className="text-center py-6">
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-brand-400/30 animate-radar" />
              <div className="absolute inset-0 rounded-full bg-brand-500/20 animate-ping" />
              <div className="w-14 h-14 rounded-full bg-brand-500 flex items-center justify-center shadow-glow text-slate-950 font-black">
                <Bike className="w-7 h-7" />
              </div>
            </div>
            <h4 className="mt-4 font-extrabold text-lg text-slate-900">
              Matching with nearby {ride.vehicleCategory} Captains...
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Captains within your area are receiving your request card with route & fare preview.
            </p>
          </div>
        )}

        {/* State 2 & 3 & 4: Captain Details */}
        {ride.captainName && (
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={
                    ride.captainAvatar ||
                    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
                  }
                  alt={ride.captainName}
                  className="w-12 h-12 rounded-xl object-cover ring-2 ring-brand-400"
                />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    {ride.captainName}
                    <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                      VERIFIED
                    </span>
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1 text-xs font-bold text-amber-600">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      {ride.captainRating || '4.9'}
                    </span>
                    <span className="text-xs text-slate-400">&bull;</span>
                    <span className="text-xs text-slate-600 font-medium">
                      {ride.vehicleModel || 'Vehicle'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Number Plate Display */}
              <div className="bg-amber-100 border-2 border-slate-800 px-3 py-1 rounded-md text-center shadow-sm">
                <span className="text-[9px] uppercase font-bold text-slate-600 tracking-widest block leading-none">
                  IND
                </span>
                <span className="text-xs font-black text-slate-950 tracking-wider">
                  {ride.registrationNumber || 'KA-01-EQ-1234'}
                </span>
              </div>
            </div>

            {/* OTP Display for Customer */}
            {(ride.status === 'ACCEPTED' ||
              ride.status === 'ARRIVING' ||
              ride.status === 'ARRIVED') && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <Key className="w-4 h-4 text-amber-600" />
                  <span>Share OTP with Captain to Start Trip:</span>
                </div>
                <span className="font-mono text-lg font-black tracking-widest bg-white px-3 py-1 rounded-lg border border-amber-300 text-slate-900 shadow-sm">
                  {ride.otpCode}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Route Summary */}
        <div className="space-y-3 text-xs">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-semibold text-slate-400 uppercase text-[10px]">Pickup Location</p>
              <p className="font-medium text-slate-800 text-xs">{ride.pickupAddress}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-semibold text-slate-400 uppercase text-[10px]">Destination</p>
              <p className="font-medium text-slate-800 text-xs">{ride.destAddress}</p>
            </div>
          </div>
        </div>

        {/* Fare and Payment Footer */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400">Total Ride Fare</p>
            <p className="text-2xl font-black text-slate-900">
              ₹{Number(ride.finalFare || ride.estimatedFare || 0).toFixed(2)}
            </p>
          </div>

          {/* Payment Status indicator */}
          <div className="text-right">
            <p className="text-[11px] font-semibold text-slate-400">Payment Status</p>
            <span
              className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full ${
                ride.paymentStatus === 'SUCCESS' || ride.paymentMethod === 'CORPORATE' || ride.paymentMethod === 'SUBSCRIPTION_PASS'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {ride.paymentMethod === 'CORPORATE'
                ? 'Corporate Billed'
                : ride.paymentMethod === 'SUBSCRIPTION_PASS'
                ? 'Pass Covered'
                : `${ride.paymentStatus} (${ride.paymentMethod})`}
            </span>
          </div>
        </div>

        {/* Action Buttons based on status */}
        {ride.status === 'COMPLETED' ? (
          <div className="space-y-3 pt-2">
            {ride.paymentStatus !== 'SUCCESS' && ride.paymentMethod !== 'CORPORATE' && ride.paymentMethod !== 'SUBSCRIPTION_PASS' ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  disabled={isProcessingPayment}
                  onClick={() => handlePayNow('RAZORPAY')}
                  className="w-full bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold py-3 px-4 rounded-xl shadow-glow text-sm flex items-center justify-center gap-2 transition-all"
                >
                  <CreditCard className="w-4 h-4" /> Pay with Razorpay
                </button>
                <button
                  disabled={isProcessingPayment}
                  onClick={() => handlePayNow('CASH')}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" /> Pay with Cash
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowReceiptModal(true)}
                  className="w-full border-2 border-slate-300 hover:border-slate-800 font-bold text-slate-800 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> View Receipt
                </button>
                <button
                  onClick={() => setShowRatingModal(true)}
                  className="w-full bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                >
                  <Star className="w-3.5 h-3.5 fill-slate-950" /> Rate Captain
                </button>
              </div>
            )}
          </div>
        ) : (
          ride.status !== 'CANCELLED' &&
          ride.status !== 'IN_PROGRESS' && (
            <div className="pt-2">
              {!isCancelling ? (
                <button
                  onClick={() => setIsCancelling(true)}
                  className="w-full text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 py-2.5 rounded-xl transition-colors"
                >
                  Cancel Ride Request
                </button>
              ) : (
                <div className="p-3 bg-red-50 rounded-xl space-y-2 border border-red-200">
                  <p className="text-xs font-bold text-red-900">Confirm Ride Cancellation?</p>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-red-300 bg-white"
                  >
                    <option value="Changed my mind">Changed my mind</option>
                    <option value="Captain is too far away">Captain is too far away</option>
                    <option value="Booked by mistake">Booked by mistake</option>
                    <option value="Taking alternative ride">Taking alternative ride</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancel}
                      className="flex-1 bg-red-600 text-white font-bold py-1.5 rounded-lg text-xs"
                    >
                      Yes, Cancel
                    </button>
                    <button
                      onClick={() => setIsCancelling(false)}
                      className="flex-1 bg-white text-slate-700 font-bold py-1.5 rounded-lg text-xs border border-slate-300"
                    >
                      Keep Ride
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* Rating & Receipt Modals */}
      {showRatingModal && (
        <RatingDialog
          rideId={ride.id}
          captainName={ride.captainName || 'Captain'}
          onClose={() => setShowRatingModal(false)}
        />
      )}

      {showReceiptModal && (
        <ReceiptModal rideId={ride.id} onClose={() => setShowReceiptModal(false)} />
      )}
    </div>
  );
};
