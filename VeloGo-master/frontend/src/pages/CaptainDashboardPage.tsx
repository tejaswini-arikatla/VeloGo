import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { api } from '../services/api';
import { CaptainSummary, Ride, VehicleCategory } from '../types';
import {
  Bike,
  Car,
  CheckCircle2,
  Clock,
  Compass,
  DollarSign,
  Key,
  MapPin,
  Navigation,
  Power,
  Shield,
  ShieldCheck,
  Star,
  XCircle,
  AlertTriangle,
  Info,
  Phone,
  RotateCcw,
  RefreshCw,
  FileText,
  Calendar,
  CreditCard,
  Banknote,
  Send,
  LifeBuoy,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { MapViewer } from '../components/MapViewer';
import { ErrorBoundary } from '../components/ErrorBoundary';

const LOCATION_HUBS = [
  { name: 'MG Road (Central)', lat: 12.9716, lng: 77.5946 },
  { name: 'Koramangala 5th Blk', lat: 12.9352, lng: 77.6245 },
  { name: 'Indiranagar 100ft', lat: 12.9785, lng: 77.6408 },
  { name: 'Majestic Station', lat: 12.9784, lng: 77.5726 },
  { name: 'Whitefield ITPL', lat: 12.9866, lng: 77.7381 },
  { name: 'Electronic City', lat: 12.8452, lng: 77.6602 },
];

export const CaptainDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { subscribeToCaptainDispatch, subscribeToRide } = useSocket();

  const [activeTab, setActiveTab] = useState<'live' | 'history' | 'vehicle' | 'earnings'>('live');

  const [profile, setProfile] = useState<CaptainSummary | null>(user?.captainProfile || null);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [history, setHistory] = useState<Ride[]>([]);

  // Current GPS Position state
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: user?.captainProfile?.currentLatitude || 12.9716,
    lng: user?.captainProfile?.currentLongitude || 77.5946,
  });
  const [locationName, setLocationName] = useState('MG Road Hub, Bengaluru');
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);

  // Incoming dispatch offer with countdown
  const [incomingDispatch, setIncomingDispatch] = useState<any | null>(null);
  const [countdown, setCountdown] = useState(45);

  // OTP dialog
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);

  // Cancel dialog
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('Passenger unreachable / no-show');
  const [isCancelling, setIsCancelling] = useState(false);

  // Women-Only application modal
  const [showWomenOnlyModal, setShowWomenOnlyModal] = useState(false);
  const [womenOnlyAcknowledged, setWomenOnlyAcknowledged] = useState(false);
  const [isApplyingWomenOnly, setIsApplyingWomenOnly] = useState(false);
  const [womenOnlyFeedback, setWomenOnlyFeedback] = useState<string | null>(null);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSimulatingLoc, setIsSimulatingLoc] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load initial data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [p, active, h] = await Promise.all([
        api.captain.getProfile().catch(() => null),
        api.captain.getActiveRide().catch(() => null),
        api.captain.getHistory().catch(() => []),
      ]);

      if (p) {
        setProfile(p);
        if (p.currentLatitude && p.currentLongitude) {
          setCurrentCoords({
            lat: Number(p.currentLatitude),
            lng: Number(p.currentLongitude),
          });
        }
      }
      setActiveRide(active);
      setHistory(h || []);
    } catch (e) {
      console.error('Failed to load captain dashboard data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Listen for incoming dispatches via WebSocket
  useEffect(() => {
    if (!profile?.captainId) return;

    const unsub = subscribeToCaptainDispatch(profile.captainId, (dispatch) => {
      setIncomingDispatch(dispatch);
      setCountdown(dispatch.countdownSeconds || 45);
    });

    return () => unsub();
  }, [profile?.captainId]);

  // Countdown timer for incoming dispatch
  useEffect(() => {
    if (!incomingDispatch) return;

    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          setIncomingDispatch(null);
          clearInterval(interval);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [incomingDispatch]);

  // Listen to active ride updates
  useEffect(() => {
    if (!activeRide) return;

    const unsub = subscribeToRide(activeRide.id, (updated) => {
      setActiveRide(updated);
      if (updated.status === 'COMPLETED' || updated.status === 'CANCELLED') {
        loadData();
      }
    });

    return () => unsub();
  }, [activeRide?.id]);

  // Sync location with backend
  const updateCaptainLocation = async (lat: number, lng: number, name?: string) => {
    setIsUpdatingLocation(true);
    try {
      await api.captain.updateLocation(lat, lng, 0);
      setCurrentCoords({ lat, lng });
      if (name) {
        setLocationName(name);
      } else {
        try {
          const rev = await api.geo.reverse(lat, lng);
          setLocationName(rev.displayName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        } catch {
          setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
      }
      setProfile((prev) => (prev ? { ...prev, currentLatitude: lat, currentLongitude: lng } : null));
    } catch (err: any) {
      console.warn('Location update failed:', err);
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  // Detect GPS from browser
  const handleDetectBrowserLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsUpdatingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        updateCaptainLocation(latitude, longitude, 'Live Browser GPS Position');
      },
      (err) => {
        console.warn('Geolocation failed:', err);
        alert('Could not retrieve browser GPS position. Please select a preset location hub.');
        setIsUpdatingLocation(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Toggle online / offline status
  const handleToggleOnline = async () => {
    if (!profile) return;
    setIsUpdatingStatus(true);
    try {
      const nextOnline = !profile.online;

      // When switching online, ensure we send location
      if (nextOnline) {
        await api.captain.updateLocation(currentCoords.lat, currentCoords.lng, 0).catch(() => {});
      }

      const updated = await api.captain.toggleAvailability(nextOnline);
      setProfile(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to update online status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Accept incoming dispatch
  const handleAcceptDispatch = async () => {
    if (!incomingDispatch) return;

    // Handle simulated demo ride
    if (incomingDispatch.rideId === 'ride-demo-test') {
      setActiveRide({
        id: 'ride-demo-' + Date.now(),
        customerId: 'demo-cust-1',
        customerName: incomingDispatch.customerName || 'Priya Sharma (Demo Rider)',
        customerPhone: '+91 98765 43210',
        pickupAddress: incomingDispatch.pickupAddress,
        pickupLat: incomingDispatch.pickupLat || currentCoords.lat,
        pickupLng: incomingDispatch.pickupLng || currentCoords.lng,
        destAddress: incomingDispatch.destAddress,
        destLat: incomingDispatch.destLat || 12.9352,
        destLng: incomingDispatch.destLng || 77.6245,
        distanceKm: incomingDispatch.distanceKm || 5.2,
        durationMinutes: incomingDispatch.durationMinutes || 16,
        estimatedFare: incomingDispatch.estimatedFare || 85.0,
        finalFare: incomingDispatch.estimatedFare || 85.0,
        discountAmount: 0,
        taxAmount: 4.5,
        vehicleCategory: (profile?.vehicle?.category as VehicleCategory) || 'BIKE',
        status: 'ACCEPTED',
        otpCode: '1234',
        paymentMethod: 'RAZORPAY',
        paymentStatus: 'PENDING',
        createdAt: new Date().toISOString(),
      });
      setIncomingDispatch(null);
      return;
    }

    try {
      const ride = await api.captain.acceptRide(incomingDispatch.rideId);
      setActiveRide(ride);
      setIncomingDispatch(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Ride was taken or expired');
      setIncomingDispatch(null);
    }
  };

  // Reject incoming dispatch
  const handleRejectDispatch = () => {
    setIncomingDispatch(null);
  };

  // Captain marks arrival at pickup
  const handleArrive = async () => {
    if (!activeRide) return;

    if (activeRide.id.startsWith('ride-demo-')) {
      setActiveRide((prev) => (prev ? { ...prev, status: 'ARRIVED' } : null));
      return;
    }

    try {
      const updated = await api.captain.arriveAtPickup(activeRide.id);
      setActiveRide(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to update arrival');
    }
  };

  // Start trip with OTP
  const handleStartTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRide) return;
    setOtpError(null);

    if (activeRide.id.startsWith('ride-demo-')) {
      if (otpInput.trim() === activeRide.otpCode || otpInput.trim() === '1234') {
        setActiveRide((prev) => (prev ? { ...prev, status: 'IN_PROGRESS' } : null));
        setShowOtpDialog(false);
        setOtpInput('');
      } else {
        setOtpError('Invalid demo OTP. Please enter 1234');
      }
      return;
    }

    try {
      const updated = await api.captain.startTrip(activeRide.id, otpInput.trim());
      setActiveRide(updated);
      setShowOtpDialog(false);
      setOtpInput('');
    } catch (err: any) {
      setOtpError(err.message || 'Invalid OTP code');
    }
  };

  // Complete trip
  const handleComplete = async () => {
    if (!activeRide) return;

    if (activeRide.id.startsWith('ride-demo-')) {
      const completedRide: Ride = {
        ...activeRide,
        status: 'COMPLETED',
        paymentStatus: 'SUCCESS',
      };
      setHistory((prev) => [completedRide, ...prev]);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              totalRides: (prev.totalRides || 0) + 1,
              totalEarnings: Number(prev.totalEarnings || 0) + Number(activeRide.estimatedFare || 85),
            }
          : null
      );
      setActiveRide(null);
      alert('Demo trip completed successfully! Earnings have been credited to your profile.');
      return;
    }

    try {
      const updated = await api.captain.completeTrip(activeRide.id);
      setActiveRide(updated);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to complete trip');
    }
  };

  // Captain cancels trip
  const handleCancelTrip = async () => {
    if (!activeRide) return;
    setIsCancelling(true);

    if (activeRide.id.startsWith('ride-demo-')) {
      setActiveRide(null);
      setShowCancelDialog(false);
      setIsCancelling(false);
      return;
    }

    try {
      await api.rides.cancel(activeRide.id, cancelReason);
      setActiveRide(null);
      setShowCancelDialog(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel ride');
    } finally {
      setIsCancelling(false);
    }
  };

  // GPS Simulation: Moves captain smoothly towards destination
  const handleSimulateGPS = async () => {
    if (!activeRide || isSimulatingLoc) return;
    setIsSimulatingLoc(true);

    const startLat = activeRide.pickupLat;
    const startLng = activeRide.pickupLng;
    const endLat = activeRide.destLat;
    const endLng = activeRide.destLng;

    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      const curLat = startLat + ((endLat - startLat) * i) / steps;
      const curLng = startLng + ((endLng - startLng) * i) / steps;

      if (!activeRide.id.startsWith('ride-demo-')) {
        await api.captain.updateLocation(curLat, curLng, 45).catch(() => {});
      }
      setCurrentCoords({ lat: curLat, lng: curLng });
      await new Promise((r) => setTimeout(r, 900));
    }

    setIsSimulatingLoc(false);
  };

  // Trigger Demo Ride Dispatch
  const handleTriggerDemoDispatch = () => {
    setIncomingDispatch({
      id: 'dispatch-demo-' + Date.now(),
      rideId: 'ride-demo-test',
      category: profile?.vehicle?.category || 'BIKE',
      pickupAddress: `${locationName} (Pickup)`,
      pickupLat: currentCoords.lat,
      pickupLng: currentCoords.lng,
      destAddress: 'Koramangala 5th Block, Bengaluru',
      destLat: 12.9352,
      destLng: 77.6245,
      distanceKm: 5.2,
      durationMinutes: 16,
      estimatedFare: 85.0,
      countdownSeconds: 45,
      customerName: 'Priya Sharma (Demo Rider)',
      customerRating: 4.95,
      isForSomeoneElse: false,
    });
    setCountdown(45);
  };

  // Handle Women-Only program application
  const handleApplyWomenOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!womenOnlyAcknowledged) {
      alert('Please confirm the demo self-declaration checkbox.');
      return;
    }

    setIsApplyingWomenOnly(true);
    setWomenOnlyFeedback(null);
    try {
      const updated = await api.captain.applyWomenOnly(true);
      setProfile(updated);
      setShowWomenOnlyModal(false);
      setWomenOnlyFeedback('Application submitted successfully! Your application is pending admin approval.');
    } catch (err: any) {
      alert(err.message || 'Application failed');
    } finally {
      setIsApplyingWomenOnly(false);
    }
  };

  const isBikeCaptain =
    profile?.vehicle?.category === 'BIKE' || profile?.vehicle?.category === 'WOMEN_BIKE';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header bar */}
      <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 text-slate-950 flex items-center justify-center font-black shadow-glow flex-shrink-0">
            {profile?.vehicle?.category === 'BIKE' || profile?.vehicle?.category === 'WOMEN_BIKE' ? (
              <Bike className="w-9 h-9" />
            ) : (
              <Car className="w-9 h-9" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-black text-white tracking-tight">{user?.fullName}</h2>
              <span
                className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                  profile?.verificationStatus === 'APPROVED'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                }`}
              >
                {profile?.verificationStatus || 'PENDING'}
              </span>
              {profile?.womenOnlyEligible && (
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Women-Only Fleet
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <span>{profile?.vehicle?.model || 'Hero Splendor / Honda Activa'}</span>
              <span>&bull;</span>
              <span className="font-mono font-bold text-slate-300">
                {profile?.vehicle?.registrationNumber || 'KA-01-EQ-1234'}
              </span>
              <span>({profile?.vehicle?.category || 'BIKE'})</span>
            </p>
          </div>
        </div>

        {/* Online / Offline switch */}
        <div className="flex flex-col sm:items-end gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            disabled={isUpdatingStatus || profile?.verificationStatus !== 'APPROVED'}
            onClick={handleToggleOnline}
            className={`flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl font-black text-sm transition-all shadow-lg w-full sm:w-auto ${
              profile?.online
                ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-emerald-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Power className="w-5 h-5 stroke-[3]" />
            <span>{profile?.online ? 'YOU ARE ONLINE' : 'GO ONLINE'}</span>
          </button>
          <span className="text-[10px] text-slate-400 text-center sm:text-right font-medium">
            {profile?.online ? '🟢 Available for ride dispatches' : '⚪ Offline & not visible to passengers'}
          </span>
        </div>
      </div>

      {/* Account Verification notice if PENDING */}
      {profile?.verificationStatus === 'PENDING' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 text-xs">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <span>
              <strong>Account Verification Pending:</strong> Your driving license and vehicle documents are currently undergoing review. Once approved by an admin, you can go online.
            </span>
          </div>
          <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-300 whitespace-nowrap">
            Sign in as admin@velogo.com to approve
          </span>
        </div>
      )}

      {womenOnlyFeedback && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-center gap-3 text-purple-900 text-xs font-semibold">
          <ShieldCheck className="w-5 h-5 text-purple-600 flex-shrink-0" />
          <span>{womenOnlyFeedback}</span>
        </div>
      )}

      {/* Navigation Tab Pills */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('live')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'live'
              ? 'bg-brand-500 text-slate-950 shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <Navigation className="w-4 h-4" />
          <span>Live Console & Radar</span>
          {activeRide && (
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping ml-1" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-brand-500 text-slate-950 shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Trip History ({history.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('vehicle')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'vehicle'
              ? 'bg-brand-500 text-slate-950 shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Vehicle & Documents</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('earnings')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'earnings'
              ? 'bg-brand-500 text-slate-950 shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Earnings & Analytics</span>
        </button>
      </div>

      {/* Stats Cards Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <p className="text-[11px] font-bold text-slate-400 uppercase">Total Earnings</p>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            ₹{Number(profile?.totalEarnings || 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <p className="text-[11px] font-bold text-slate-400 uppercase">Completed Rides</p>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {profile?.totalRides || 0}
          </p>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <p className="text-[11px] font-bold text-slate-400 uppercase">Captain Rating</p>
          <p className="text-xl sm:text-2xl font-black text-amber-600 mt-1 flex items-center justify-center gap-1">
            <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
            {Number(profile?.ratingAvg || 5.0).toFixed(1)}
          </p>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <p className="text-[11px] font-bold text-slate-400 uppercase">Acceptance Rate</p>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-1 flex items-center justify-center gap-1">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            98.5%
          </p>
        </div>
      </div>

      {/* TAB 1: LIVE TRIP & RADAR CONSOLE */}
      {activeTab === 'live' && (
        <div className="space-y-6">
          {/* Active Trip Execution Console */}
          {activeRide ? (
            <div
              className={`bg-white rounded-3xl p-6 sm:p-8 shadow-xl border-2 space-y-6 ${
                activeRide.vehicleCategory === 'WOMEN_BIKE'
                  ? 'border-purple-500'
                  : 'border-brand-500'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        activeRide.vehicleCategory === 'WOMEN_BIKE'
                          ? 'bg-purple-600 text-white'
                          : 'bg-brand-500 text-slate-950'
                      }`}
                    >
                      {activeRide.vehicleCategory === 'WOMEN_BIKE'
                        ? 'WOMEN-ONLY BIKE TRIP'
                        : 'ACTIVE TRIP IN PROGRESS'}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      Status: {activeRide.status}
                    </span>
                    {activeRide.isForSomeoneElse && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                        Booked for Relative
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900 mt-2">
                    {activeRide.isForSomeoneElse
                      ? `Traveler: ${activeRide.travelerName || 'Passenger'} (${activeRide.travelerRelationship || 'Relative'})`
                      : `Passenger: ${activeRide.customerName}`}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                    <span>
                      Phone: {activeRide.isForSomeoneElse && activeRide.travelerPhone ? activeRide.travelerPhone : activeRide.customerPhone}
                    </span>
                    <a
                      href={`tel:${activeRide.isForSomeoneElse && activeRide.travelerPhone ? activeRide.travelerPhone : activeRide.customerPhone}`}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold text-[11px] flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3 text-emerald-600" /> Call Passenger
                    </a>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-xs font-bold text-slate-400 uppercase">Fare Amount</span>
                  <p className="text-2xl font-black text-slate-900">
                    ₹{Number(activeRide.finalFare || activeRide.estimatedFare || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Active Trip Route Map */}
              <div className="rounded-2xl overflow-hidden border border-slate-200 h-[280px] sm:h-[340px] shadow-inner relative">
                <ErrorBoundary fallbackTitle="Map Route Unavailable">
                  <MapViewer
                    pickup={{
                      lat: activeRide.pickupLat,
                      lng: activeRide.pickupLng,
                      address: activeRide.pickupAddress,
                    }}
                    destination={{
                      lat: activeRide.destLat,
                      lng: activeRide.destLng,
                      address: activeRide.destAddress,
                    }}
                    captainLocation={{
                      lat: currentCoords.lat,
                      lng: currentCoords.lng,
                    }}
                    routeDistanceKm={activeRide.distanceKm}
                    routeDurationMins={activeRide.durationMinutes}
                    interactiveSelectionPopup={false}
                    showPinControls={false}
                    className="h-full w-full"
                  />
                </ErrorBoundary>
              </div>

              {/* Route Info */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[9px] block">
                    Pickup Location
                  </span>
                  <span className="font-semibold text-slate-800">{activeRide.pickupAddress}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[9px] block">
                    Destination Location
                  </span>
                  <span className="font-semibold text-slate-800">{activeRide.destAddress}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 text-slate-500 text-[11px]">
                  <span>Total Distance: {activeRide.distanceKm} km</span>
                  <span>Trip Duration: ~{activeRide.durationMinutes} mins</span>
                </div>
              </div>

              {/* Action buttons matching lifecycle */}
              <div className="space-y-3">
                {activeRide.status === 'ACCEPTED' && (
                  <button
                    type="button"
                    onClick={handleArrive}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-4 rounded-2xl text-base shadow-lg transition-all"
                  >
                    I Have Arrived at Pickup Location
                  </button>
                )}

                {activeRide.status === 'ARRIVED' && (
                  <button
                    type="button"
                    onClick={() => setShowOtpDialog(true)}
                    className="w-full bg-brand-500 hover:bg-brand-600 text-slate-950 font-black py-4 rounded-2xl text-base shadow-glow flex items-center justify-center gap-2 transition-all"
                  >
                    <Key className="w-5 h-5 stroke-[2.5]" />
                    Verify Customer OTP & Start Trip
                  </button>
                )}

                {activeRide.status === 'IN_PROGRESS' && (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleSimulateGPS}
                      disabled={isSimulatingLoc}
                      className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
                    >
                      <Navigation className={`w-4 h-4 ${isSimulatingLoc ? 'animate-spin' : ''}`} />
                      {isSimulatingLoc
                        ? 'Broadcasting live simulated GPS coordinates to customer...'
                        : 'Simulate GPS Navigation Movement Along Route'}
                    </button>
                    <button
                      type="button"
                      onClick={handleComplete}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl text-base shadow-lg transition-all"
                    >
                      Complete Trip at Destination
                    </button>
                  </div>
                )}

                {/* Cancel Ride Option (Allowed before start) */}
                {(activeRide.status === 'ACCEPTED' || activeRide.status === 'ARRIVED') && (
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => setShowCancelDialog(true)}
                      className="text-xs text-red-600 hover:text-red-700 font-bold hover:underline"
                    >
                      Cancel Trip (Passenger No-Show / Emergency)
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Standby State: Interactive Radar & Quick Hub Dispatcher */
            <div className="space-y-6">
              {/* Standby Status Banner */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${profile?.online ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      <Navigation className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900">
                        {profile?.online ? 'Radar Active & Waiting for Nearby Ride Dispatches' : 'Captain is Currently Offline'}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {profile?.online
                          ? 'Your vehicle is broadcasting live position. Ride dispatch offers will appear with a 45-second timer.'
                          : 'Turn your status to "GO ONLINE" above to begin receiving passenger trips.'}
                      </p>
                    </div>
                  </div>

                  {/* 1-Click Demo Dispatch Tester */}
                  <button
                    type="button"
                    onClick={handleTriggerDemoDispatch}
                    className="bg-brand-50 hover:bg-brand-100 border border-brand-300 text-brand-900 font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 whitespace-nowrap self-stretch sm:self-auto justify-center"
                  >
                    <span>🧪</span>
                    <span>Test: Simulate Ride Offer</span>
                  </button>
                </div>

                {/* Standby Location Selector & Presets */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-brand-600 flex-shrink-0" />
                      <span className="text-xs font-bold text-slate-800">
                        Current Stationed Position:{' '}
                        <span className="text-slate-600 font-medium">{locationName}</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleDetectBrowserLocation}
                      disabled={isUpdatingLocation}
                      className="text-xs font-bold bg-white hover:bg-slate-100 text-brand-700 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1 transition-all shadow-xs"
                    >
                      {isUpdatingLocation ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Compass className="w-3.5 h-3.5" />
                      )}
                      <span>Detect My Browser GPS</span>
                    </button>
                  </div>

                  {/* Quick Hub Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
                    <span className="text-slate-400 font-bold text-[10px] uppercase whitespace-nowrap">
                      Quick Hubs:
                    </span>
                    {LOCATION_HUBS.map((hub) => (
                      <button
                        type="button"
                        key={hub.name}
                        onClick={() => updateCaptainLocation(hub.lat, hub.lng, hub.name)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors whitespace-nowrap ${
                          Math.abs(currentCoords.lat - hub.lat) < 0.005 &&
                          Math.abs(currentCoords.lng - hub.lng) < 0.005
                            ? 'bg-brand-500 text-slate-950 border-brand-600 shadow-xs'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        📍 {hub.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Standby Map Preview */}
                <div className="rounded-2xl overflow-hidden border border-slate-200 h-[300px] shadow-inner relative">
                  <ErrorBoundary fallbackTitle="Map Display Unavailable">
                    <MapViewer
                      pickup={{
                        lat: currentCoords.lat,
                        lng: currentCoords.lng,
                        address: locationName,
                      }}
                      interactiveSelectionPopup={false}
                      showPinControls={false}
                      className="h-full w-full"
                    />
                  </ErrorBoundary>
                  <div className="absolute top-3 right-3 z-[400] bg-slate-900/90 backdrop-blur text-white text-[10px] font-bold px-3 py-1.5 rounded-xl border border-slate-700 shadow-lg">
                    📡 ~5 km Radius Radar Active
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TRIP HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Completed Trips</h3>
              <p className="text-xs text-slate-500">Your recent rides, earnings, and passenger details</p>
            </div>
            <button
              type="button"
              onClick={loadData}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 bg-slate-100 px-3 py-2 rounded-xl transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh List
            </button>
          </div>

          {history.length > 0 ? (
            <div className="space-y-3">
              {history.map((ride) => (
                <div
                  key={ride.id}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all bg-slate-50/50 hover:bg-white hover:shadow-md space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/70">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        #{ride.id.slice(0, 8)}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          ride.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {ride.status}
                      </span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        {ride.vehicleCategory}
                      </span>
                      {ride.isForSomeoneElse && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          Relative Booking
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-base font-black text-slate-900">
                        ₹{Number(ride.finalFare || ride.estimatedFare || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Passenger</p>
                      <p className="font-semibold text-slate-800">
                        {ride.isForSomeoneElse && ride.travelerName
                          ? `${ride.travelerName} (${ride.travelerRelationship || 'Traveler'})`
                          : ride.customerName}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Date & Distance</p>
                      <p className="text-slate-600">
                        {ride.createdAt ? new Date(ride.createdAt).toLocaleString() : 'Recent Trip'}{' '}
                        &bull; {ride.distanceKm} km
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1 bg-white p-3 rounded-xl border border-slate-200/60">
                    <p className="truncate">
                      🟢 <strong>Pickup:</strong> {ride.pickupAddress}
                    </p>
                    <p className="truncate">
                      🔴 <strong>Drop:</strong> {ride.destAddress}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Clock className="w-7 h-7" />
              </div>
              <h4 className="font-black text-base text-slate-900">No Trips Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Turn your status to "GO ONLINE" or use the simulated dispatch offer in the Live Console to complete your first trip!
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: VEHICLE & DOCUMENTS */}
      {activeTab === 'vehicle' && (
        <div className="space-y-6">
          {/* Vehicle Information */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Registered Vehicle</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Vehicle Model</span>
                <p className="text-base font-black text-slate-900">
                  {profile?.vehicle?.model || 'Honda Activa 6G'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Registration Plate</span>
                <p className="text-base font-mono font-black text-slate-900">
                  {profile?.vehicle?.registrationNumber || 'KA-01-EQ-1234'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Category</span>
                <p className="text-sm font-bold text-slate-800">
                  {profile?.vehicle?.category || 'BIKE'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Color</span>
                <p className="text-sm font-bold text-slate-800">
                  {profile?.vehicle?.color || 'Yellow'}
                </p>
              </div>
            </div>

            {/* Document Verification Checklist */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase">Verification Credentials</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50/50">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-slate-800">Commercial Driving License</span>
                  </div>
                  <span className="text-[10px] font-extrabold text-emerald-700 uppercase">Verified</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50/50">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-slate-800">Vehicle Registration Certificate (RC)</span>
                  </div>
                  <span className="text-[10px] font-extrabold text-emerald-700 uppercase">Verified</span>
                </div>
              </div>
            </div>
          </div>

          {/* Women-Only Bike Program Enrollment Card (for Bike Captains) */}
          {isBikeCaptain && (
            <div className="bg-purple-50/60 rounded-3xl p-6 sm:p-8 border border-purple-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700 flex-shrink-0">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-purple-950">
                        Women-Only Bike Service Program
                      </h3>
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                          profile?.womenOnlyStatus === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : profile?.womenOnlyStatus === 'APPLIED'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : profile?.womenOnlyStatus === 'REJECTED'
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {profile?.womenOnlyStatus === 'APPROVED'
                          ? 'Approved & Eligible'
                          : profile?.womenOnlyStatus === 'APPLIED'
                          ? 'Application Under Review'
                          : profile?.womenOnlyStatus === 'REJECTED'
                          ? 'Application Rejected'
                          : 'Not Enrolled'}
                      </span>
                    </div>
                    <p className="text-xs text-purple-800/80 mt-0.5">
                      Dedicated safe trips reserved exclusively for women passengers with certified female captains.
                    </p>
                  </div>
                </div>

                {/* Application action button */}
                {(!profile?.womenOnlyStatus ||
                  profile?.womenOnlyStatus === 'NOT_APPLIED' ||
                  profile?.womenOnlyStatus === 'REJECTED') && (
                  <button
                    type="button"
                    onClick={() => setShowWomenOnlyModal(true)}
                    className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-sm whitespace-nowrap self-stretch sm:self-auto text-center"
                  >
                    Apply for Women-Only Program
                  </button>
                )}

                {profile?.womenOnlyStatus === 'APPLIED' && (
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200 whitespace-nowrap">
                    ⏳ Application Under Review
                  </span>
                )}

                {profile?.womenOnlyStatus === 'APPROVED' && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 flex items-center gap-1 whitespace-nowrap">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Dispatches Enabled
                  </span>
                )}
              </div>

              <div className="p-3.5 bg-white/70 rounded-xl border border-purple-100 text-[11px] text-purple-900 space-y-1">
                <p className="font-semibold flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                  <span>
                    <strong>Demo Self-Declaration:</strong> In accordance with project specs, Women-Only certification is granted upon administrator verification of demographic self-declarations.
                  </span>
                </p>
                {profile?.womenOnlyRejectionReason && (
                  <p className="text-red-700 font-semibold pt-1">
                    Rejection Note: {profile.womenOnlyRejectionReason}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: EARNINGS & SAFETY */}
      {activeTab === 'earnings' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Earnings & Payouts</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Gross Trip Earnings</span>
                <p className="text-2xl font-black text-slate-900">
                  ₹{Number(profile?.totalEarnings || 0).toFixed(2)}
                </p>
                <p className="text-[11px] text-slate-500">Credited automatically after trip completion</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Average Per Trip</span>
                <p className="text-2xl font-black text-emerald-600">
                  ₹
                  {profile?.totalRides && profile.totalRides > 0
                    ? (Number(profile.totalEarnings) / profile.totalRides).toFixed(2)
                    : '0.00'}
                </p>
                <p className="text-[11px] text-slate-500">Based on {profile?.totalRides || 0} completed rides</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Payout Schedule</span>
                <p className="text-2xl font-black text-slate-900">Daily</p>
                <p className="text-[11px] text-slate-500">Direct UPI / Bank account transfer</p>
              </div>
            </div>

            {/* Captain Safety Toolkit */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase">Captain Safety & Support Toolkit</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl border border-red-200 bg-red-50/40 flex items-center justify-between">
                  <div>
                    <p className="font-extrabold text-sm text-red-950">Emergency 24x7 SOS</p>
                    <p className="text-[11px] text-red-800">Direct link to police and safety hotline</p>
                  </div>
                  <a
                    href="tel:112"
                    className="bg-red-600 hover:bg-red-700 text-white font-black text-xs px-4 py-2 rounded-xl transition-all shadow-sm"
                  >
                    Dial 112
                  </a>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div>
                    <p className="font-extrabold text-sm text-slate-900">Support & Dispute Center</p>
                    <p className="text-[11px] text-slate-500">File a ticket for fare or customer issues</p>
                  </div>
                  <a
                    href="/safety"
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm"
                  >
                    Open Support
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Dispatch Modal (45s live countdown) */}
      {incomingDispatch && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border-4 border-brand-500 animate-fadeIn relative">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span
                className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                  incomingDispatch.category === 'WOMEN_BIKE'
                    ? 'bg-purple-600 text-white'
                    : 'bg-brand-500 text-slate-950'
                }`}
              >
                {incomingDispatch.category === 'WOMEN_BIKE'
                  ? '🛡️ WOMEN-ONLY RIDE'
                  : 'NEW RIDE DISPATCH'}
              </span>
              <div className="flex items-center gap-1.5 font-mono text-sm font-extrabold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg">
                <Clock className="w-4 h-4 animate-spin" />
                <span>{countdown}s left</span>
              </div>
            </div>

            {/* Fare & Passenger */}
            <div className="text-center my-4">
              <p className="text-3xl font-black text-slate-900">
                ₹{Number(incomingDispatch.estimatedFare || 0).toFixed(2)}
              </p>
              <p className="text-xs font-bold text-slate-600 mt-1">
                {incomingDispatch.customerName}
              </p>
              <p className="text-[11px] text-slate-400">
                {incomingDispatch.distanceKm} km &bull; ~{incomingDispatch.durationMinutes} mins
              </p>
            </div>

            {/* Route */}
            <div className="bg-slate-50 rounded-2xl p-4 my-4 space-y-2.5 text-xs border border-slate-200">
              <div>
                <span className="font-bold text-slate-400 uppercase text-[9px] block">Pickup</span>
                <span className="font-semibold text-slate-800">{incomingDispatch.pickupAddress}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 uppercase text-[9px] block">Destination</span>
                <span className="font-semibold text-slate-800">{incomingDispatch.destAddress}</span>
              </div>
            </div>

            {/* Accept / Reject Buttons */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                type="button"
                onClick={handleRejectDispatch}
                className="border-2 border-slate-300 hover:bg-slate-100 text-slate-700 font-extrabold py-3.5 rounded-xl text-sm transition-colors"
              >
                Pass / Reject
              </button>
              <button
                type="button"
                onClick={handleAcceptDispatch}
                className="bg-brand-500 hover:bg-brand-600 text-slate-950 font-black py-3.5 rounded-xl shadow-glow text-sm transition-all"
              >
                Accept Ride
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OTP verification Dialog */}
      {showOtpDialog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative animate-fadeIn">
            <h3 className="font-black text-xl text-slate-900 text-center">Verify Customer OTP</h3>
            <p className="text-xs text-slate-500 text-center mt-1">
              Ask customer for their 4-digit ride OTP (Demo default: 1234)
            </p>

            {otpError && (
              <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 text-center">
                {otpError}
              </div>
            )}

            <form onSubmit={handleStartTrip} className="mt-4 space-y-4">
              <input
                type="text"
                maxLength={6}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                placeholder="4-digit OTP"
                autoFocus
                required
                className="w-full text-center tracking-widest font-mono text-2xl font-black p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-brand-500 hover:bg-brand-600 text-slate-950 font-black py-3 rounded-xl shadow-glow text-sm"
                >
                  Verify & Start Trip
                </button>
                <button
                  type="button"
                  onClick={() => setShowOtpDialog(false)}
                  className="px-4 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Trip Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative animate-fadeIn space-y-4">
            <h3 className="font-black text-lg text-slate-900 text-center">Cancel Active Trip?</h3>
            <p className="text-xs text-slate-500 text-center">
              Please choose a cancellation reason. The passenger will be notified.
            </p>

            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
            >
              <option value="Passenger unreachable / no-show">Passenger unreachable / no-show</option>
              <option value="Wrong pickup address given">Wrong pickup address given</option>
              <option value="Vehicle breakdown / puncture">Vehicle breakdown / puncture</option>
              <option value="Heavy traffic / road blocked">Heavy traffic / road blocked</option>
              <option value="Personal medical emergency">Personal medical emergency</option>
            </select>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleCancelTrip}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-2.5 rounded-xl text-xs shadow-sm transition-all"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
              <button
                type="button"
                onClick={() => setShowCancelDialog(false)}
                className="px-4 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Women-Only Program Application Modal */}
      {showWomenOnlyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative animate-fadeIn space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-slate-900">
                Women-Only Bike Service Application
              </h3>
              <p className="text-xs text-slate-500">
                Join our certified women captain fleet to serve dedicated women commuters.
              </p>
            </div>

            <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-200 text-xs text-purple-900 space-y-2">
              <p className="font-bold">Demo Verification & Self-Declaration Terms:</p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-purple-800">
                <li>This application initiates an administrator review.</li>
                <li>Application submission does not automatically grant eligibility.</li>
                <li>
                  This is a prototype demo self-declaration workflow and does not claim to represent government ID or biological proof.
                </li>
              </ul>
            </div>

            <form onSubmit={handleApplyWomenOnly} className="space-y-4">
              <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={womenOnlyAcknowledged}
                  onChange={(e) => setWomenOnlyAcknowledged(e.target.checked)}
                  className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                />
                <span>
                  I self-declare my eligibility as a female captain with a verified two-wheeler and request administrator approval for the Women-Only Bike program.
                </span>
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isApplyingWomenOnly || !womenOnlyAcknowledged}
                  className="flex-1 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-black py-3 rounded-xl shadow-md text-sm transition-all"
                >
                  {isApplyingWomenOnly ? 'Submitting...' : 'Submit Application'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowWomenOnlyModal(false)}
                  className="px-4 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
