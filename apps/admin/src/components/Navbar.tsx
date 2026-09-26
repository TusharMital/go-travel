import React from 'react';
import {
  ShieldCheck,
  BarChart3,
  Users,
  Search,
  FileText,
  ExternalLink,
  RefreshCw,
  UserCheck,
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'metrics' | 'partners' | 'bookings' | 'audit';
  onSelectTab: (tab: 'metrics' | 'partners' | 'bookings' | 'audit') => void;
  pendingPartnerCount: number;
  currentRole: 'admin' | 'support' | 'traveler';
  onRoleChange: (role: 'admin' | 'support' | 'traveler') => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  pendingPartnerCount,
  currentRole,
  onRoleChange,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Portal Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-white tracking-tight text-lg">TravelPlatform</span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  STAFF & ADMIN
                </span>
              </div>
              <p className="text-xs text-slate-400">Trust & Safety, Audit Ledger & Partner Verification</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80">
            <button
              onClick={() => onSelectTab('metrics')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentTab === 'metrics'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Metrics & Health</span>
            </button>

            <button
              onClick={() => onSelectTab('partners')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentTab === 'partners'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Partner Queue</span>
              {pendingPartnerCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    currentTab === 'partners'
                      ? 'bg-slate-950 text-amber-300'
                      : 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {pendingPartnerCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('bookings')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentTab === 'bookings'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Booking Lookup</span>
            </button>

            <button
              onClick={() => onSelectTab('audit')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentTab === 'audit'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Audit Ledger</span>
            </button>
          </nav>

          {/* Right Action Bar: Persona Switcher & External Portals */}
          <div className="flex items-center space-x-3">
            {/* Persona Simulator */}
            <div className="hidden lg:flex items-center space-x-2 bg-slate-950/70 px-2.5 py-1 rounded-lg border border-slate-800">
              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-400">Role:</span>
              <select
                value={currentRole}
                onChange={(e) => onRoleChange(e.target.value as any)}
                className="bg-transparent text-xs text-amber-400 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="admin" className="bg-slate-900 text-white">Admin (Full Access)</option>
                <option value="support" className="bg-slate-900 text-white">Support Specialist (Read-only)</option>
                <option value="traveler" className="bg-slate-900 text-white">Traveler (Unauthorized)</option>
              </select>
            </div>

            {/* Refresh */}
            <button
              onClick={onRefresh}
              title="Refresh live metrics & queues"
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            {/* External Links */}
            <div className="flex items-center space-x-1">
              <a
                href="http://localhost:3000"
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-slate-700/60 transition"
              >
                <span>Traveler App</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
              <a
                href="http://localhost:3001"
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-slate-700/60 transition"
              >
                <span>Partner Portal</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
