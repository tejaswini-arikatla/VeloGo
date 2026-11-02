import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Ride, AppNotification } from '../types';
import { Link } from 'react-router-dom';
import {
  Bike,
  Clock,
  Compass,
  Download,
  MapPin,
  Phone,
  Shield,
  Star,
  User as UserIcon,
  Bell,
  CheckCircle2,
} from 'lucide-react';
import { ReceiptModal } from '../components/ReceiptModal';
import { RatingDialog } from '../components/RatingDialog';

export const CustomerDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);

  const [selectedReceiptRideId, setSelectedReceiptRideId] = useState<string | null>(null);
  const [selectedRatingRide, setSelectedRatingRide] = useState<{ id: string; captainName: string } | null>(null);

  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [savedEmergency, setSavedEmergency] = useState(false);

  const loadData = async () => {
    try {
      const [r, notifs, act, prof] = await Promise.all([
        api.customer.getHistory(),
        api.customer.getNotifications(),
        api.customer.getActiveRide(),
        api.customer.getProfile().catch(() => null),
      ]);
      setRides(r);
      setNotifications(notifs);
      setActiveRide(act);
      if (prof) {
        if (prof.emergencyContactName) setEmergencyName(prof.emergencyContactName);
        if (prof.emergencyContactPhone) setEmergencyPhone(prof.emergencyContactPhone);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.customer.updateProfile({
        emergencyContactName: emergencyName.trim(),
        emergencyContactPhone: emergencyPhone.trim(),
      });
      setSavedEmergency(true);
      setTimeout(() => setSavedEmergency(false), 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to save emergency contact');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Customer Profile Banner */}
      <div className="bg-gradient-to-r from-navy-900 via-navy-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={
              user?.avatarUrl ||
              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
            }
            alt={user?.fullName}
            className="w-16 h-16 rounded-2xl object-cover ring-2 ring-brand-400"
          />
          <div>
            <h1 className="text-2xl font-black text-white">{user?.fullName}</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {user?.email} &bull; {user?.phone}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-bold text-brand-400 bg-brand-500/10 border border-brand-500/30 px-2.5 py-0.5 rounded-full">
                Active Passenger
              </span>
            </div>
          </div>
        </div>

        <Link
          to="/book"
          className="bg-brand-500 hover:bg-brand-600 text-slate-950 font-black px-6 py-3 rounded-2xl shadow-glow text-sm flex items-center gap-2 transition-transform hover:scale-105"
        >
          <Compass className="w-4 h-4" /> Book a New Ride
        </Link>
      </div>

      {/* Active ride alert if one exists */}
      {activeRide && (
        <div className="bg-amber-500 text-slate-950 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-950 text-brand-400 flex items-center justify-center font-bold">
              <Bike className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                You have an active ride ({activeRide.status})
              </p>
              <p className="text-sm font-black">
                {activeRide.pickupAddress} &rarr; {activeRide.destAddress}
              </p>
            </div>
          </div>
          <Link
            to="/book"
            className="bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-colors"
          >
            Track Ride Live &rarr;
          </Link>
        </div>
      )}

      {/* Main Grid: Ride History & Emergency Safety */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Ride History */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Your Ride History</h2>
              <p className="text-xs text-slate-500">Track past trips, payments, and receipts</p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {rides.length} Total Rides
            </span>
          </div>

          {rides.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Clock className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-sm">No rides booked yet.</p>
              <p className="text-xs mt-1">Book your first bike taxi to enjoy lightning-fast city travel!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rides.map((r) => (
                <div
                  key={r.id}
                  className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-500">
                        #{r.id.slice(0, 8)}
                      </span>
                      <span className="text-xs font-black uppercase bg-brand-100 text-brand-900 px-2 py-0.5 rounded">
                        {r.vehicleCategory}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full uppercase ${
                        r.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.status === 'CANCELLED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>

                  <div className="text-xs space-y-1">
                    <p className="text-slate-800">
                      <strong>Pickup:</strong> {r.pickupAddress}
                    </p>
                    <p className="text-slate-800">
                      <strong>Drop:</strong> {r.destAddress}
                    </p>
                    <p className="text-slate-500 text-[11px] pt-1">
                      {r.distanceKm} km &bull; ~{r.durationMinutes} mins &bull; {r.createdAt}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-200/60">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">
                        Total Fare
                      </span>
                      <p className="text-base font-black text-slate-900">
                        ₹{(r.finalFare || r.estimatedFare).toFixed(2)}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {r.status === 'COMPLETED' && (
                        <>
                          <button
                            onClick={() => setSelectedReceiptRideId(r.id)}
                            className="px-3 py-1.5 border border-slate-300 hover:bg-white text-slate-700 font-bold text-xs rounded-lg flex items-center gap-1 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" /> Receipt
                          </button>
                          <button
                            onClick={() =>
                              setSelectedRatingRide({
                                id: r.id,
                                captainName: r.captainName || 'Captain',
                              })
                            }
                            className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1 shadow-sm transition-colors"
                          >
                            <Star className="w-3.5 h-3.5 fill-slate-950" /> Rate
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar: Emergency Contacts & Notifications */}
        <div className="lg:col-span-4 space-y-6">
          {/* Emergency Safety Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-red-600">
              <Shield className="w-5 h-5" />
              <h3 className="font-extrabold text-base text-slate-900">Safety & SOS Contact</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Configure an emergency contact who will receive automated trip sharing details and safety alerts during late-night rides.
            </p>

            <form onSubmit={handleSaveEmergency} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Contact Name</label>
                <input
                  type="text"
                  placeholder="e.g. Parent / Spouse Name"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
              >
                {savedEmergency ? 'Saved Successfully!' : 'Save Emergency Contact'}
              </button>
            </form>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-brand-600" />
              <h3 className="font-extrabold text-base text-slate-900">Notifications</h3>
            </div>

            <div className="space-y-2.5 text-xs">
              {notifications.length === 0 ? (
                <p className="text-slate-400 py-3 text-center">No new notifications.</p>
              ) : (
                notifications.slice(0, 4).map((n) => (
                  <div key={n.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="font-bold text-slate-900">{n.title}</p>
                    <p className="text-slate-600 text-[11px] mt-0.5">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedReceiptRideId && (
        <ReceiptModal
          rideId={selectedReceiptRideId}
          onClose={() => setSelectedReceiptRideId(null)}
        />
      )}

      {selectedRatingRide && (
        <RatingDialog
          rideId={selectedRatingRide.id}
          captainName={selectedRatingRide.captainName}
          onClose={() => setSelectedRatingRide(null)}
        />
      )}
    </div>
  );
};
