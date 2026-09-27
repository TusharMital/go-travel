import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Compass, ShieldCheck, User as UserIcon, LogOut, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
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
        return <span className="bg-[#1C242A] text-signal text-[10px] font-mono font-bold px-2 py-0.5 rounded-[2px] border border-[#263038]">SYS:ADMIN</span>;
      case 'support':
        return <span className="bg-[#1C242A] text-signal text-[10px] font-mono font-bold px-2 py-0.5 rounded-[2px] border border-[#263038]">SYS:SUPPORT</span>;
      case 'partner_storage':
        return <span className="bg-[#0E1F1B] text-concourse-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded-[2px] border border-concourse-500">STORAGE PARTNER</span>;
      case 'partner_transport':
        return <span className="bg-[#141A20] text-cargo-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded-[2px] border border-cargo-500">TRANSIT PARTNER</span>;
      default:
        return <span className="bg-[#141A20] text-[#718096] text-[10px] font-mono font-bold px-2 py-0.5 rounded-[2px] border border-[#263038]">TRAVELER</span>;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0B0F12]/95 backdrop-blur-md border-b border-[#263038] select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Tabs */}
        <div className="flex items-center space-x-6">
          <div
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => onChangeTab?.('trips')}
          >
            <div className="w-9 h-9 bg-[#141A20] border border-[#263038] group-hover:border-cargo-500 rounded-[3px] flex items-center justify-center text-cargo-500 shadow-sm transition-colors">
              <Compass className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
            </div>
            <div>
              <div className="font-display font-black text-[#E8ECF0] tracking-tight text-base flex items-center space-x-2">
                <span>TRAVELSYNC</span>
                <span className="text-[9px] font-mono font-bold tracking-widest bg-[#1C242A] text-signal px-1.5 py-0.2 rounded-[2px] border border-[#263038]">
                  v1.2
                </span>
              </div>
              <p className="text-[10px] font-mono text-[#718096] -mt-0.5">
                WAYFINDING // LOCKERS // TRANSIT
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          {onChangeTab && (
            <nav className="hidden lg:flex items-center space-x-1 bg-[#141A20] p-1 rounded-[3px] border border-[#263038] font-mono text-xs">
              <button
                onClick={() => onChangeTab('trips')}
                className={`px-3 py-1 font-bold rounded-[2px] transition-all ${
                  activeTab === 'trips'
                    ? 'bg-cargo-500 text-white shadow-cargo-glow'
                    : 'text-[#718096] hover:text-[#E8ECF0]'
                }`}
              >
                01/ TRIPS
              </button>
              <button
                onClick={() => onChangeTab('storage')}
                className={`px-3 py-1 font-bold rounded-[2px] transition-all ${
                  activeTab === 'storage'
                    ? 'bg-cargo-500 text-white shadow-cargo-glow'
                    : 'text-[#718096] hover:text-[#E8ECF0]'
                }`}
              >
                02/ STORAGE
              </button>
              <button
                onClick={() => onChangeTab('transport')}
                className={`px-3 py-1 font-bold rounded-[2px] transition-all ${
                  activeTab === 'transport'
                    ? 'bg-cargo-500 text-white shadow-cargo-glow'
                    : 'text-[#718096] hover:text-[#E8ECF0]'
                }`}
              >
                03/ TRANSIT
              </button>
              <button
                onClick={() => onChangeTab('bookings')}
                className={`px-3 py-1 font-bold rounded-[2px] transition-all ${
                  activeTab === 'bookings'
                    ? 'bg-cargo-500 text-white shadow-cargo-glow'
                    : 'text-[#718096] hover:text-[#E8ECF0]'
                }`}
              >
                04/ CLAIM PASSES
              </button>
              <button
                onClick={() => onChangeTab('transport_bookings')}
                className={`px-3 py-1 font-bold rounded-[2px] transition-all ${
                  activeTab === 'transport_bookings'
                    ? 'bg-cargo-500 text-white shadow-cargo-glow'
                    : 'text-[#718096] hover:text-[#E8ECF0]'
                }`}
              >
                05/ RIDES
              </button>
            </nav>
          )}
        </div>

        {/* Navigation & Auth */}
        <div className="flex items-center space-x-4">
          {isAuthenticated && user ? (
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex flex-col items-end text-right font-mono">
                <span className="text-xs font-bold text-[#E8ECF0] flex items-center gap-1.5">
                  {user.full_name}
                  {user.email_verified_at ? (
                    <span title="Verified Account">
                      <CheckCircle2 className="w-3.5 h-3.5 text-concourse-400" />
                    </span>
                  ) : (
                    <span title="Unverified Email">
                      <AlertCircle className="w-3.5 h-3.5 text-signal" />
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-[#718096]">{user.email}</span>
              </div>

              {getRoleBadge(user.role)}

              {(user.role === 'partner_storage' || user.role === 'partner_transport') && (
                <a
                  href="http://localhost:3001"
                  target="_blank"
                  rel="noreferrer"
                  className="hidden sm:inline-flex items-center space-x-1.5 text-[11px] font-mono font-bold px-2.5 py-1 rounded-[2px] bg-[#0E1F1B] text-concourse-400 border border-concourse-500 hover:bg-[#142924] transition-colors"
                  title="Open Partner Portal (:3001)"
                >
                  <span>PORTAL :3001</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}

              {(user.role === 'admin' || user.role === 'support') && (
                <a
                  href="http://localhost:3002"
                  target="_blank"
                  rel="noreferrer"
                  className="hidden sm:inline-flex items-center space-x-1.5 text-[11px] font-mono font-bold px-2.5 py-1 rounded-[2px] bg-[#1C242A] text-signal border border-[#263038] hover:border-signal transition-colors"
                  title="Open Admin Console (:3002)"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-signal" />
                  <span>ADMIN :3002</span>
                </a>
              )}

              <NotificationsPopover />

              <button
                onClick={logout}
                className="p-1.5 text-[#718096] hover:text-rose-400 hover:bg-[#1C242A] rounded-[3px] transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2 font-mono">
              <button
                onClick={() => onOpenAuth('login')}
                className="text-xs font-bold text-[#718096] hover:text-[#E8ECF0] px-3 py-1.5 rounded-[2px] transition-colors"
              >
                SIGN IN
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="text-xs font-bold bg-cargo-500 text-white hover:bg-cargo-600 px-3.5 py-1.5 rounded-[2px] shadow-cargo-glow transition-all active:scale-95"
              >
                CREATE ACCOUNT
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
