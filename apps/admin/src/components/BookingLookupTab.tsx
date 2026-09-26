import React, { useState } from 'react';
import {
  Search,
  Luggage,
  Car,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  User,
  MapPin,
  FileText,
  Calendar,
  Shield,
  Layers,
  ExternalLink,
} from 'lucide-react';
import { AdminBooking, adminApi } from '../api/client';

interface BookingLookupTabProps {
  bookings: AdminBooking[];
  onSearch: (query: string, status?: string, type?: string) => void;
  isSearching?: boolean;
}

export const BookingLookupTab: React.FC<BookingLookupTabProps> = ({
  bookings,
  onSearch,
  isSearching,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Inspection drawer state
  const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(null);
  const [bookingDetail, setBookingDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery, statusFilter, typeFilter);
  };

  const handleInspectBooking = async (booking: AdminBooking) => {
    setSelectedBooking(booking);
    setLoadingDetail(true);
    try {
      const type = booking.type === 'STORAGE' ? 'storage' : 'transport';
      const detail = await adminApi.getBookingDetail(type, booking.id);
      setBookingDetail(detail);
    } catch {
      setBookingDetail({ booking, auditLogs: [], payments: [] });
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header Form */}
      <form
        onSubmit={handleSearchSubmit}
        className="p-5 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl space-y-4"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Booking ID (e.g. storage-bk-101) or Customer Email (e.g. elena@travel.org)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <button
            type="submit"
            disabled={isSearching}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition flex items-center justify-center space-x-1.5"
          >
            <Search className="w-4 h-4" />
            <span>{isSearching ? 'Searching...' : 'Lookup Booking'}</span>
          </button>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Service:</span>
            <button
              type="button"
              onClick={() => {
                setTypeFilter('all');
                onSearch(searchQuery, statusFilter, 'all');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                typeFilter === 'all' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              All Types
            </button>
            <button
              type="button"
              onClick={() => {
                setTypeFilter('storage');
                onSearch(searchQuery, statusFilter, 'storage');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 ${
                typeFilter === 'storage' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <Luggage className="w-3.5 h-3.5" />
              <span>Storage</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTypeFilter('transport');
                onSearch(searchQuery, statusFilter, 'transport');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 ${
                typeFilter === 'transport' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Transport</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Status:</span>
            {['all', 'confirmed', 'checked_in', 'checked_out', 'cancelled'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setStatusFilter(st);
                  onSearch(searchQuery, st, typeFilter);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase ${
                  statusFilter === st ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </form>

      {/* Results Table */}
      {bookings.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800">
          <Search className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white">No bookings found</h3>
          <p className="text-xs text-slate-400 mt-1">
            Try searching by exact customer email or booking reference ID.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Booking ID & Type</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Service & Address</th>
                  <th className="py-3 px-4">Timing</th>
                  <th className="py-3 px-4">Price / Payment</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {bookings.map((booking) => {
                  const isStorage = booking.type === 'STORAGE';
                  return (
                    <tr
                      key={booking.id}
                      className="hover:bg-slate-800/40 transition cursor-pointer"
                      onClick={() => handleInspectBooking(booking)}
                    >
                      {/* ID & Type */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-white text-xs">{booking.id}</div>
                        <div className="mt-1">
                          {isStorage ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              <Luggage className="w-3 h-3 mr-1" />
                              STORAGE
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              <Car className="w-3 h-3 mr-1" />
                              TRANSPORT
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{booking.customer.fullName}</div>
                        <div className="text-slate-400 text-[11px]">{booking.customer.email}</div>
                      </td>

                      {/* Service & Address */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-white truncate">{booking.serviceName}</div>
                        <div className="text-slate-400 text-[11px] truncate">{booking.serviceAddress}</div>
                      </td>

                      {/* Timing */}
                      <td className="py-3 px-4">
                        <div>{new Date(booking.scheduledAt).toLocaleDateString()}</div>
                        <div className="text-slate-400 text-[11px]">
                          {new Date(booking.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Price / Payment */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">${booking.price.toFixed(2)}</div>
                        <div className="text-[10px]">
                          {booking.payment?.status === 'captured' && (
                            <span className="text-emerald-400 font-semibold">Captured</span>
                          )}
                          {booking.payment?.status === 'refunded' && (
                            <span className="text-rose-400 font-semibold">Refunded</span>
                          )}
                          {!booking.payment && <span className="text-slate-500">Unsettled</span>}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {booking.status === 'confirmed' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Confirmed
                          </span>
                        )}
                        {booking.status === 'checked_in' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Checked In
                          </span>
                        )}
                        {booking.status === 'checked_out' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            Checked Out
                          </span>
                        )}
                        {booking.status === 'cancelled' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Cancelled
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInspectBooking(booking);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs transition"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Booking Details & Audit Trail Drawer/Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold text-amber-400">{selectedBooking.id}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                    {selectedBooking.type}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-1">{selectedBooking.serviceName}</h3>
              </div>

              <button
                onClick={() => setSelectedBooking(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Customer & Service Info Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 font-semibold flex items-center space-x-1">
                  <User className="w-3.5 h-3.5" />
                  <span>Customer Information</span>
                </div>
                <div className="font-bold text-white text-sm">{selectedBooking.customer.fullName}</div>
                <div className="text-slate-300">{selectedBooking.customer.email}</div>
                <div className="text-slate-400">{selectedBooking.customer.phone || 'No phone'}</div>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 font-semibold flex items-center space-x-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Financials & Payments</span>
                </div>
                <div className="font-bold text-emerald-400 text-sm">
                  ${selectedBooking.price.toFixed(2)} {selectedBooking.currency}
                </div>
                <div className="text-slate-300">
                  Payment Status:{' '}
                  <span className="font-semibold text-white">
                    {selectedBooking.payment?.status?.toUpperCase() || 'NONE'}
                  </span>
                </div>
                <div className="text-slate-400 font-mono text-[10px]">
                  Ref: {selectedBooking.payment?.providerRef || 'N/A'}
                </div>
              </div>
            </div>

            {/* Linked Trip */}
            {selectedBooking.trip && (
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 text-amber-300">
                  <Layers className="w-4 h-4" />
                  <span>Linked Itinerary: <strong>{selectedBooking.trip.title}</strong></span>
                </div>
                <span className="text-[10px] font-mono text-amber-400">ID: {selectedBooking.trip.id}</span>
              </div>
            )}

            {/* Audit History Timeline for this Booking */}
            <div>
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                <Shield className="w-4 h-4 text-amber-400" />
                <span>Booking Audit Trail & Lifecycle History</span>
              </div>

              {loadingDetail ? (
                <div className="p-4 text-center text-xs text-slate-400">Loading audit events...</div>
              ) : bookingDetail?.auditLogs && bookingDetail.auditLogs.length > 0 ? (
                <div className="space-y-2">
                  {bookingDetail.auditLogs.map((log: any, idx: number) => (
                    <div
                      key={log.id || idx}
                      className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 flex items-start justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-amber-300 font-mono text-[11px]">{log.action}</span>
                          <span className="text-[10px] text-slate-500">
                            by {log.actor?.fullName || log.actorUserId || 'System'} ({log.actor?.role || 'SYSTEM'})
                          </span>
                        </div>
                        {log.afterState && (
                          <div className="text-[11px] text-slate-400 mt-1 font-mono">
                            State transition: {JSON.stringify(log.afterState)}
                          </div>
                        )}
                      </div>
                      <div className="text-right text-[10px] text-slate-500">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                  No individual audit logs recorded for this entity ID yet.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
