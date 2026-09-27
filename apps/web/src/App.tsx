import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { api } from './api/client';
import { Navbar } from './components/Navbar';
import { AuthModal, AuthMode } from './components/AuthModal';
import { TripList } from './components/TripList';
import { TripTimeline } from './components/TripTimeline';
import { StorageDiscovery } from './components/StorageDiscovery';
import { MyStorageBookings } from './components/MyStorageBookings';
import { TransportDiscovery } from './components/TransportDiscovery';
import { MyTransportBookings } from './components/MyTransportBookings';
import { SplitFlapTicker } from './components/motion/SplitFlapTicker';
import {
  Luggage,
  MapPin,
  Car,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Shield,
  Clock,
  Sparkles,
  ExternalLink,
  Compass,
  Navigation,
} from 'lucide-react';

function Dashboard() {
  const { user, isAuthenticated, requestEmailVerification } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);

  // Active view management
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'trips' | 'storage' | 'transport' | 'bookings' | 'transport_bookings' | 'workbench'>('trips');
  const [storageSearchCoords, setStorageSearchCoords] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [transportSearchOrigin, setTransportSearchOrigin] = useState<{ lat: number; lng: number; label?: string } | undefined>(undefined);

  const [partnerIdInput, setPartnerIdInput] = useState('partner-acc-1');
  const [partnerStatusInput, setPartnerStatusInput] = useState<'pending' | 'verified' | 'suspended'>('verified');
  const [partnerNotesInput, setPartnerNotesInput] = useState('All compliance documents and IDs verified.');
  const [partnerStatusMsg, setPartnerStatusMsg] = useState<string | null>(null);
  const [partnerStatusLoading, setPartnerStatusLoading] = useState(false);

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleUpdatePartnerStatus = async () => {
    try {
      setPartnerStatusLoading(true);
      setPartnerStatusMsg(null);
      const res = await api.updatePartnerStatus(partnerIdInput, partnerStatusInput, partnerNotesInput);
      setPartnerStatusMsg(`Status transitioned to ${partnerStatusInput.toUpperCase()}! Notification sent.`);
    } catch (err: any) {
      setPartnerStatusMsg(`Failed: ${err.message}`);
    } finally {
      setPartnerStatusLoading(false);
      setTimeout(() => setPartnerStatusMsg(null), 5000);
    }
  };

  const handleSendVerification = async () => {
    try {
      const msg = await requestEmailVerification();
      setVerificationFeedback(msg);
    } catch (err: any) {
      setVerificationFeedback(err.message || 'Failed to dispatch verification email.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        onOpenAuth={openAuth}
        activeTab={activeTab === 'workbench' ? 'trips' : activeTab}
        onChangeTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'trips') setSelectedTripId(null);
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Unverified Email Warning Banner */}
        {isAuthenticated && user && !user.email_verified_at && (
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in">
            <div className="flex items-start space-x-3.5">
              <div className="p-2 bg-amber-100 text-amber-700 rounded-xl mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-900">Email Address Unverified</h4>
                <p className="text-xs text-amber-700 mt-0.5">
                  Verify your email <span className="font-semibold">{user.email}</span> to unlock all booking and partner features.
                </p>
                {verificationFeedback && (
                  <p className="text-xs font-semibold text-emerald-700 mt-1.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {verificationFeedback}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:self-center shrink-0">
              <button
                onClick={handleSendVerification}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
              >
                Send Verification Email
              </button>
              <button
                onClick={() => openAuth('verify')}
                className="px-3.5 py-2 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold rounded-xl transition-all"
              >
                Enter Token
              </button>
            </div>
          </div>
        )}

        {/* Hero Section for Guest or Overview */}
        {!isAuthenticated && (
          <div className="relative overflow-hidden bg-[#0B0F12] rounded-2xl text-white p-8 sm:p-12 shadow-2xl border border-[#263038]">
            {/* Background telemetry crosshair pattern */}
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(#E8ECF0 1px, transparent 1px), linear-gradient(to right, #263038 1px, transparent 1px)',
                backgroundSize: '24px 24px, 48px 48px',
              }}
            />

            <div className="relative z-10 max-w-3xl">
              {/* Terminal Wayfinding Stencil Badge */}
              <div className="inline-flex items-center space-x-2.5 bg-[#1E252B] border border-[#37444F] px-3.5 py-1.5 rounded-sm text-[11px] font-mono uppercase tracking-widest text-[#FF6B35] mb-6">
                <span className="w-2 h-2 rounded-full bg-[#FF6B35] animate-ping" />
                <span>TERMINAL WAYFINDING • ACTIVE TRANSIT CORRIDORS</span>
              </div>

              {/* Split-Flap Kinetic Departure Display */}
              <div className="mb-4">
                <div className="text-xs font-mono text-[#8C9BA8] uppercase tracking-wider mb-2">
                  DISPATCH MANIFEST //
                </div>
                <div className="bg-[#050709] border border-[#263038] p-3 sm:p-4 rounded-lg inline-block">
                  <SplitFlapTicker
                    value="UNBURDENED TRANSIT"
                    size="lg"
                    className="text-[#FF6B35]"
                  />
                </div>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-display text-[#E8ECF0] mb-4">
                Explore freely without luggage dragging you down.
              </h1>
              <p className="text-[#8C9BA8] text-sm sm:text-base leading-relaxed mb-8 max-w-2xl">
                Bridge itinerary arrival & departure gaps. Secure verified luggage lockers with Tyvek baggage claim stubs, orchestrate last-mile transit, and navigate cities without deadweight.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={() => openAuth('register')}
                  className="px-6 py-3.5 bg-[#FF6B35] hover:bg-[#E85D26] text-white font-mono font-bold text-xs uppercase tracking-wider rounded-sm shadow-md transition-all flex items-center space-x-2.5"
                >
                  <span>INITIALIZE ITINERARY</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openAuth('login')}
                  className="px-6 py-3.5 bg-[#1E252B] hover:bg-[#263038] text-[#E8ECF0] border border-[#37444F] font-mono font-semibold text-xs uppercase tracking-wider rounded-sm transition-all"
                >
                  STATION DEMO LOGINS
                </button>
              </div>

              {/* Wayfinding Telemetry Bar */}
              <div className="mt-10 pt-6 border-t border-[#263038] grid grid-cols-2 sm:grid-cols-3 gap-4 font-mono text-[11px] text-[#8C9BA8]">
                <div>
                  <span className="text-[#5A6874] block">TELEMETRY</span>
                  <span className="text-[#E8ECF0] font-semibold">142 SECURE NODES</span>
                </div>
                <div>
                  <span className="text-[#5A6874] block">HANDS-FREE DISPATCH</span>
                  <span className="text-[#74D680] font-semibold">ONLINE & READY</span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[#5A6874] block">PAYMENT AUDIT</span>
                  <span className="text-[#FF6B35] font-semibold">TYVEK SERIALIZED</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* If Authenticated: Active Section */}
        {isAuthenticated && (
          <div className="space-y-6">
            {/* Top Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-300 pb-3 font-mono">
              <button
                onClick={() => {
                  setActiveTab('trips');
                  setSelectedTripId(null);
                }}
                className={`px-3.5 py-2 text-xs uppercase tracking-wider transition-all flex items-center space-x-2 border-b-2 ${
                  activeTab === 'trips' && !selectedTripId
                    ? 'border-[#FF6B35] bg-[#0B0F12] text-[#E8ECF0] font-bold shadow-xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-semibold'
                }`}
              >
                <span className="text-[10px] text-[#FF6B35]">01/</span>
                <Calendar className="w-3.5 h-3.5" />
                <span>Itinerary & Gaps</span>
              </button>

              <button
                onClick={() => setActiveTab('storage')}
                className={`px-3.5 py-2 text-xs uppercase tracking-wider transition-all flex items-center space-x-2 border-b-2 ${
                  activeTab === 'storage'
                    ? 'border-[#FF6B35] bg-[#0B0F12] text-[#E8ECF0] font-bold shadow-xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-semibold'
                }`}
              >
                <span className="text-[10px] text-[#FF6B35]">02/</span>
                <Luggage className="w-3.5 h-3.5" />
                <span>Storage Hubs</span>
              </button>

              <button
                onClick={() => setActiveTab('transport')}
                className={`px-3.5 py-2 text-xs uppercase tracking-wider transition-all flex items-center space-x-2 border-b-2 ${
                  activeTab === 'transport'
                    ? 'border-[#FF6B35] bg-[#0B0F12] text-[#E8ECF0] font-bold shadow-xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-semibold'
                }`}
              >
                <span className="text-[10px] text-[#FF6B35]">03/</span>
                <Navigation className="w-3.5 h-3.5" />
                <span>Transit Corridors</span>
              </button>

              <button
                onClick={() => setActiveTab('bookings')}
                className={`px-3.5 py-2 text-xs uppercase tracking-wider transition-all flex items-center space-x-2 border-b-2 ${
                  activeTab === 'bookings'
                    ? 'border-[#FF6B35] bg-[#0B0F12] text-[#E8ECF0] font-bold shadow-xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-semibold'
                }`}
              >
                <span className="text-[10px] text-[#FF6B35]">04/</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Luggage Passes</span>
              </button>

              <button
                onClick={() => setActiveTab('transport_bookings')}
                className={`px-3.5 py-2 text-xs uppercase tracking-wider transition-all flex items-center space-x-2 border-b-2 ${
                  activeTab === 'transport_bookings'
                    ? 'border-[#FF6B35] bg-[#0B0F12] text-[#E8ECF0] font-bold shadow-xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-semibold'
                }`}
              >
                <span className="text-[10px] text-[#FF6B35]">05/</span>
                <Car className="w-3.5 h-3.5" />
                <span>Transit Log</span>
              </button>

              <button
                onClick={() => setActiveTab('workbench')}
                className={`px-3.5 py-2 text-xs uppercase tracking-wider transition-all flex items-center space-x-2 border-b-2 ${
                  activeTab === 'workbench'
                    ? 'border-[#FF6B35] bg-[#0B0F12] text-[#E8ECF0] font-bold shadow-xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-semibold'
                }`}
              >
                <span className="text-[10px] text-[#FF6B35]">06/</span>
                <Shield className="w-3.5 h-3.5" />
                <span>Session & Roles</span>
              </button>
            </div>

            {/* TAB CONTENT: TRIPS & TIMELINE */}
            {activeTab === 'trips' && (
              <div>
                {selectedTripId ? (
                  <TripTimeline
                    tripId={selectedTripId}
                    onBack={() => setSelectedTripId(null)}
                    onFindStorage={(loc) => {
                      setStorageSearchCoords({ lat: loc.lat, lng: loc.lng });
                      setActiveTab('storage');
                    }}
                    onFindTransport={(loc) => {
                      setTransportSearchOrigin({
                        lat: loc.lat,
                        lng: loc.lng,
                        label: loc.address || 'Itinerary Point',
                      });
                      setActiveTab('transport');
                    }}
                  />
                ) : (
                  <TripList onSelectTrip={(id) => setSelectedTripId(id)} />
                )}
              </div>
            )}

            {/* TAB CONTENT: STORAGE DISCOVERY */}
            {activeTab === 'storage' && (
              <StorageDiscovery
                initialCoordinates={storageSearchCoords}
                tripId={selectedTripId || undefined}
              />
            )}

            {/* TAB CONTENT: TRANSPORT DISCOVERY */}
            {activeTab === 'transport' && (
              <TransportDiscovery
                initialOrigin={transportSearchOrigin}
                tripId={selectedTripId || undefined}
                onBookingSuccess={() => setActiveTab('transport_bookings')}
              />
            )}

            {/* TAB CONTENT: MY STORAGE BOOKINGS */}
            {activeTab === 'bookings' && <MyStorageBookings />}

            {/* TAB CONTENT: MY TRANSPORT BOOKINGS */}
            {activeTab === 'transport_bookings' && <MyTransportBookings />}

            {/* TAB CONTENT: SESSION WORKBENCH */}
            {activeTab === 'workbench' && user && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Current User Session</h3>
                    <p className="text-xs text-slate-500">Live authentication details decoded from JWT access token</p>
                  </div>
                  <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                    ID: {user.id.slice(0, 8)}...
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Full Name</span>
                    <span className="font-semibold text-slate-900 text-sm mt-0.5 block">{user.full_name}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Email Address</span>
                    <span className="font-semibold text-slate-900 text-sm mt-0.5 block">{user.email}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Assigned Role</span>
                    <span className="font-semibold uppercase tracking-wider text-[#FF6B35] text-xs mt-1 block">
                      {user.role}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Verification State</span>
                    <span className={`font-semibold text-xs mt-1 block ${user.email_verified_at ? 'text-emerald-600' : 'text-[#F2C94C]'}`}>
                      {user.email_verified_at ? '✓ VERIFIED' : '⚠ UNVERIFIED'}
                    </span>
                  </div>
                </div>

                {/* Portal Deep Links */}
                {(user.role === 'partner_storage' || user.role === 'partner_transport' || user.role === 'admin') && (
                  <div className="pt-2 flex flex-wrap gap-3 font-mono">
                    {(user.role === 'partner_storage' || user.role === 'partner_transport') && (
                      <a
                        href="http://localhost:3001"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1.5 text-xs font-semibold bg-[#1E3A34]/10 text-[#1E3A34] hover:bg-[#1E3A34]/20 px-3.5 py-2 rounded-sm border border-[#1E3A34]/30"
                      >
                        <span>Open Partner Portal (:3001)</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {user.role === 'admin' && (
                      <a
                        href="http://localhost:3002"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1.5 text-xs font-semibold bg-amber-50 text-amber-900 hover:bg-amber-100 px-3.5 py-2 rounded-sm border border-amber-300"
                      >
                        <span>Open Admin Console (:3002)</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                )}

                {/* Module 4.8 Partner Status & Notification Sandbox */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="bg-[#0B0F12] text-white rounded-lg p-5 border border-[#263038] space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 bg-[#1E252B] border border-[#37444F] rounded-sm text-[#FF6B35]">
                          <Shield className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-mono font-bold text-[#E8ECF0]">
                            PARTNER VERIFICATION TELEMETRY TRIGGER (MOD 4.8)
                          </h4>
                          <p className="text-xs text-[#8C9BA8]">
                            Updates partner verification status, logs audit event, and dispatches data-driven <code className="font-mono text-[#F2C94C]">PARTNER_STATUS_CHANGED</code> notification.
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono uppercase bg-[#1E252B] text-[#FF6B35] px-2 py-0.5 rounded-sm border border-[#37444F]">
                        Admin / Dev Action
                      </span>
                    </div>

                    {partnerStatusMsg && (
                      <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-sm text-xs text-emerald-300 flex items-center gap-2 font-mono">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{partnerStatusMsg}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                      <div>
                        <label className="block text-[10px] font-semibold text-[#8C9BA8] mb-1 uppercase tracking-wider">
                          Partner Account ID
                        </label>
                        <input
                          type="text"
                          value={partnerIdInput}
                          onChange={(e) => setPartnerIdInput(e.target.value)}
                          className="w-full bg-[#1E252B] border border-[#37444F] rounded-sm px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#FF6B35]"
                          placeholder="partner-acc-1"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-[#8C9BA8] mb-1 uppercase tracking-wider">
                          New Status
                        </label>
                        <select
                          value={partnerStatusInput}
                          onChange={(e) => setPartnerStatusInput(e.target.value as any)}
                          className="w-full bg-[#1E252B] border border-[#37444F] rounded-sm px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#FF6B35]"
                        >
                          <option value="verified">Verified (Approved)</option>
                          <option value="pending">Pending Review</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-[#8C9BA8] mb-1 uppercase tracking-wider">
                          Verification Notes
                        </label>
                        <input
                          type="text"
                          value={partnerNotesInput}
                          onChange={(e) => setPartnerNotesInput(e.target.value)}
                          className="w-full bg-[#1E252B] border border-[#37444F] rounded-sm px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#FF6B35]"
                          placeholder="e.g. Identity and insurance verified"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 font-mono">
                      <p className="text-[11px] text-[#8C9BA8]">
                        Check the notification bell in the top navbar to see the rendered notification.
                      </p>
                      <button
                        onClick={handleUpdatePartnerStatus}
                        disabled={partnerStatusLoading}
                        className="px-4 py-2 bg-[#FF6B35] hover:bg-[#E85D26] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-sm shadow-xs transition-all flex items-center space-x-1.5"
                      >
                        {partnerStatusLoading ? (
                          <span>Updating...</span>
                        ) : (
                          <>
                            <Shield className="w-3.5 h-3.5" />
                            <span>Update & Trigger Notification</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Feature Cards Grid: Tactile Transit Instrument Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#FAF9F5] p-6 rounded-lg border border-[#D5D2C7] shadow-xs relative overflow-hidden group hover:border-[#FF6B35] transition-all">
            <div className="text-[10px] font-mono text-[#8C9BA8] uppercase tracking-widest mb-3 flex items-center justify-between">
              <span>FACILITY // 01</span>
              <span className="text-[#FF6B35] font-bold">ONLINE</span>
            </div>
            <div className="w-10 h-10 bg-[#FF6B35]/10 text-[#FF6B35] border border-[#FF6B35]/20 rounded-sm flex items-center justify-center mb-4">
              <Luggage className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-slate-900 text-base mb-1">Luggage Storage Discovery</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Find verified lockers and partner storage points near stations, landmarks, and airports. Real-time capacity check, split-flap rates, and Tyvek baggage pass confirmation.
            </p>
          </div>

          <div className="bg-[#FAF9F5] p-6 rounded-lg border border-[#D5D2C7] shadow-xs relative overflow-hidden group hover:border-[#1E3A34] transition-all">
            <div className="text-[10px] font-mono text-[#8C9BA8] uppercase tracking-widest mb-3 flex items-center justify-between">
              <span>CHRONO // 02</span>
              <span className="text-[#1E3A34] font-bold">ANALYZER</span>
            </div>
            <div className="w-10 h-10 bg-[#1E3A34]/10 text-[#1E3A34] border border-[#1E3A34]/20 rounded-sm flex items-center justify-center mb-4">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-slate-900 text-base mb-1">Itinerary Gap Detection</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Automatic analysis of check-in / check-out gaps in your trip timeline. Prompts you with storage recommendations right when and where you need them.
            </p>
          </div>

          <div className="bg-[#FAF9F5] p-6 rounded-lg border border-[#D5D2C7] shadow-xs relative overflow-hidden group hover:border-[#F2C94C] transition-all">
            <div className="text-[10px] font-mono text-[#8C9BA8] uppercase tracking-widest mb-3 flex items-center justify-between">
              <span>DISPATCH // 03</span>
              <span className="text-[#8F6B00] font-bold">MULTI-MODAL</span>
            </div>
            <div className="w-10 h-10 bg-[#F2C94C]/20 text-[#8F6B00] border border-[#F2C94C]/40 rounded-sm flex items-center justify-center mb-4">
              <Car className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-slate-900 text-base mb-1">Last-Mile Transit Quotes</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Integrated multi-modal quotes: public transit routes, licensed city taxis, rideshare deep links, and micro-mobility bike shares.
            </p>
          </div>
        </div>
      </main>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
}
