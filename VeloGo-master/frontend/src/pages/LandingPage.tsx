import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bike,
  Zap,
  ArrowRight,
  Crosshair,
  ArrowUpDown,
  Navigation,
  CheckCircle2,
  Sparkles,
  Shield,
  Smartphone,
  Clock,
  DollarSign,
  Users,
} from 'lucide-react';
import { MapViewer } from '../components/MapViewer';
import { AddressAutocomplete } from '../components/AddressAutocomplete';
import { api } from '../services/api';
import { FareEstimateResponse, VehicleCategory } from '../types';

const POPULAR_SPOTS = [
  { name: 'Koramangala', address: 'Koramangala 5th Block, Bengaluru', lat: 12.9352, lng: 77.6245 },
  { name: 'Indiranagar', address: 'Indiranagar 100ft Road, Bengaluru', lat: 12.9785, lng: 77.6408 },
  { name: 'MG Road', address: 'MG Road Metro Station, Bengaluru', lat: 12.9756, lng: 77.6066 },
  { name: 'Whitefield', address: 'ITPL Main Road, Whitefield, Bengaluru', lat: 12.9866, lng: 77.7381 },
  { name: 'Electronic City', address: 'Electronic City Phase 1, Bengaluru', lat: 12.8452, lng: 77.6602 },
  { name: 'Majestic', address: 'Majestic Bus Terminal, Bengaluru', lat: 12.9784, lng: 77.5726 },
  { name: 'Airport (BLR)', address: 'Kempegowda International Airport, Bengaluru', lat: 13.1986, lng: 77.7066 },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  // Location state
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

  const [selectedCategory, setSelectedCategory] = useState<VehicleCategory>('BIKE');
  const [selectionMode, setSelectionMode] = useState<'pickup' | 'destination' | null>(null);
  const [estimates, setEstimates] = useState<FareEstimateResponse | null>(null);
  const [isLoadingEstimate, setIsLoadingEstimate] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | undefined>(undefined);

  // Calculate approximate distance & duration based on coordinates
  const calculatedFallback = useMemo(() => {
    const lat1 = pickup.lat;
    const lon1 = pickup.lng;
    const lat2 = destination.lat;
    const lon2 = destination.lng;
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightKm = R * c;
    const roadKm = Math.round(straightKm * 1.25 * 10) / 10;
    const durMins = Math.max(3, Math.round(roadKm * 2.0));
    return {
      distanceKm: Math.max(0.5, roadKm),
      durationMinutes: durMins,
    };
  }, [pickup.lat, pickup.lng, destination.lat, destination.lng]);

  const activeDistanceKm = estimates?.distanceKm ?? calculatedFallback.distanceKm;
  const activeDurationMinutes = estimates?.durationMinutes ?? calculatedFallback.durationMinutes;

  // Dynamic Fares calculated accurately based on distance
  const dynamicFares = useMemo(() => {
    if (estimates && estimates.estimates && estimates.estimates.length > 0) {
      const b = estimates.estimates.find((e) => e.category === 'BIKE')?.totalFare;
      const a = estimates.estimates.find((e) => e.category === 'AUTO')?.totalFare;
      const c = estimates.estimates.find((e) => e.category === 'CAB')?.totalFare;
      if (b && a && c) {
        return {
          bike: Math.round(b),
          auto: Math.round(a),
          cab: Math.round(c),
        };
      }
    }
    // Matching backend configuration:
    // BIKE: base 25, min 35, 9/km, 1.5/min, 5 fee, 5% tax
    const bikeSub = Math.max(35, 25 + activeDistanceKm * 9.0 + activeDurationMinutes * 1.5 + 5);
    // AUTO: base 35, min 50, 13/km, 2.0/min, 8 fee, 5% tax
    const autoSub = Math.max(50, 35 + activeDistanceKm * 13.0 + activeDurationMinutes * 2.0 + 8);
    // CAB: base 70, min 100, 18/km, 3.0/min, 15 fee, 5% tax
    const cabSub = Math.max(100, 70 + activeDistanceKm * 18.0 + activeDurationMinutes * 3.0 + 15);

    return {
      bike: Math.round(bikeSub * 1.05),
      auto: Math.round(autoSub * 1.05),
      cab: Math.round(cabSub * 1.05),
    };
  }, [estimates, activeDistanceKm, activeDurationMinutes]);

  // Fetch real backend OSRM route & fare estimate
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingEstimate(true);

    api.rides
      .estimate({
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        pickupAddress: pickup.address,
        destLat: destination.lat,
        destLng: destination.lng,
        destAddress: destination.address,
      })
      .then((res) => {
        if (!isCancelled) {
          setEstimates(res);
          setIsLoadingEstimate(false);
        }
      })
      .catch((err) => {
        console.warn('Estimate fetch failed:', err);
        if (!isCancelled) {
          setIsLoadingEstimate(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [pickup.lat, pickup.lng, destination.lat, destination.lng]);

  // Map location change handlers with reverse geocoding for draggable pins and clicks
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
        address: loc.address || `Pinned Location (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})`,
      });
    }
    setSelectionMode(null);
  };

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
        address: loc.address || `Pinned Location (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})`,
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

  // GPS Locate User handler
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
        try {
          const rev = await api.geo.reverse(lat, lng);
          setPickup({
            lat,
            lng,
            address: rev.displayName || 'Current GPS Location',
          });
        } catch {
          setPickup({
            lat,
            lng,
            address: 'Current GPS Location',
          });
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        alert('Could not retrieve your location. Please enable location permissions.');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Swap pickup & destination
  const handleSwapLocations = () => {
    const prevPickup = { ...pickup };
    setPickup({ ...destination });
    setDestination(prevPickup);
  };

  const handleQuickBook = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(
      `/book?pickup=${encodeURIComponent(pickup.address)}&dest=${encodeURIComponent(
        destination.address
      )}&pLat=${pickup.lat}&pLng=${pickup.lng}&dLat=${destination.lat}&dLng=${
        destination.lng
      }&cat=${selectedCategory}`
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-navy-900 via-navy-950 to-slate-900 text-white overflow-hidden py-12 lg:py-16 px-4 sm:px-6 lg:px-8">
        {/* Glow backdrop decorative circles */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start relative z-10">
          {/* Left Hero copy */}
          <div className="lg:col-span-5 space-y-6 text-center lg:text-left pt-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs font-bold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 fill-brand-400" /> India's Fastest Urban Ride Network
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white">
              Beat City Traffic. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-amber-200">
                Ride Faster, Pay Less.
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto lg:mx-0 font-medium leading-relaxed">
              Skip endless jams with VeloGo bike taxis, express autos, and prime cabs. Transparent pricing, verified captains, and door-to-door safety.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-1">
              <button
                onClick={() => navigate('/book')}
                className="bg-brand-500 hover:bg-brand-600 text-slate-950 font-black px-7 py-3 rounded-2xl shadow-glow text-sm flex items-center gap-2 transition-all hover:scale-105"
              >
                Book a Ride Now <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/captain/register')}
                className="border border-slate-700 hover:border-slate-500 text-white font-bold px-5 py-3 rounded-2xl text-sm transition-colors"
              >
                Become a Captain
              </button>
            </div>

            {/* Quick stats banner */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800/80 max-w-md mx-auto lg:mx-0 text-left">
              <div>
                <p className="text-xl font-black text-brand-400">&lt; 3 mins</p>
                <p className="text-xs text-slate-400">Average Pickup</p>
              </div>
              <div>
                <p className="text-xl font-black text-white">₹25</p>
                <p className="text-xs text-slate-400">Starting Fare</p>
              </div>
              <div>
                <p className="text-xl font-black text-white">100%</p>
                <p className="text-xs text-slate-400">Verified Drivers</p>
              </div>
            </div>
          </div>

          {/* Right Quick Booking Card with Integrated Map */}
          <div className="lg:col-span-7">
            <div className="bg-white text-slate-900 rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-100">
              {/* Header */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-xl font-extrabold text-slate-900">Where to go?</h3>
                  <span className="text-[11px] font-bold text-brand-700 bg-brand-50 border border-brand-200/60 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                    INSTANT ESTIMATE
                  </span>
                </div>
                {/* Real-time distance and duration pill */}
                <span className="text-xs font-extrabold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                  <Navigation className="w-3.5 h-3.5 text-amber-600" />
                  {activeDistanceKm} km &bull; ~{activeDurationMinutes} mins
                </span>
              </div>

              <form onSubmit={handleQuickBook} className="space-y-3.5">
                {/* Pickup & Destination Inputs with Swap */}
                <div className="relative space-y-2.5">
                  <AddressAutocomplete
                    label="Pickup Location"
                    placeholder="Search pickup landmark or street..."
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
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Pin on map
                      </button>
                    }
                  />

                  {/* Swap button floating on the right */}
                  <div className="flex justify-end -my-1 pr-1">
                    <button
                      type="button"
                      onClick={handleSwapLocations}
                      title="Swap pickup and destination"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-brand-600 px-2 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
                    >
                      <ArrowUpDown className="w-3 h-3" /> Swap
                    </button>
                  </div>

                  <AddressAutocomplete
                    label="Destination"
                    placeholder="Search destination landmark or street..."
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
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Pin on map
                      </button>
                    }
                  />
                </div>

                {/* Popular spots quick chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">
                    Spots:
                  </span>
                  {POPULAR_SPOTS.map((spot) => (
                    <button
                      key={spot.name}
                      type="button"
                      onClick={() =>
                        setDestination({
                          address: spot.address,
                          lat: spot.lat,
                          lng: spot.lng,
                        })
                      }
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-brand-100 hover:text-brand-900 text-slate-700 whitespace-nowrap transition-colors flex-shrink-0"
                    >
                      {spot.name}
                    </button>
                  ))}
                </div>

                {/* Integrated Interactive Leaflet Map */}
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner h-[260px] sm:h-[300px]">
                  <MapViewer
                    pickup={pickup}
                    destination={destination}
                    currentLocation={currentLocation}
                    routeGeometry={estimates?.routeGeometry}
                    routeDistanceKm={activeDistanceKm}
                    routeDurationMins={estimates?.durationMinutes}
                    selectionMode={selectionMode}
                    onSelectionModeChange={setSelectionMode}
                    onMapClick={handleMapClick}
                    onPickupChange={handleMapPickupChange}
                    onDestinationChange={handleMapDestChange}
                    onLocateUser={handleLocateUser}
                    isLocating={isLocating}
                    className="h-full w-full"
                    zoom={13}
                  />
                </div>

                {/* Ride category selection preview with DYNAMIC FARES */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Select Ride Category &bull; Dynamic Fares
                    </span>
                    {isLoadingEstimate && (
                      <span className="text-[10px] font-semibold text-brand-600 animate-pulse">
                        Updating live fares...
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {/* Bike Taxi */}
                    <div
                      onClick={() => setSelectedCategory('BIKE')}
                      className={`p-3 rounded-2xl border-2 text-center cursor-pointer transition-all ${
                        selectedCategory === 'BIKE'
                          ? 'border-brand-500 bg-brand-50/70 shadow-glow scale-[1.02]'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <Bike className="w-5 h-5 mx-auto text-brand-600 mb-0.5" />
                      <p className="text-xs font-extrabold text-slate-900">Bike Taxi</p>
                      <p className="text-sm font-black text-slate-900 mt-0.5 text-brand-600">
                        ₹{dynamicFares.bike}
                      </p>
                      <p className="text-[10px] text-slate-500">₹9/km &bull; fastest</p>
                    </div>

                    {/* Auto */}
                    <div
                      onClick={() => setSelectedCategory('AUTO')}
                      className={`p-3 rounded-2xl border-2 text-center cursor-pointer transition-all ${
                        selectedCategory === 'AUTO'
                          ? 'border-brand-500 bg-brand-50/70 shadow-glow scale-[1.02]'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xl block leading-none mb-1">🛺</span>
                      <p className="text-xs font-extrabold text-slate-900">Auto</p>
                      <p className="text-sm font-black text-slate-900 mt-0.5 text-amber-600">
                        ₹{dynamicFares.auto}
                      </p>
                      <p className="text-[10px] text-slate-500">₹13/km &bull; direct</p>
                    </div>

                    {/* Cab */}
                    <div
                      onClick={() => setSelectedCategory('CAB')}
                      className={`p-3 rounded-2xl border-2 text-center cursor-pointer transition-all ${
                        selectedCategory === 'CAB'
                          ? 'border-brand-500 bg-brand-50/70 shadow-glow scale-[1.02]'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xl block leading-none mb-1">🚗</span>
                      <p className="text-xs font-extrabold text-slate-900">Cab</p>
                      <p className="text-sm font-black text-slate-900 mt-0.5 text-blue-600">
                        ₹{dynamicFares.cab}
                      </p>
                      <p className="text-[10px] text-slate-500">₹18/km &bull; AC prime</p>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-brand-500 hover:bg-brand-600 text-slate-950 font-black py-3.5 rounded-xl shadow-glow text-base flex items-center justify-center gap-2 transition-all mt-3 active:scale-[0.99]"
                >
                  See Fares & Book <ArrowRight className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Showcase */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-brand-600">
            Tailored For Every Journey
          </h2>
          <p className="text-3xl font-black text-slate-900 mt-2">
            Choose how you travel across the city
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Bike */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 hover:shadow-xl transition-all relative overflow-hidden group">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Bike className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900">VeloGo Bike Taxi</h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Fastest way through peak-hour city traffic. Ideal for solo travelers and quick daily office commutes.
            </p>
            <ul className="mt-6 space-y-2.5 text-xs text-slate-700 font-semibold">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Sanitized helmet provided
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Up to 50% cheaper than cabs
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Zero waiting at traffic bottlenecks
              </li>
            </ul>
          </div>

          {/* Auto */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 hover:shadow-xl transition-all relative overflow-hidden group">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
              🛺
            </div>
            <h3 className="text-xl font-extrabold text-slate-900">VeloGo Auto Express</h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              No bargaining, no meters refused. Doorstep auto rickshaws with upfront fixed pricing.
            </p>
            <ul className="mt-6 space-y-2.5 text-xs text-slate-700 font-semibold">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Up to 3 passengers
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Pocket-friendly local rides
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Transparent digital receipts
              </li>
            </ul>
          </div>

          {/* Cab */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 hover:shadow-xl transition-all relative overflow-hidden group">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
              🚗
            </div>
            <h3 className="text-xl font-extrabold text-slate-900">VeloGo Prime Cab</h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Air-conditioned sedans and hatchbacks for airport transfers, family outings, and relaxed travels.
            </p>
            <ul className="mt-6 space-y-2.5 text-xs text-slate-700 font-semibold">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Spacious trunk & AC comfort
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> High-rated experienced drivers
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Real-time route tracking
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Safety & Trust Feature Grid */}
      <section className="bg-slate-900 text-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-brand-400">
              Safety First, Always
            </h2>
            <p className="text-3xl font-black text-white mt-2">
              Every ride engineered with 360° protection
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-3">
              <Shield className="w-8 h-8 text-brand-400" />
              <h4 className="font-extrabold text-lg">Verified Captains</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Background checks, valid driving licenses, and vehicle inspection before anyone takes a ride.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-3">
              <Zap className="w-8 h-8 text-brand-400" />
              <h4 className="font-extrabold text-lg">Secure Start OTP</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Trips only begin when you share your secret 4-digit OTP with your assigned captain.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-3">
              <Smartphone className="w-8 h-8 text-brand-400" />
              <h4 className="font-extrabold text-lg">Live Trip Sharing</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Share your live GPS ride tracking link with friends and family with a single tap.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-3">
              <Clock className="w-8 h-8 text-brand-400" />
              <h4 className="font-extrabold text-lg">24x7 Safety Support</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dedicated rapid-response team and emergency contacts integration in every dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Driver Onboarding Call to Action */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="bg-gradient-to-r from-brand-500 to-amber-500 rounded-3xl p-8 sm:p-12 text-slate-950 flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
          <div className="space-y-3 max-w-xl">
            <h3 className="text-3xl font-black tracking-tight leading-tight">
              Earn up to ₹35,000/month driving with VeloGo
            </h3>
            <p className="text-sm font-semibold text-slate-900 leading-relaxed">
              Flexible hours, instant daily payouts, zero platform commission on initial rides, and comprehensive rider insurance.
            </p>
          </div>
          <button
            onClick={() => navigate('/captain/register')}
            className="bg-navy-950 hover:bg-slate-900 text-white font-black px-8 py-4 rounded-2xl text-base shadow-2xl flex-shrink-0 transition-transform hover:scale-105"
          >
            Register as Captain Today
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-10 px-4 sm:px-6 lg:px-8 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Bike className="w-5 h-5 text-brand-500" />
            <span className="font-extrabold text-slate-900 text-sm">VeloGo Technologies</span>
          </div>
          <p>&copy; {new Date().getFullYear()} VeloGo Inc. All rights reserved. Built for lightning-fast city travel.</p>
          <div className="flex gap-4">
            <span className="hover:text-slate-800 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-800 cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-800 cursor-pointer">Pricing Policy</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
