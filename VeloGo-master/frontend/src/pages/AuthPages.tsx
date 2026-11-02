import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bike, Shield, Car, ArrowRight, AlertCircle, Key, User, Phone, Mail } from 'lucide-react';
import { VehicleCategory } from '../types';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const user = await login(emailOrPhone, password);
      if (user.role === 'ROLE_ADMIN') {
        navigate('/admin/dashboard');
      } else if (user.role === 'ROLE_CAPTAIN') {
        navigate('/captain/dashboard');
      } else {
        const redirect = new URLSearchParams(location.search).get('redirect') || '/book';
        navigate(redirect);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemoLogin = (email: string, pass: string) => {
    setEmailOrPhone(email);
    setPassword(pass);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 bg-slate-50">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-brand-500 text-slate-950 flex items-center justify-center mx-auto shadow-glow">
            <Bike className="w-7 h-7 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Welcome to VeloGo</h2>
          <p className="text-xs text-slate-500">Sign in to your rider or captain account</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">
              Email or Phone Number
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="customer@velogo.com or +919876543210"
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                className="w-full text-xs font-semibold p-3 pl-10 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Password</label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs font-semibold p-3 pl-10 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-500 hover:bg-brand-600 text-slate-950 font-black py-3.5 rounded-xl shadow-glow text-sm flex items-center justify-center gap-2 transition-all"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* 1-Click Demo Profiles */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <p className="text-[11px] font-bold text-slate-400 uppercase text-center">
            One-Click Test Accounts
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('customer@velogo.com', 'password123')}
              className="p-2 rounded-xl bg-slate-100 hover:bg-brand-100 text-slate-800 text-[11px] font-bold text-center transition-colors"
            >
              Passenger
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('captain.rahul@velogo.com', 'password123')}
              className="p-2 rounded-xl bg-slate-100 hover:bg-brand-100 text-slate-800 text-[11px] font-bold text-center transition-colors"
            >
              Captain
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('admin@velogo.com', 'password123')}
              className="p-2 rounded-xl bg-slate-100 hover:bg-brand-100 text-slate-800 text-[11px] font-bold text-center transition-colors"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('corpadmin@acme.corp', 'password123')}
              className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-bold text-center transition-colors col-span-3 flex items-center justify-center gap-1.5"
            >
              🏢 Acme Corp Admin (Enterprise B2B)
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500">
          New to VeloGo?{' '}
          <Link to="/register" className="font-bold text-brand-700 hover:underline">
            Register Passenger
          </Link>{' '}
          or{' '}
          <Link to="/captain/register" className="font-bold text-brand-700 hover:underline">
            Drive with Us
          </Link>
        </p>
      </div>
    </div>
  );
};

export const CustomerRegisterPage: React.FC = () => {
  const { registerCustomer } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    gender: 'FEMALE',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await registerCustomer(form);
      navigate('/book');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 bg-slate-50">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Create Passenger Account</h2>
          <p className="text-xs text-slate-500">Start booking lightning-fast bike taxis and cabs</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="font-bold text-slate-600 block mb-1">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Rahul Sharma"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
            />
          </div>
          <div>
            <label className="font-bold text-slate-600 block mb-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="rahul@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
            />
          </div>
          <div>
            <label className="font-bold text-slate-600 block mb-1">Mobile Phone (+91)</label>
            <input
              type="tel"
              required
              placeholder="+91 98765 43210"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
            />
          </div>
          <div>
            <label className="font-bold text-slate-600 block mb-1">Password</label>
            <input
              type="password"
              required
              placeholder="Min 6 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
            />
          </div>

          <div>
            <label className="font-bold text-slate-600 block mb-1">Gender</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'FEMALE', label: 'Female' },
                { id: 'MALE', label: 'Male' },
                { id: 'OTHER', label: 'Other' },
              ].map((g) => (
                <button
                  type="button"
                  key={g.id}
                  onClick={() => setForm({ ...form, gender: g.id })}
                  className={`p-2 rounded-xl font-bold border-2 transition-all ${
                    form.gender === g.id
                      ? 'border-brand-500 bg-brand-50 text-slate-950 shadow-sm'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Used for safety preferences and Women-Only Bike eligibility.
            </span>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase">Emergency Contact (Optional)</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Contact Name"
                value={form.emergencyContactName}
                onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })}
                className="w-full p-2 rounded-xl border border-slate-200 text-xs"
              />
              <input
                type="tel"
                placeholder="Contact Phone"
                value={form.emergencyContactPhone}
                onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })}
                className="w-full p-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-500 hover:bg-brand-600 text-slate-950 font-black py-3.5 rounded-xl shadow-glow text-sm flex items-center justify-center gap-2 transition-all mt-4"
          >
            {isSubmitting ? 'Creating Account...' : 'Complete Registration'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="font-bold text-brand-700 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export const CaptainRegisterPage: React.FC = () => {
  const { registerCaptain } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    drivingLicenseNumber: '',
    vehicleCategory: 'BIKE' as VehicleCategory,
    vehicleModel: '',
    registrationNumber: '',
    vehicleColor: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await registerCaptain(form);
      navigate('/captain/dashboard');
    } catch (err: any) {
      setError(err.message || 'Captain registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 bg-slate-50">
      <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-6">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center mx-auto shadow-glow">
            <Car className="w-7 h-7 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Become a VeloGo Captain</h2>
          <p className="text-xs text-slate-500">Register your vehicle and start earning daily</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-600 block mb-1">Full Name</label>
              <input
                type="text"
                required
                placeholder="Ramesh Kumar"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-600 block mb-1">Mobile Phone (+91)</label>
              <input
                type="tel"
                required
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-600 block mb-1">Email</label>
              <input
                type="email"
                required
                placeholder="ramesh@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-600 block mb-1">Password</label>
              <input
                type="password"
                required
                placeholder="Min 6 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <label className="font-bold text-slate-600 block mb-1">Driving License Number</label>
            <input
              type="text"
              required
              placeholder="e.g. DL-04-2022-0012345"
              value={form.drivingLicenseNumber}
              onChange={(e) => setForm({ ...form, drivingLicenseNumber: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 uppercase font-mono font-bold"
            />
          </div>

          <div className="space-y-3">
            <div>
              <label className="font-bold text-slate-600 block mb-1">Vehicle Category</label>
              <div className="grid grid-cols-3 gap-2">
                {(['BIKE', 'AUTO', 'CAB'] as VehicleCategory[]).map((cat) => (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => setForm({ ...form, vehicleCategory: cat })}
                    className={`p-2.5 rounded-xl font-bold border-2 transition-all ${
                      form.vehicleCategory === cat
                        ? 'border-brand-500 bg-brand-50 text-slate-950 shadow-sm'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="font-bold text-slate-600 block mb-1">Vehicle Model</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Honda Activa 6G"
                  value={form.vehicleModel}
                  onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1">Color</label>
                <input
                  type="text"
                  required
                  placeholder="Yellow"
                  value={form.vehicleColor}
                  onChange={(e) => setForm({ ...form, vehicleColor: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-600 block mb-1">Vehicle Registration Plate</label>
              <input
                type="text"
                required
                placeholder="e.g. KA-01-EQ-1234"
                value={form.registrationNumber}
                onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 uppercase font-mono font-black"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-500 hover:bg-brand-600 text-slate-950 font-black py-3.5 rounded-xl shadow-glow text-sm flex items-center justify-center gap-2 transition-all mt-4"
          >
            {isSubmitting ? 'Submitting Details...' : 'Submit Driver Registration'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="font-bold text-brand-700 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};
