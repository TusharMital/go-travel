import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AuthModal, AuthMode } from './components/AuthModal';
import { TripList } from './components/TripList';
import { TripTimeline } from './components/TripTimeline';
import { StorageDiscovery } from './components/StorageDiscovery';
import { MyStorageBookings } from './components/MyStorageBookings';
import { TransportDiscovery } from './components/TransportDiscovery';
import { MyTransportBookings } from './components/MyTransportBookings';
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

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthModalOpen(true);
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
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl text-white p-8 sm:p-12 shadow-2xl border border-slate-800">
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center space-x-2 bg-indigo-500/20 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-semibold text-indigo-300 mb-6">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Unified Travel Workflow</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-white mb-4">
                Explore freely without luggage dragging you down.
              </h1>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-8">
                Bridge itinerary arrival & departure gaps. Discover verified secure luggage storage lockers, book last-mile transit, and navigate seamlessly in one place.
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => openAuth('register')}
                  className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-2"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openAuth('login')}
                  className="px-6 py-3.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 font-semibold text-sm rounded-xl transition-all"
                >
                  Demo Quick Logins
                </button>
              </div>
            </div>
          </div>
        )}

        {/* If Authenticated: Active Section */}
        {isAuthenticated && (
          <div className="space-y-6">
            {/* Top Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
              <button
                onClick={() => {
                  setActiveTab('trips');
                  setSelectedTripId(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                  activeTab === 'trips' && !selectedTripId
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>My Trips & Gaps</span>
              </button>

              <button
                onClick={() => setActiveTab('storage')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                  activeTab === 'storage'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Luggage className="w-3.5 h-3.5" />
                <span>Find Luggage Storage</span>
              </button>

              <button
                onClick={() => setActiveTab('transport')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                  activeTab === 'transport'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Find Transport</span>
              </button>

              <button
                onClick={() => setActiveTab('bookings')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                  activeTab === 'bookings'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Storage Bookings</span>
              </button>

              <button
                onClick={() => setActiveTab('transport_bookings')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                  activeTab === 'transport_bookings'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                <span>My Rides</span>
              </button>

              <button
                onClick={() => setActiveTab('workbench')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                  activeTab === 'workbench'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
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

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-slate-400 block font-medium">Full Name</span>
                    <span className="font-semibold text-slate-900 text-sm mt-0.5 block">{user.full_name}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-slate-400 block font-medium">Email Address</span>
                    <span className="font-semibold text-slate-900 text-sm mt-0.5 block">{user.email}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-slate-400 block font-medium">Assigned Role</span>
                    <span className="font-semibold uppercase tracking-wider text-indigo-600 text-xs mt-1 block">
                      {user.role}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-slate-400 block font-medium">Verification State</span>
                    <span className={`font-semibold text-xs mt-1 block ${user.email_verified_at ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {user.email_verified_at ? '✓ Verified' : '⚠ Unverified'}
                    </span>
                  </div>
                </div>

                {/* Portal Deep Links */}
                {(user.role === 'partner_storage' || user.role === 'partner_transport' || user.role === 'admin') && (
                  <div className="pt-2 flex flex-wrap gap-3">
                    {(user.role === 'partner_storage' || user.role === 'partner_transport') && (
                      <a
                        href="http://localhost:3001"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3.5 py-2 rounded-xl border border-emerald-200"
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
                        className="inline-flex items-center space-x-1.5 text-xs font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 px-3.5 py-2 rounded-xl border border-amber-200"
                      >
                        <span>Open Admin Console (:3002)</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 font-bold">
              <Luggage className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Luggage Storage Discovery</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Find verified lockers and partner storage points near stations, landmarks, and airports. Real-time capacity check and instant confirmation.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4 font-bold">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Itinerary Gap Detection</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Automatic analysis of check-in / check-out gaps in your trip timeline. Prompts you with storage recommendations right when you need them.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 font-bold">
              <Car className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Last-Mile Transport Quotes</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Integrated multi-modal quotes: public transit, licensed city taxis, rideshare deep links, and micro-mobility bike shares.
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
