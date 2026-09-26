import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { MetricsDashboardTab } from './components/MetricsDashboardTab';
import { PartnerVerificationTab } from './components/PartnerVerificationTab';
import { BookingLookupTab } from './components/BookingLookupTab';
import { AuditLogViewerTab } from './components/AuditLogViewerTab';
import { adminApi, AdminMetrics, AdminPartner, AdminBooking, AdminAuditEvent } from './api/client';
import { ShieldAlert, Lock, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'metrics' | 'partners' | 'bookings' | 'audit'>('metrics');
  const [currentRole, setCurrentRole] = useState<'admin' | 'support' | 'traveler'>('admin');

  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [partners, setPartners] = useState<AdminPartner[]>([]);
  const [partnerCounts, setPartnerCounts] = useState({
    pending: 0,
    verified: 0,
    suspended: 0,
    total: 0,
  });
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [auditEvents, setAuditEvents] = useState<AdminAuditEvent[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const [metricsData, partnersData, bookingsData, auditData] = await Promise.all([
        adminApi.getMetrics(),
        adminApi.getPartners('all'),
        adminApi.lookupBookings(),
        adminApi.getAuditLogs({}),
      ]);

      setMetrics(metricsData);
      setPartners(partnersData.items);
      setPartnerCounts(partnersData.counts);
      setBookings(bookingsData);
      setAuditEvents(auditData.events);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePartnerUpdated = async () => {
    showToast('Partner status updated and notification dispatched.');
    await loadData();
  };

  const handleBookingSearch = async (query: string, status?: string, type?: string) => {
    setIsRefreshing(true);
    try {
      const results = await adminApi.lookupBookings(query, status, type);
      setBookings(results);
    } catch (err) {
      console.error('Error searching bookings:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAuditFilterChange = async (filters: { action?: string; entityType?: string; search?: string }) => {
    setIsRefreshing(true);
    try {
      const res = await adminApi.getAuditLogs(filters);
      setAuditEvents(res.events);
    } catch (err) {
      console.error('Error filtering audit events:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Global Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        pendingPartnerCount={partnerCounts.pending}
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        onRefresh={loadData}
        isRefreshing={isRefreshing}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Role Gating Simulation Warning */}
        {currentRole === 'traveler' ? (
          <div className="max-w-md mx-auto my-12 p-8 bg-slate-900 rounded-3xl border border-rose-500/30 text-center shadow-2xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">403 Forbidden: Staff Access Required</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your active persona role is set to <strong>Traveler</strong>. Access to metrics, partner verification records, customer lookups, and audit trails is strictly restricted to platform administrators and operational support staff.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setCurrentRole('admin')}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition"
              >
                Switch back to Admin Persona
              </button>
            </div>
          </div>
        ) : (
          <>
            {currentTab === 'metrics' && (
              <MetricsDashboardTab
                metrics={metrics}
                onNavigateToPartners={() => setCurrentTab('partners')}
                onNavigateToBookings={() => setCurrentTab('bookings')}
              />
            )}

            {currentTab === 'partners' && (
              <PartnerVerificationTab
                partners={partners}
                counts={partnerCounts}
                onPartnerUpdated={handlePartnerUpdated}
                currentRole={currentRole}
              />
            )}

            {currentTab === 'bookings' && (
              <BookingLookupTab
                bookings={bookings}
                onSearch={handleBookingSearch}
                isSearching={isRefreshing}
              />
            )}

            {currentTab === 'audit' && (
              <AuditLogViewerTab
                events={auditEvents}
                onFilterChange={handleAuditFilterChange}
                isLoading={isRefreshing}
              />
            )}
          </>
        )}
      </main>

      {/* Floating Toast Notice */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2 bg-emerald-950 border border-emerald-500/40 text-emerald-200 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
