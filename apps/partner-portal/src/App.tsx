import React, { useState, useEffect } from 'react';
import { partnerApi, PartnerProfile } from './api/client';
import { Navbar } from './components/Navbar';
import { OnboardingForm } from './components/OnboardingForm';
import { PendingVerification } from './components/PendingVerification';
import { LocationsInventoryTab } from './components/LocationsInventoryTab';
import { BookingsManagementTab } from './components/BookingsManagementTab';
import { PayoutSummaryTab } from './components/PayoutSummaryTab';
import {
  Building2,
  Luggage,
  Calendar,
  CreditCard,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export default function App() {
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'locations' | 'bookings' | 'payouts'>('locations');

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await partnerApi.getProfile();
      setProfile(res);
    } catch (err: any) {
      console.warn('Failed to load partner profile:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSwitchDemoScenario = (scenario: 'verified_storage' | 'pending' | 'unregistered') => {
    partnerApi.switchDemoMode(scenario);
    fetchProfile();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        profile={profile}
        onSwitchMode={handleSwitchDemoScenario}
        activeTab={activeTab}
        onChangeTab={(t) => setActiveTab(t as any)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">Loading partner workspace...</p>
          </div>
        ) : !profile || profile.status === 'unregistered' ? (
          /* STEP 1: Onboarding Form */
          <OnboardingForm onSuccess={fetchProfile} />
        ) : profile.status === 'pending' ? (
          /* STEP 2: Pending Verification Review Screen */
          <PendingVerification profile={profile} onApproved={fetchProfile} />
        ) : (
          /* STEP 3: After Admin Approval - Full Operations Dashboard */
          <div className="space-y-6">
            {/* Top Partner Overview Banner */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
              <div className="space-y-1.5">
                <div className="inline-flex items-center space-x-2 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-xs font-semibold text-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Approved & Verified Operator</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {profile.storage_provider?.business_name ||
                    profile.transport_provider?.name ||
                    'Partner Operations Hub'}
                </h1>
                <p className="text-slate-300 text-xs sm:text-sm">
                  Partner ID: <code className="font-mono text-emerald-400">{profile.id}</code> • Service: <strong className="capitalize">{profile.type}</strong>
                </p>
              </div>

              {/* Quick Tab Buttons for Mobile or In-Page Switch */}
              <div className="flex flex-wrap gap-2 md:self-center">
                <button
                  onClick={() => setActiveTab('locations')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'locations'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                  }`}
                >
                  Locations & Inventory
                </button>
                <button
                  onClick={() => setActiveTab('bookings')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'bookings'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                  }`}
                >
                  Bookings & Check-in
                </button>
                <button
                  onClick={() => setActiveTab('payouts')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'payouts'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                  }`}
                >
                  Payout Summary
                </button>
              </div>
            </div>

            {/* TAB CONTENTS */}
            {activeTab === 'locations' && <LocationsInventoryTab />}
            {activeTab === 'bookings' && <BookingsManagementTab />}
            {activeTab === 'payouts' && <PayoutSummaryTab />}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 TravelSync Platform Inc. All rights reserved. Partner Portal (Module 4.9).</p>
          <div className="flex items-center space-x-4">
            <a
              href="http://localhost:3000"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-700 hover:underline flex items-center gap-1 font-semibold"
            >
              <span>Traveler Web App (:3000)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="http://localhost:3002"
              target="_blank"
              rel="noreferrer"
              className="text-slate-600 hover:underline flex items-center gap-1 font-semibold"
            >
              <span>Admin Console (:3002)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
