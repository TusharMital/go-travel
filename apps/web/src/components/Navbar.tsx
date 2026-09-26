import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Compass, ShieldCheck, User as UserIcon, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { NotificationsPopover } from './NotificationsPopover';

interface NavbarProps {
  onOpenAuth: (view: 'login' | 'register') => void;
  activeTab?: 'trips' | 'storage' | 'transport' | 'bookings' | 'transport_bookings';
  onChangeTab?: (tab: 'trips' | 'storage' | 'transport' | 'bookings' | 'transport_bookings') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAuth,
  activeTab = 'trips',
  onChangeTab,
}) => {
  const { user, isAuthenticated, logout } = useAuth();

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-amber-200">Admin</span>;
      case 'support':
        return <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-purple-200">Support</span>;
      case 'partner_storage':
        return <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200">Storage Partner</span>;
      case 'partner_transport':
        return <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-blue-200">Transport Partner</span>;
      default:
        return <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-indigo-200">Traveler</span>;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Tabs */}
        <div className="flex items-center space-x-8">
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => onChangeTab?.('trips')}
          >
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Compass className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="font-extrabold text-slate-900 tracking-tight text-lg flex items-center space-x-1.5">
                <span>TravelSync</span>
                <span className="text-xs font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">v1</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium -mt-0.5">Trips • Storage • Transport</p>
            </div>
          </div>

          {/* Navigation Links */}
          {onChangeTab && (
            <nav className="hidden lg:flex items-center space-x-1 bg-slate-100 p-1 rounded-2xl">
              <button
                onClick={() => onChangeTab('trips')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  activeTab === 'trips'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                My Trips
              </button>
              <button
                onClick={() => onChangeTab('storage')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  activeTab === 'storage'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Storage
              </button>
              <button
                onClick={() => onChangeTab('transport')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  activeTab === 'transport'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Transport
              </button>
              <button
                onClick={() => onChangeTab('bookings')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  activeTab === 'bookings'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Luggage Bookings
              </button>
              <button
                onClick={() => onChangeTab('transport_bookings')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  activeTab === 'transport_bookings'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                My Rides
              </button>
            </nav>
          )}
        </div>

        {/* Navigation & Auth */}
        <div className="flex items-center space-x-4">
          {isAuthenticated && user ? (
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex flex-col items-end text-right">
                <span className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                  {user.full_name}
                  {user.email_verified_at ? (
                    <span title="Verified Account">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    </span>
                  ) : (
                    <span title="Unverified Email">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                    </span>
                  )}
                </span>
                <span className="text-xs text-slate-500">{user.email}</span>
              </div>

              {getRoleBadge(user.role)}

              <NotificationsPopover />

              <button
                onClick={logout}
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="text-sm font-medium text-slate-700 hover:text-indigo-600 px-3.5 py-2 rounded-lg transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-lg shadow-sm shadow-indigo-200 transition-all hover:shadow"
              >
                Create Account
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
