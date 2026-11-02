import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Bike,
  Shield,
  Clock,
  User,
  LogOut,
  Bell,
  Menu,
  X,
  Compass,
  LayoutDashboard,
  Car,
  Building2,
  Ticket,
  Sparkles,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
              <Bike className="w-6 h-6 text-slate-950 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-2xl tracking-tight text-slate-900 leading-none">
                Velo<span className="text-brand-500">Go</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest leading-none mt-0.5">
                City Express
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/book"
              className="text-sm font-semibold text-slate-700 hover:text-brand-600 transition-colors flex items-center gap-1.5"
            >
              <Compass className="w-4 h-4" /> Book a Ride
            </Link>

            {user?.role === 'ROLE_CUSTOMER' && (
              <>
                <Link
                  to="/customer/dashboard"
                  className="text-sm font-semibold text-slate-700 hover:text-brand-600 transition-colors flex items-center gap-1.5"
                >
                  <LayoutDashboard className="w-4 h-4" /> My Dashboard
                </Link>
                <Link
                  to="/customer/history"
                  className="text-sm font-semibold text-slate-700 hover:text-brand-600 transition-colors flex items-center gap-1.5"
                >
                  <Clock className="w-4 h-4" /> Ride History
                </Link>
                <Link
                  to="/customer/features"
                  className="text-sm font-semibold text-slate-700 hover:text-brand-600 transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" /> More Features
                </Link>
              </>
            )}

            {user?.role === 'ROLE_CAPTAIN' && (
              <Link
                to="/captain/dashboard"
                className="text-sm font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors flex items-center gap-1.5"
              >
                <Car className="w-4 h-4" /> Captain Portal
              </Link>
            )}

            {user?.role === 'ROLE_ADMIN' && (
              <Link
                to="/admin/dashboard"
                className="text-sm font-semibold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
              >
                <Shield className="w-4 h-4" /> Admin Console
              </Link>
            )}

            <Link
              to="/subscriptions"
              className="text-sm font-semibold text-slate-700 hover:text-brand-600 transition-colors flex items-center gap-1.5"
            >
              <Ticket className="w-4 h-4 text-amber-500" /> Commuter Passes
            </Link>

            <Link
              to="/corporate"
              className="text-sm font-semibold text-slate-700 hover:text-brand-600 transition-colors flex items-center gap-1.5"
            >
              <Building2 className="w-4 h-4 text-cyan-600" /> Corporate
            </Link>

            <Link
              to="/safety"
              className="text-sm font-semibold text-slate-700 hover:text-brand-600 transition-colors flex items-center gap-1.5"
            >
              <Shield className="w-4 h-4" /> Safety & Help
            </Link>
          </nav>

          {/* Right Action Profile & Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex flex-col text-right">
                  <span className="text-sm font-bold text-slate-900 leading-tight">
                    {user.fullName}
                  </span>
                  <span className="text-xs font-semibold text-brand-600 uppercase">
                    {user.role === 'ROLE_ADMIN'
                      ? 'Administrator'
                      : user.role === 'ROLE_CAPTAIN'
                      ? 'Captain'
                      : 'Customer'}
                  </span>
                </div>
                <img
                  src={
                    user.avatarUrl ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
                  }
                  alt={user.fullName}
                  className="w-9 h-9 rounded-full ring-2 ring-brand-400 object-cover"
                />
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-sm font-semibold text-slate-700 hover:text-slate-900 px-3 py-2"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-bold bg-brand-500 hover:bg-brand-600 text-slate-950 px-4 py-2 rounded-xl shadow-glow transition-all"
                >
                  Join VeloGo
                </Link>
                <Link
                  to="/captain/register"
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-300 px-3 py-2 rounded-xl transition-all"
                >
                  Drive with Us
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-700 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-6 space-y-3">
          <Link
            to="/book"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-slate-900 py-2"
          >
            Book a Ride
          </Link>
          {user?.role === 'ROLE_CUSTOMER' && (
            <>
              <Link
                to="/customer/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-base font-medium text-slate-900 py-2"
              >
                Customer Dashboard
              </Link>
              <Link
                to="/customer/history"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-base font-medium text-slate-900 py-2"
              >
                Ride History
              </Link>
              <Link
                to="/customer/features"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-base font-medium text-slate-900 py-2"
              >
                More Features
              </Link>
            </>
          )}
          {user?.role === 'ROLE_CAPTAIN' && (
            <Link
              to="/captain/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-medium text-amber-600 py-2 font-bold"
            >
              Captain Dashboard
            </Link>
          )}
          {user?.role === 'ROLE_ADMIN' && (
            <Link
              to="/admin/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-medium text-indigo-600 py-2 font-bold"
            >
              Admin Console
            </Link>
          )}
          <Link
            to="/safety"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-slate-900 py-2"
          >
            Safety & Help
          </Link>

          <div className="pt-4 border-t border-slate-200">
            {user ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">{user.fullName}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 rounded-lg"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center font-bold py-2 rounded-xl bg-slate-100"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center font-bold py-2 rounded-xl bg-brand-500 text-slate-950"
                >
                  Sign Up
                </Link>
                <Link
                  to="/captain/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center font-bold py-2 rounded-xl border border-slate-300"
                >
                  Become a Captain
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
