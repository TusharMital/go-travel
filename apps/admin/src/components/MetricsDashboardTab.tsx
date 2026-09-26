import React from 'react';
import {
  CalendarDays,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Briefcase,
  Luggage,
  Car,
  CheckCircle2,
  Clock,
  ArrowRight,
  Database,
} from 'lucide-react';
import { AdminMetrics } from '../api/client';

interface MetricsDashboardTabProps {
  metrics: AdminMetrics | null;
  onNavigateToPartners: () => void;
  onNavigateToBookings: () => void;
}

export const MetricsDashboardTab: React.FC<MetricsDashboardTabProps> = ({
  metrics,
  onNavigateToPartners,
  onNavigateToBookings,
}) => {
  if (!metrics) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center text-slate-400">Loading live platform metrics...</div>
      </div>
    );
  }

  // Determine health color for cancellation rate
  const cancellationStatus =
    metrics.cancellationRate <= 10
      ? { label: 'Optimal (<10%)', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' }
      : metrics.cancellationRate <= 20
      ? { label: 'Moderate (10-20%)', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' }
      : { label: 'Elevated (>20%)', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      <div className="flex items-center justify-between p-4 bg-slate-900/80 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Live Platform Aggregates (Real Data Computation)</h2>
            <p className="text-xs text-slate-400">
              Computed in real time directly from PostgreSQL bookings, payments, and trip itinerary tables.
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400">Database Engine:</span>{' '}
          <span className="text-xs font-mono font-bold text-emerald-400">Prisma ORM & PostgreSQL</span>
        </div>
      </div>

      {/* KPI 4-Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Bookings Today */}
        <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Bookings Today</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <CalendarDays className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {metrics.bookingsToday}
            </div>
            <div className="flex items-center space-x-2 mt-2 text-xs text-slate-400">
              <span className="inline-flex items-center text-blue-400 font-medium">
                <Luggage className="w-3.5 h-3.5 mr-1" />
                {metrics.storageBookingsToday} Storage
              </span>
              <span>•</span>
              <span className="inline-flex items-center text-indigo-400 font-medium">
                <Car className="w-3.5 h-3.5 mr-1" />
                {metrics.transportBookingsToday} Transport
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Total Bookings:</span>
            <span className="font-semibold text-white">{metrics.totalBookings} lifetime</span>
          </div>
        </div>

        {/* Card 2: Conversion Rate */}
        <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Conversion Rate</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {metrics.conversionRate}%
            </div>
            <div className="mt-2 text-xs text-slate-400">
              <span>{metrics.tripsWithBookings} of {metrics.totalTrips || metrics.totalBookings} trips booked</span>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, metrics.conversionRate)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
              <span>Planned Itinerary</span>
              <span>Confirmed Booking</span>
            </div>
          </div>
        </div>

        {/* Card 3: Cancellation Rate */}
        <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Cancellation Rate</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {metrics.cancellationRate}%
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${cancellationStatus.color}`}>
                {cancellationStatus.label}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Cancelled Bookings:</span>
            <span className="font-semibold text-rose-400">{metrics.cancelledBookings} cancelled</span>
          </div>
        </div>

        {/* Card 4: Platform Gross Revenue */}
        <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Platform GMV</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white tracking-tight">
              ${metrics.totalRevenue.toFixed(2)}
            </div>
            <div className="mt-2 text-xs text-slate-400">
              <span className="text-amber-400 font-semibold">${metrics.revenueToday.toFixed(2)}</span> volume today
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Captured Payments:</span>
            <span className="font-semibold text-emerald-400">{metrics.confirmedBookings} settled</span>
          </div>
        </div>
      </div>

      {/* Two-Column Middle Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Verification Backlog CTA Card */}
        <div className="lg:col-span-1 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 rounded-2xl p-6 border border-amber-500/20 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <Clock className="w-4 h-4" />
              <span>Partner Review Backlog</span>
            </div>
            <div className="mt-4">
              <span className="text-4xl font-extrabold text-white">{metrics.partners.pending}</span>
              <span className="text-slate-400 text-sm ml-2">applications pending evaluation</span>
            </div>
            <p className="mt-3 text-xs text-slate-400 leading-relaxed">
              New storage locations and transport fleet operators awaiting compliance evaluation and license validation before activation.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <button
              onClick={onNavigateToPartners}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition"
            >
              <span>Open Verification Queue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Platform Volume Breakdown */}
        <div className="lg:col-span-2 bg-slate-900/90 rounded-2xl p-6 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Service Volume & Fulfillment Breakdown</h3>
              <p className="text-xs text-slate-400">Real-time split across luggage hubs and transit transport</p>
            </div>
            <button
              onClick={onNavigateToBookings}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center space-x-1"
            >
              <span>Inspect Bookings</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Luggage className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-lg font-bold text-white">{metrics.storageBookingsCount}</div>
                  <div className="text-xs text-slate-400">Luggage Storage Reservations</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>Today's Drop-offs:</span>
                <span className="font-semibold text-white">{metrics.storageBookingsToday}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-lg font-bold text-white">{metrics.transportBookingsCount}</div>
                  <div className="text-xs text-slate-400">Transport & Ride Transfers</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>Today's Rides:</span>
                <span className="font-semibold text-white">{metrics.transportBookingsToday}</span>
              </div>
            </div>
          </div>

          {/* Partner Status Summary Row */}
          <div className="mt-4 p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-slate-400">
              <Briefcase className="w-4 h-4 text-slate-500" />
              <span>Partner Ecosystem:</span>
              <span className="font-semibold text-white">{metrics.partners.total} Registered</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-emerald-400 font-semibold">{metrics.partners.verified} Active</span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">{metrics.partners.pending} In Review</span>
              <span>•</span>
              <span className="text-rose-400 font-semibold">{metrics.partners.suspended} Suspended</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
