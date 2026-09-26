import React from 'react';
import { PartnerProfile } from '../api/client';
import {
  Building2,
  ShieldCheck,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';

interface NavbarProps {
  profile: PartnerProfile | null;
  onSwitchMode: (mode: 'verified_storage' | 'pending' | 'unregistered') => void;
  activeTab?: string;
  onChangeTab?: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  profile,
  onSwitchMode,
  activeTab,
  onChangeTab,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Section Indicator */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3 cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-xl flex items-center justify-center text-slate-950 font-black shadow-md shadow-emerald-950">
              <Building2 className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <div className="font-extrabold text-white tracking-tight text-base flex items-center space-x-2">
                <span>PartnerSync</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                  Partner Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Luggage & Transport Provider Ops</p>
            </div>
          </div>

          {/* Navigation Tabs (Only when verified) */}
          {profile?.status === 'verified' && onChangeTab && (
            <nav className="hidden md:flex items-center space-x-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => onChangeTab('locations')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'locations'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Locations & Capacity
              </button>
              <button
                onClick={() => onChangeTab('bookings')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'bookings'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Bookings & Check-in
              </button>
              <button
                onClick={() => onChangeTab('payouts')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'payouts'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Payout Summary
              </button>
            </nav>
          )}
        </div>

        {/* Right Info & State Switcher */}
        <div className="flex items-center space-x-4">
          {/* Status Badge */}
          {profile && (
            <div className="hidden sm:flex items-center space-x-2">
              {profile.status === 'verified' ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Verified Partner</span>
                </span>
              ) : profile.status === 'pending' ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>Pending Approval</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-slate-700 text-slate-300 border border-slate-600">
                  <span>Unregistered</span>
                </span>
              )}
            </div>
          )}

          {/* Demo Scenario Switcher for Fast Evaluation */}
          <div className="flex items-center space-x-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700 text-[11px]">
            <span className="text-slate-400 px-2 font-medium hidden lg:inline">Scenario:</span>
            <button
              onClick={() => onSwitchMode('verified_storage')}
              className={`px-2 py-1 rounded-lg font-semibold transition-all ${
                profile?.status === 'verified'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Active Verified Storage Partner"
            >
              Verified
            </button>
            <button
              onClick={() => onSwitchMode('pending')}
              className={`px-2 py-1 rounded-lg font-semibold transition-all ${
                profile?.status === 'pending'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Pending Verification Application"
            >
              Pending
            </button>
            <button
              onClick={() => onSwitchMode('unregistered')}
              className={`px-2 py-1 rounded-lg font-semibold transition-all ${
                profile?.status === 'unregistered'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="New Onboarding Form"
            >
              Onboard
            </button>
          </div>

          {/* Link to Traveler App */}
          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center space-x-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700 transition-colors"
          >
            <span>Traveler App</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>
      </div>
    </header>
  );
};
