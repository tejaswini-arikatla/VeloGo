import React, { useState } from 'react';
import { CategoryEstimate, VehicleCategory } from '../types';
import { Bike, Car, ChevronDown, ChevronUp, Clock, ShieldCheck } from 'lucide-react';

interface FareCardProps {
  estimate: CategoryEstimate;
  isSelected: boolean;
  onSelect: () => void;
}

export const FareCard: React.FC<FareCardProps> = ({ estimate, isSelected, onSelect }) => {
  const [showDetails, setShowDetails] = useState(false);

  const getCategoryIcon = (cat: VehicleCategory) => {
    switch (cat) {
      case 'BIKE':
        return <Bike className="w-6 h-6 text-brand-600" />;
      case 'AUTO':
        return (
          <div className="w-6 h-6 flex items-center justify-center font-black text-amber-700 bg-amber-100 rounded">
            🛺
          </div>
        );
      case 'CAB':
        return <Car className="w-6 h-6 text-emerald-600" />;
      case 'WOMEN_BIKE':
        return (
          <div className="w-6 h-6 flex items-center justify-center font-black text-purple-700 bg-purple-100 rounded">
            <ShieldCheck className="w-5 h-5 text-purple-600" />
          </div>
        );
    }
  };

  const isWomenBike = estimate.category === 'WOMEN_BIKE';

  return (
    <div
      onClick={onSelect}
      className={`relative cursor-pointer transition-all duration-200 rounded-2xl border-2 p-4 ${
        isSelected
          ? isWomenBike
            ? 'border-purple-500 bg-purple-50/40 shadow-glow'
            : 'border-brand-500 bg-brand-50/40 shadow-glow'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
      }`}
    >
      <div className="flex items-center justify-between">
        {/* Left: Icon & Category name */}
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isWomenBike ? 'bg-purple-50' : 'bg-slate-100'}`}>
            {getCategoryIcon(estimate.category)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-900 text-base">{estimate.categoryName}</h4>
              {isWomenBike && (
                <span className="text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <ShieldCheck className="w-3 h-3" /> Women-Only
                </span>
              )}
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                estimate.isAvailable
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                <Clock className="w-3 h-3" /> {estimate.etaText}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {estimate.distanceKm} km &bull; ~{estimate.durationMinutes} mins travel time
            </p>
          </div>
        </div>

        {/* Right: Price & select indicator */}
        <div className="text-right">
          {estimate.isSubscriptionFreeRide ? (
            <div>
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-slate-950 uppercase tracking-wider mb-1 animate-pulse">
                🎟️ Free Ride
              </span>
              <p className="text-xs text-slate-400 line-through font-medium">
                ₹{(Number(estimate.baseFare || 0) + Number(estimate.distanceCharge || 0) + Number(estimate.timeCharge || 0) + Number(estimate.bookingFee || 0)).toFixed(2)}
              </p>
              <p className="text-xl font-extrabold text-emerald-600">
                ₹0.00
              </p>
            </div>
          ) : (
            <div>
              {Number(estimate.subscriptionDiscount || 0) > 0 && (
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 uppercase tracking-wider mb-1">
                  Pass -₹{Number(estimate.subscriptionDiscount).toFixed(0)}
                </span>
              )}
              {(Number(estimate.discountAmount || 0) > 0 || Number(estimate.subscriptionDiscount || 0) > 0) && (
                <p className="text-xs text-slate-400 line-through font-medium">
                  ₹{(Number(estimate.totalFare || 0) + Number(estimate.discountAmount || 0) + Number(estimate.subscriptionDiscount || 0)).toFixed(2)}
                </p>
              )}
              <p className="text-xl font-extrabold text-slate-900">
                ₹{Number(estimate.totalFare || 0).toFixed(2)}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(!showDetails);
            }}
            className="text-[11px] font-medium text-brand-700 hover:underline inline-flex items-center gap-0.5 mt-0.5"
          >
            Breakdown {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Breakdown Details Collapsible */}
      {showDetails && (
        <div className="mt-3 pt-3 border-t border-slate-200/80 text-xs text-slate-600 space-y-1.5 animate-fadeIn">
          <div className="flex justify-between">
            <span>Base Fare</span>
            <span>₹{Number(estimate.baseFare || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Distance Charge ({estimate.distanceKm ?? 0} km)</span>
            <span>₹{Number(estimate.distanceCharge || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Time Charge ({estimate.durationMinutes ?? 0} mins)</span>
            <span>₹{Number(estimate.timeCharge || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Platform & Safety Fee</span>
            <span>₹{Number(estimate.bookingFee || 0).toFixed(2)}</span>
          </div>
          {Number(estimate.discountAmount || 0) > 0 && (
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>Promotional Coupon</span>
              <span>-₹{Number(estimate.discountAmount || 0).toFixed(2)}</span>
            </div>
          )}
          {estimate.isSubscriptionFreeRide ? (
            <div className="flex justify-between text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded-lg">
              <span>Subscription Pass (100% Free Ride)</span>
              <span>-100% (FREE)</span>
            </div>
          ) : Number(estimate.subscriptionDiscount || 0) > 0 ? (
            <div className="flex justify-between text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-lg">
              <span>Subscription Pass Savings</span>
              <span>-₹{Number(estimate.subscriptionDiscount || 0).toFixed(2)}</span>
            </div>
          ) : null}
          <div className="flex justify-between text-slate-400">
            <span>Applicable Taxes</span>
            <span>₹{Number(estimate.taxAmount || 0).toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
