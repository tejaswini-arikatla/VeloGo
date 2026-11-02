import React, { useEffect, useState } from 'react';
import { PaymentReceipt } from '../types';
import { api } from '../services/api';
import { Bike, Download, Printer, X } from 'lucide-react';

interface ReceiptModalProps {
  rideId: string;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ rideId, onClose }) => {
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.payments
      .getReceipt(rideId)
      .then((data) => setReceipt(data))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [rideId]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl relative p-6 animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 print:hidden"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="py-12 text-center text-slate-400">Loading receipt...</div>
        ) : receipt ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="border-b border-slate-200 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
                    <Bike className="w-5 h-5 text-slate-950" />
                  </div>
                  <span className="font-extrabold text-xl tracking-tight text-slate-900">
                    Velo<span className="text-brand-500">Go</span>
                  </span>
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
                  TAX INVOICE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Invoice #{receipt.paymentId.slice(0, 12)} &bull; {receipt.date}
              </p>
            </div>

            {/* Ride & Captain summary */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="font-semibold text-slate-400">Customer</p>
                <p className="font-bold text-slate-900">{receipt.customerName}</p>
                <p className="text-slate-500">{receipt.customerPhone}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-400">Captain & Vehicle</p>
                <p className="font-bold text-slate-900">{receipt.captainName}</p>
                <p className="text-slate-500">
                  {receipt.vehicleModel} &bull; {receipt.registrationNumber}
                </p>
              </div>
            </div>

            {/* Route */}
            <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-2 border border-slate-200">
              <div>
                <span className="font-bold text-slate-400 uppercase text-[9px] block">Pickup</span>
                <span className="text-slate-800 font-medium">{receipt.pickupAddress}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 uppercase text-[9px] block">Destination</span>
                <span className="text-slate-800 font-medium">{receipt.destAddress}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-slate-500 text-[11px]">
                <span>Distance: {receipt.distanceKm} km</span>
                <span>Trip Duration: {receipt.durationMinutes} mins</span>
              </div>
            </div>

            {/* Itemized Fare */}
            <div className="space-y-2 text-xs border-t border-slate-200 pt-4">
              <div className="flex justify-between">
                <span className="text-slate-600">Base Fare</span>
                <span className="font-semibold text-slate-900">₹{receipt.baseFare.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Distance Charges</span>
                <span className="font-semibold text-slate-900">₹{receipt.distanceCharge.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Time Charges</span>
                <span className="font-semibold text-slate-900">₹{receipt.timeCharge.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Platform & Booking Fee</span>
                <span className="font-semibold text-slate-900">₹{receipt.bookingFee.toFixed(2)}</span>
              </div>
              {receipt.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Promotional Coupon Discount</span>
                  <span>-₹{receipt.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-500">
                <span>Applicable GST / Taxes</span>
                <span className="font-semibold">₹{receipt.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t-2 border-slate-900 text-sm font-extrabold text-slate-950">
                <span>Total Amount Paid</span>
                <span className="text-lg">₹{receipt.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment footer */}
            <div className="bg-slate-100 rounded-xl p-3 text-[11px] text-slate-600 flex justify-between items-center">
              <span>
                Method: <strong>{receipt.method}</strong>
              </span>
              <span>
                Ref: <strong className="font-mono">{receipt.transactionRef.slice(0, 14)}</strong>
              </span>
              <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                PAID
              </span>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 print:hidden">
              <button
                onClick={handlePrint}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Printer className="w-4 h-4" /> Print / Save PDF
              </button>
              <button
                onClick={onClose}
                className="px-5 border border-slate-300 font-bold text-slate-700 py-2.5 rounded-xl text-xs hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-red-500">Failed to load receipt details.</div>
        )}
      </div>
    </div>
  );
};
