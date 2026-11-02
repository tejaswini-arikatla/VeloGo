import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { api } from '../services/api';
import {
  FareEstimateResponse,
  Ride,
  VehicleCategory,
  PaymentMethod,
} from '../types';
import { MapViewer } from '../components/MapViewer';
import { FareCard } from '../components/FareCard';
import { RideStatusModal } from '../components/RideStatusModal';
import { ErrorBoundary } from '../components/ErrorBoundary';
import {
  MapPin,
  Tag,
  CreditCard,
  Banknote,
  ArrowRight,
  Crosshair,
  AlertCircle,
  ShieldCheck,
  Info,
  Building2,
  Ticket,
  Crown,
  Briefcase,
  User as UserIcon,
  RefreshCw,
  Users,
  UserCheck,
} from 'lucide-react';
import { CompanyMember, UserSubscription, CorporateEligibility, BillingProfile } from '../types';

import { AddressAutocomplete } from '../components/AddressAutocomplete';

const PRESET_LOCATIONS = [
  { name: 'MG Road Metro Station', lat: 12.9756, lng: 77.6066 },
  { name: 'Koramangala 5th Block', lat: 12.9352, lng: 77.6245 },
  { name: 'Indiranagar 100ft Road', lat: 12.9785, lng: 77.6408 },
  { name: 'Majestic Bus Terminal', lat: 12.9784, lng: 77.5726 },
  { name: 'Electronic City Phase 1', lat: 12.8452, lng: 77.6602 },
  { name: 'Whitefield ITPL', lat: 12.9866, lng: 77.7381 },
  { name: 'Kempegowda Airport', lat: 13.1986, lng: 77.7066 },
];

export const CustomerBookingPage: React.FC = () => {
  const { user } = useAuth();
  const { subscribeToRide } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  // Coordinates & addresses
  const [pickup, setPickup] = useState({
    address: 'MG Road Metro Station, Bengaluru',
    lat: 12.9756,
    lng: 77.6066,
  });
  const [destination, setDestination] = useState({
    address: 'Koramangala 5th Block, Bengaluru',
    lat: 12.9352,
    lng: 77.6245,
  });

  const [selectionMode, setSelectionMode] = useState<'pickup' | 'destination' | null>(null);

  // Estimates & Category selection
  const [estimates, setEstimates] = useState<FareEstimateResponse | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<VehicleCategory>('BIKE');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('RAZORPAY');

  // Women-Only Traveler State
  const [isForSomeoneElse, setIsForSomeoneElse] = useState(false);
  const [travelerName, setTravelerName] = useState('');
  const [travelerPhone, setTravelerPhone] = useState('');
  const [travelerRelationship, setTravelerRelationship] = useState('Sister');
  const [travelerGender, setTravelerGender] = useState<'FEMALE' | 'MALE' | 'OTHER'>('FEMALE');
  const [passengerDeclarationConfirmed, setPassengerDeclarationConfirmed] = useState(true);

  // Coupon
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

  // Active ride state
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [captainLocation, setCaptainLocation] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | undefined>(undefined);

  const [isLoadingEstimate, setIsLoadingEstimate] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Corporate & Subscription Profile State
  const [billingProfile, setBillingProfile] = useState<BillingProfile>('PERSONAL');
  const [corporateReason, setCorporateReason] = useState('');
  const [corporateMember, setCorporateMember] = useState<CompanyMember | null>(null);
  const [activeSubscription, setActiveSubscription] = useState<UserSubscription | null>(null);
  const [corporateEligibility, setCorporateEligibility] = useState<CorporateEligibility | null>(null);
  const [approvalSubmittedModal, setApprovalSubmittedModal] = useState(false);

  useEffect(() => {
    if (user) {
      api.corporate.getMyProfile().then(setCorporateMember).catch(() => {});
      api.subscriptions.getPortal().then((p) => {
        if (p?.activeSubscription && p.activeSubscription.isActive) {
          setActiveSubscription(p.activeSubscription);
        }
      }).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (user && billingProfile === 'CORPORATE') {
      const est = estimates?.estimates?.find((e) => e.category === selectedCategory);
      if (est) {
        api.corporate.checkEligibility(est.totalFare).then(setCorporateEligibility).catch(() => {});
      }
    }
  }, [user, billingProfile, selectedCategory, estimates]);

  // Parse query params if redirected from landing page & auto-geocode if coordinates missing
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const pAddr = params.get('pickup');
    const dAddr = params.get('dest');
    const pLat = params.get('pLat');
    const pLng = params.get('pLng');
    const dLat = params.get('dLat');
    const dLng = params.get('dLng');
    const cat = params.get('cat') as VehicleCategory | null;

    if (pLat && pLng) {
      const parsedLat = parseFloat(pLat);
      const parsedLng = parseFloat(pLng);
      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        setPickup({
          address: pAddr || 'Pickup Point',
          lat: parsedLat,
          lng: parsedLng,
        });
      }
    } else if (pAddr) {
      setPickup((prev) => ({ ...prev, address: pAddr }));
      api.geo.search(pAddr).then((results) => {
        if (results && results.length > 0 && typeof results[0].latitude === 'number' && typeof results[0].longitude === 'number') {
          setPickup({
            address: results[0].displayName || pAddr,
            lat: results[0].latitude,
            lng: results[0].longitude,
          });
        }
      }).catch(() => {});
    }

    if (dLat && dLng) {
      const parsedLat = parseFloat(dLat);
      const parsedLng = parseFloat(dLng);
      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        setDestination({
          address: dAddr || 'Destination Point',
          lat: parsedLat,
          lng: parsedLng,
        });
      }
    } else if (dAddr) {
      setDestination((prev) => ({ ...prev, address: dAddr }));
      api.geo.search(dAddr).then((results) => {
        if (results && results.length > 0 && typeof results[0].latitude === 'number' && typeof results[0].longitude === 'number') {
          setDestination({
            address: results[0].displayName || dAddr,
            lat: results[0].latitude,
            lng: results[0].longitude,
          });
        }
      }).catch(() => {});
    }

    if (cat && ['BIKE', 'AUTO', 'CAB', 'WOMEN_BIKE'].includes(cat)) {
      setSelectedCategory(cat);
    }
  }, [location.search]);

  // Check if customer already has active ride on load
  useEffect(() => {
    if (user) {
      api.customer
        .getActiveRide()
        .then((ride) => {
          if (ride && ride.status !== 'CANCELLED') {
            setActiveRide(ride);
            if (ride.pickupLat && ride.pickupLng) {
              setPickup({
                address: ride.pickupAddress,
                lat: ride.pickupLat,
                lng: ride.pickupLng,
              });
            }
            if (ride.destLat && ride.destLng) {
              setDestination({
                address: ride.destAddress,
                lat: ride.destLat,
                lng: ride.destLng,
              });
            }
            if (ride.captainCurrentLat && ride.captainCurrentLng) {
              setCaptainLocation({
                lat: ride.captainCurrentLat,
                lng: ride.captainCurrentLng,
              });
            }
          }
        })
        .catch(() => {});
    }
  }, [user]);

  // Subscribe to real-time WebSocket ride updates
  useEffect(() => {
    if (!activeRide) return;

    const unsubscribe = subscribeToRide(
      activeRide.id,
      (updatedRide) => {
        setActiveRide(updatedRide);
        if (updatedRide.captainCurrentLat && updatedRide.captainCurrentLng) {
          setCaptainLocation({
            lat: updatedRide.captainCurrentLat,
            lng: updatedRide.captainCurrentLng,
          });
        }
      },
      (loc) => {
        if (loc.latitude && loc.longitude) {
          setCaptainLocation({ lat: loc.latitude, lng: loc.longitude });
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [activeRide?.id]);

  // Fetch Fare Estimates whenever coordinates or coupon change
  const fetchEstimates = async () => {
    if (!pickup.lat || !destination.lat) return;
    setIsLoadingEstimate(true);
    setErrorMessage(null);
    try {
      const res = await api.rides.estimate({
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        pickupAddress: pickup.address,
        destLat: destination.lat,
        destLng: destination.lng,
        destAddress: destination.address,
        couponCode: appliedCoupon || undefined,
      });
      setEstimates(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not calculate fare estimate');
    } finally {
      setIsLoadingEstimate(false);
    }
  };

  useEffect(() => {
    if (activeRide) {
      api.rides
        .estimate({
          pickupLat: activeRide.pickupLat,
          pickupLng: activeRide.pickupLng,
          pickupAddress: activeRide.pickupAddress,
          destLat: activeRide.destLat,
          destLng: activeRide.destLng,
          destAddress: activeRide.destAddress,
        })
        .then(setEstimates)
        .catch(() => {});
    } else {
      fetchEstimates();
    }
  }, [pickup.lat, pickup.lng, destination.lat, destination.lng, appliedCoupon, activeRide]);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (couponCode.trim()) {
      setAppliedCoupon(couponCode.trim().toUpperCase());
    }
  };

  // Called when user drags green pickup pin or clicks to set pickup on map
  const handleMapPickupChange = async (loc: { lat: number; lng: number; address?: string }) => {
    try {
      const rev = await api.geo.reverse(loc.lat, loc.lng);
      setPickup({
        lat: loc.lat,
        lng: loc.lng,
        address: rev.displayName || `Location (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})`,
      });
    } catch {
      setPickup({
        lat: loc.lat,
        lng: loc.lng,
        address: loc.address || `Location (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})`,
      });
    }
    setSelectionMode(null);
  };

  // Called when user drags red destination pin or clicks to set destination on map
  const handleMapDestChange = async (loc: { lat: number; lng: number; address?: string }) => {
    try {
      const rev = await api.geo.reverse(loc.lat, loc.lng);
      setDestination({
        lat: loc.lat,
        lng: loc.lng,
        address: rev.displayName || `Location (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})`,
      });
    } catch {
      setDestination({
        lat: loc.lat,
        lng: loc.lng,
        address: loc.address || `Location (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})`,
      });
    }
    setSelectionMode(null);
  };

  const handleMapClick = async (lat: number, lng: number) => {
    if (selectionMode === 'pickup') {
      await handleMapPickupChange({ lat, lng });
    } else if (selectionMode === 'destination') {
      await handleMapDestChange({ lat, lng });
    }
  };

  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCurrentLocation({ lat, lng });
        await handleMapPickupChange({ lat, lng });
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation lookup failed:', err);
        setIsLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleBookRide = async () => {
    if (!user) {
      navigate('/login?redirect=/book');
      return;
    }

    // Women-Only client-side eligibility validation
    if (selectedCategory === 'WOMEN_BIKE') {
      if (!passengerDeclarationConfirmed) {
        setErrorMessage('Please confirm the demo self-declaration before requesting a Women-Only ride.');
        return;
      }

      if (isForSomeoneElse) {
        if (!travelerName.trim()) {
          setErrorMessage('Traveler full name is required when booking for someone else.');
          return;
        }
        if (!travelerPhone.trim()) {
          setErrorMessage('Traveler phone number is required when booking for someone else.');
          return;
        }
        if (travelerGender !== 'FEMALE') {
          setErrorMessage('Women-Only Bike bookings are reserved exclusively for female passengers. Designated traveler must be female.');
          return;
        }
      } else {
        if (user.gender === 'MALE') {
          setErrorMessage('Women-Only Bike bookings are reserved exclusively for women passengers. To book on behalf of a female traveler, please select "Someone Else".');
          return;
        }
      }

      // Check captain availability for Women-Only Bike
      const womenEstimate = estimates?.estimates?.find((e) => e.category === 'WOMEN_BIKE');
      if (womenEstimate && !womenEstimate.isAvailable) {
        setErrorMessage('No verified Women-Only Bike captains are currently available in your pickup area. Please retry shortly or select standard Bike, Auto, or Cab.');
        return;
      }
    }

    setIsBooking(true);
    setErrorMessage(null);
    try {
      const ride = await api.rides.book({
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        pickupAddress: pickup.address,
        destLat: destination.lat,
        destLng: destination.lng,
        destAddress: destination.address,
        vehicleCategory: selectedCategory,
        paymentMethod,
        couponCode: appliedCoupon || undefined,
        isForSomeoneElse,
        travelerName: isForSomeoneElse ? travelerName.trim() : undefined,
        travelerPhone: isForSomeoneElse ? travelerPhone.trim() : undefined,
        travelerRelationship: isForSomeoneElse ? travelerRelationship : undefined,
        travelerGender: isForSomeoneElse ? travelerGender : 'FEMALE',
        passengerDeclarationAcknowledged: passengerDeclarationConfirmed,
        billingProfile,
        corporateReason: billingProfile === 'CORPORATE' ? corporateReason.trim() : undefined,
      });

      if (ride.requiresApproval && ride.status === 'REQUESTED') {
        setApprovalSubmittedModal(true);
      }
      setActiveRide(ride);
    } catch (err: any) {
      setErrorMessage(err.message || 'Ride booking failed');
    } finally {
      setIsBooking(false);
    }
  };

  const selectedCategoryEstimate = estimates?.estimates?.find((e) => e.category === selectedCategory);
  const isSelectedCategoryUnavailable = Boolean(selectedCategory === 'WOMEN_BIKE' && selectedCategoryEstimate && !selectedCategoryEstimate.isAvailable);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Map Viewer */}
        <div className="lg:col-span-7 order-2 lg:order-1 space-y-4">
          <div className="bg-white rounded-3xl p-3 shadow-sm border border-slate-200 relative overflow-hidden h-[540px] lg:h-[650px] min-h-[480px]">
            <ErrorBoundary fallbackTitle="Map Navigation Temporarily Unavailable">
              <MapViewer
                pickup={
                  activeRide
                    ? {
                        lat: activeRide.pickupLat,
                        lng: activeRide.pickupLng,
                        address: activeRide.pickupAddress,
                      }
                    : pickup
                }
                destination={
                  activeRide
                    ? {
                        lat: activeRide.destLat,
                        lng: activeRide.destLng,
                        address: activeRide.destAddress,
                      }
                    : destination
                }
                captainLocation={captainLocation}
                currentLocation={currentLocation}
                routeGeometry={estimates?.routeGeometry}
                onPickupChange={handleMapPickupChange}
                onDestinationChange={handleMapDestChange}
                onMapClick={handleMapClick}
                selectionMode={selectionMode}
                onSelectionModeChange={setSelectionMode}
                onLocateUser={handleLocateUser}
                isLocating={isLocating}
              />
            </ErrorBoundary>

            {/* Instruction tooltip when in pinning mode */}
            {selectionMode && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/95 backdrop-blur text-white px-4 py-2 rounded-2xl shadow-xl text-xs font-bold border border-slate-700/50 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-400 animate-bounce" />
                <span>
                  Click anywhere on the map or drag pins to position your {selectionMode}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectionMode(null)}
                  className="ml-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-lg text-[10px]"
                >
                  Done
                </button>
              </div>
            )}
          </div>

          {/* Preset location chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-slate-400 font-bold flex items-center gap-1 text-[11px] whitespace-nowrap pl-1">
              Popular:
            </span>
            {PRESET_LOCATIONS.map((loc) => (
              <button
                type="button"
                key={loc.name}
                onClick={() => {
                  setDestination({
                    address: `${loc.name}, Bengaluru`,
                    lat: loc.lat,
                    lng: loc.lng,
                  });
                }}
                className="bg-white hover:bg-slate-100 text-slate-700 font-semibold px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs whitespace-nowrap text-[11px] transition-colors"
              >
                📍 {loc.name}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Booking Panel or Active Ride Tracker */}
        <div className="lg:col-span-5 order-1 lg:order-2 space-y-6">
          {activeRide ? (
            <RideStatusModal
              ride={activeRide}
              onRideCancelled={() => {
                setActiveRide(null);
                setCaptainLocation(undefined);
              }}
              onPaymentCompleted={() => {
                // Refresh active ride
                api.rides.getById(activeRide.id).then(setActiveRide);
              }}
            />
          ) : (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Book a Ride</h2>
                  <p className="text-xs text-slate-500">Fast, reliable rides at transparent rates</p>
                </div>
                {isLoadingEstimate && (
                  <RefreshCw className="w-4 h-4 text-brand-600 animate-spin" />
                )}
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Locations Input with AddressAutocomplete */}
              <div className="space-y-4">
                <AddressAutocomplete
                  label="Pickup Location"
                  placeholder="Search pickup point or use current location..."
                  value={pickup.address}
                  onAddressChange={(address) => setPickup((prev) => ({ ...prev, address }))}
                  onSelectLocation={(loc) =>
                    setPickup({ address: loc.address, lat: loc.lat, lng: loc.lng })
                  }
                  userLat={pickup.lat}
                  userLng={pickup.lng}
                  onUseCurrentLocation={handleLocateUser}
                  isLocating={isLocating}
                  markerColor="bg-emerald-500"
                  pinButton={
                    <button
                      type="button"
                      onClick={() =>
                        setSelectionMode((prev) => (prev === 'pickup' ? null : 'pickup'))
                      }
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md transition-colors flex items-center gap-1 ${
                        selectionMode === 'pickup'
                          ? 'bg-emerald-600 text-white'
                          : 'text-brand-700 hover:underline'
                      }`}
                    >
                      <Crosshair className="w-3 h-3" /> Pin on map
                    </button>
                  }
                />

                <AddressAutocomplete
                  label="Destination"
                  placeholder="Search destination..."
                  value={destination.address}
                  onAddressChange={(address) => setDestination((prev) => ({ ...prev, address }))}
                  onSelectLocation={(loc) =>
                    setDestination({ address: loc.address, lat: loc.lat, lng: loc.lng })
                  }
                  userLat={destination.lat}
                  userLng={destination.lng}
                  markerColor="bg-red-500"
                  pinButton={
                    <button
                      type="button"
                      onClick={() =>
                        setSelectionMode((prev) => (prev === 'destination' ? null : 'destination'))
                      }
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md transition-colors flex items-center gap-1 ${
                        selectionMode === 'destination'
                          ? 'bg-red-600 text-white'
                          : 'text-brand-700 hover:underline'
                      }`}
                    >
                      <Crosshair className="w-3 h-3" /> Pin on map
                    </button>
                  }
                />
              </div>

              {/* Distance & Trip Time Banner */}
              {estimates && typeof estimates.distanceKm === 'number' && (
                <div className="p-3.5 bg-brand-50/60 rounded-2xl border border-brand-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🛣️</span>
                    <div>
                      <p className="text-xs font-extrabold text-slate-900">
                        {estimates.distanceKm} km driving route
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Estimated trip duration ~{estimates.durationMinutes ?? 10} mins
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-brand-700 bg-white px-2.5 py-1 rounded-xl shadow-sm border border-brand-200">
                    Live Distance
                  </span>
                </div>
              )}

              {/* Loading skeleton for estimates */}
              {isLoadingEstimate && !estimates && (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-28"></div>
                  <div className="space-y-2">
                    <div className="h-16 bg-slate-100 rounded-2xl border border-slate-200"></div>
                    <div className="h-16 bg-slate-100 rounded-2xl border border-slate-200"></div>
                    <div className="h-16 bg-slate-100 rounded-2xl border border-slate-200"></div>
                  </div>
                </div>
              )}

              {/* Billing Profile Toggle: Personal vs Corporate */}
              <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-1.5 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setBillingProfile('PERSONAL')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    billingProfile === 'PERSONAL'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Personal Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBillingProfile('CORPORATE')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    billingProfile === 'CORPORATE'
                      ? 'bg-amber-400 text-slate-950 shadow-sm font-extrabold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 text-slate-900" />
                  <span>Corporate Account</span>
                </button>
              </div>

              {/* Personal Pass Active Banner */}
              {billingProfile === 'PERSONAL' && activeSubscription && (
                <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">🎟️</span>
                    <div>
                      <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                        <span>{activeSubscription.planName}</span>
                        <span className="text-[10px] font-extrabold bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">
                          ACTIVE PASS
                        </span>
                      </div>
                      <div className="text-[11px] text-amber-700">
                        {activeSubscription.remainingFreeRides > 0
                          ? `${activeSubscription.remainingFreeRides} Free Rides remaining this month`
                          : `Tier percentage discount applies automatically`}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-600 bg-white px-2 py-1 rounded-lg border border-amber-200">
                    Auto-Applied
                  </span>
                </div>
              )}

              {/* Corporate Allowance Status Banner */}
              {billingProfile === 'CORPORATE' && (
                <div className="space-y-3">
                  {corporateMember ? (
                    <div className="p-3.5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-amber-400" />
                          <span className="text-xs font-bold">{corporateEligibility?.companyName || 'Corporate Account'}</span>
                          <span className="text-[10px] font-semibold bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                            {corporateMember.role}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          ₹{corporateMember.remainingBudget} Allowance
                        </span>
                      </div>

                      {corporateEligibility && corporateEligibility.requiresApproval && (
                        <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[11px] flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                          <span>{corporateEligibility.reason}</span>
                        </div>
                      )}

                      {!corporateEligibility?.eligible && corporateEligibility?.reason && (
                        <div className="p-2 rounded-xl bg-red-400/10 border border-red-400/20 text-red-300 text-[11px] flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                          <span>{corporateEligibility.reason}</span>
                        </div>
                      )}

                      {/* Business Purpose Input */}
                      <div className="pt-1">
                        <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                          Business Trip Purpose / Expense Note (Optional)
                        </label>
                        <input
                          type="text"
                          value={corporateReason}
                          onChange={(e) => setCorporateReason(e.target.value)}
                          placeholder="e.g. Client visit, ITPL conference, Airport dispatch"
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-bold text-amber-950">No Enrolled Corporate Account</div>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          Your account ({user?.email}) is not enrolled in an active corporate roster. Switch to Personal profile or register your company on VeloGo Corporate.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Ride Categories list */}
              {estimates && Array.isArray(estimates.estimates) && estimates.estimates.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase">Available Rides</h3>
                  <div className="space-y-2.5">
                    {estimates.estimates.map((est) => (
                      <FareCard
                        key={est.category}
                        estimate={est}
                        isSelected={selectedCategory === est.category}
                        onSelect={() => setSelectedCategory(est.category)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Women-Only Passenger Eligibility & Traveler Selection */}
              {selectedCategory === 'WOMEN_BIKE' && (
                <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-3.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-purple-700" />
                      <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider">
                        Women-Only Traveler Verification
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200 text-purple-800">
                      Demo Self-Declaration
                    </span>
                  </div>

                  {/* Who is traveling toggle */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Who is Traveling?</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setIsForSomeoneElse(false)}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          !isForSomeoneElse
                            ? 'border-purple-600 bg-white text-purple-900 shadow-sm ring-2 ring-purple-400/20'
                            : 'border-purple-200 bg-purple-100/40 text-slate-600 hover:bg-white'
                        }`}
                      >
                        <UserCheck className="w-3.5 h-3.5" /> For Myself
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsForSomeoneElse(true)}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          isForSomeoneElse
                            ? 'border-purple-600 bg-white text-purple-900 shadow-sm ring-2 ring-purple-400/20'
                            : 'border-purple-200 bg-purple-100/40 text-slate-600 hover:bg-white'
                        }`}
                      >
                        <Users className="w-3.5 h-3.5" /> Book for Someone Else
                      </button>
                    </div>
                  </div>

                  {/* Details for Myself */}
                  {!isForSomeoneElse && (
                    <div className="p-3 bg-white rounded-xl border border-purple-100 text-xs space-y-2">
                      <p className="font-semibold text-slate-800">
                        Passenger: <span className="font-bold text-slate-950">{user?.fullName || 'Current User'}</span> ({user?.phone || 'Account Phone'})
                      </p>
                      {user?.gender === 'MALE' ? (
                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] leading-relaxed">
                          ⚠️ <strong>Eligibility Notice:</strong> Your account is registered as Male. Women-Only Bike rides are exclusively reserved for women travelers. If you are booking for a wife, mother, sister, daughter, or female companion, please select <strong>'Book for Someone Else'</strong> above, or select standard Bike/Auto/Cab for yourself.
                        </div>
                      ) : (
                        <div className="text-[11px] text-purple-800 flex items-center gap-1 font-medium">
                          <span>✓</span> Self-declaration: Eligible female traveler for Women-Only service.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Details for Someone Else */}
                  {isForSomeoneElse && (
                    <div className="space-y-3 p-3 bg-white rounded-xl border border-purple-100 text-xs">
                      <p className="text-[11px] text-slate-500 font-medium">
                        Enter traveler contact details so the captain can coordinate pickup directly.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">Traveler Full Name *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Sunita Sharma"
                            value={travelerName}
                            onChange={(e) => setTravelerName(e.target.value)}
                            className="w-full p-2 rounded-lg border border-slate-200 text-xs font-semibold focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">Traveler Phone *</label>
                          <input
                            type="tel"
                            required
                            placeholder="+91 98765 43210"
                            value={travelerPhone}
                            onChange={(e) => setTravelerPhone(e.target.value)}
                            className="w-full p-2 rounded-lg border border-slate-200 text-xs font-semibold focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">Relationship to Traveler *</label>
                          <select
                            value={travelerRelationship}
                            onChange={(e) => setTravelerRelationship(e.target.value)}
                            className="w-full p-2 rounded-lg border border-slate-200 text-xs font-semibold bg-white focus:ring-1 focus:ring-purple-500"
                          >
                            <option value="Wife">Wife</option>
                            <option value="Mother">Mother</option>
                            <option value="Sister">Sister</option>
                            <option value="Daughter">Daughter</option>
                            <option value="Friend">Friend</option>
                            <option value="Other">Other Relative / Companion</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">Traveler Gender *</label>
                          <select
                            value={travelerGender}
                            onChange={(e) => setTravelerGender(e.target.value as any)}
                            className="w-full p-2 rounded-lg border border-slate-200 text-xs font-semibold bg-white focus:ring-1 focus:ring-purple-500"
                          >
                            <option value="FEMALE">Female (Eligible)</option>
                            <option value="MALE">Male (Ineligible)</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                      </div>

                      {travelerGender !== 'FEMALE' && (
                        <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-[11px]">
                          ⚠️ Women-Only Bike bookings are reserved exclusively for women passengers. Please select Female or switch to standard Bike, Auto, or Cab.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Demo disclaimer notice */}
                  <div className="pt-1">
                    <label className="flex items-start gap-2 text-[11px] text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={passengerDeclarationConfirmed}
                        onChange={(e) => setPassengerDeclarationConfirmed(e.target.checked)}
                        className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span>
                        <strong>Demo Verification Acknowledgment:</strong> I declare that the actual traveler boarding this ride is a female passenger. I understand this is a simulation prototype for demo/testing only and does not represent official biometric or legal identity proof.
                      </span>
                    </label>
                  </div>

                  {/* Captain availability alert if 0 captains */}
                  {isSelectedCategoryUnavailable && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                      <span>No verified Women-Only Bike captains are currently available nearby. We will never assign a standard captain silently. Please retry shortly or choose another category.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Coupon / Promo code */}
              <div>
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Coupon code (e.g. VELO50)"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="w-full text-xs font-bold uppercase pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                  </div>
                  <button
                    type="submit"
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors"
                  >
                    Apply
                  </button>
                </form>
                {estimates?.couponApplied && (
                  <p className="text-xs font-bold text-emerald-600 mt-1.5 flex items-center gap-1">
                    ✓ Code '{estimates.couponApplied.code}' applied: Save ₹
                    {Number(estimates.couponApplied.discountAmount || 0).toFixed(2)}
                  </p>
                )}
              </div>

              {/* Payment Method toggle */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('RAZORPAY')}
                    className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                      paymentMethod === 'RAZORPAY'
                        ? 'border-brand-500 bg-brand-50/50 text-slate-950 shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-brand-600" />
                    <span>Razorpay (Online)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                      paymentMethod === 'CASH'
                        ? 'border-brand-500 bg-brand-50/50 text-slate-950 shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>Cash on Trip</span>
                  </button>
                </div>
              </div>

              {/* Book Ride Action */}
              <button
                type="button"
                disabled={Boolean(
                  isBooking ||
                  !estimates ||
                  isSelectedCategoryUnavailable ||
                  (billingProfile === 'CORPORATE' && (!corporateMember || (corporateEligibility && !corporateEligibility.eligible)))
                )}
                onClick={handleBookRide}
                className={`w-full font-black py-4 px-6 rounded-2xl shadow-glow text-base flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-50 cursor-pointer ${
                  billingProfile === 'CORPORATE'
                    ? 'bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-amber-300'
                    : selectedCategory === 'WOMEN_BIKE'
                    ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-200'
                    : 'bg-brand-500 hover:bg-brand-600 text-slate-950'
                }`}
              >
                {isBooking
                  ? 'Dispatching Request...'
                  : isSelectedCategoryUnavailable
                  ? 'No Women-Only Captains Nearby'
                  : billingProfile === 'CORPORATE' && corporateEligibility?.requiresApproval
                  ? 'Submit for Manager Approval'
                  : 'Confirm & Request Captain'}
                <ArrowRight className="w-5 h-5" />
              </button>

              {/* Approval Notification Modal */}
              {approvalSubmittedModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl text-center space-y-4">
                    <div className="w-14 h-14 bg-amber-400/10 text-amber-400 border border-amber-400/20 rounded-2xl flex items-center justify-center mx-auto">
                      <Building2 className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Trip Submitted for Approval</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Your corporate ride request exceeds your company's standard policy threshold and has been submitted to your manager for review. You will receive an instant notification once approved.
                    </p>
                    <button
                      onClick={() => setApprovalSubmittedModal(false)}
                      className="w-full py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Understood
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
