import React, { useState } from 'react';
import {
  X,
  Luggage,
  Calendar,
  CreditCard,
  Lock,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Shield,
  QrCode,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface StorageBookingModalProps {
  location: any;
  tripId?: string;
  defaultDropOff?: string;
  defaultPickUp?: string;
  onClose: () => void;
  onBookingSuccess: (booking: any) => void;
}

export const StorageBookingModal: React.FC<StorageBookingModalProps> = ({
  location,
  tripId,
  defaultDropOff,
  defaultPickUp,
  onClose,
  onBookingSuccess,
}) => {
  const { user } = useAuth();

  const now = new Date();
  const defaultStart = defaultDropOff || new Date(now.getTime() + 3600000).toISOString().slice(0, 16);
  const defaultEnd = defaultPickUp || new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 16);

  const [dropOffAt, setDropOffAt] = useState(defaultStart);
  const [pickUpAt, setPickUpAt] = useState(defaultEnd);
  const [bagCount, setBagCount] = useState(1);
  const [cardName, setCardName] = useState(user?.full_name || 'Elena Rostova');
  const [cardNumber, setCardNumber] = useState('•••• •••• •••• 4242');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<any | null>(null);

  // Calculate duration in days (minimum 1 day)
  const startDate = new Date(dropOffAt);
  const endDate = new Date(pickUpAt);
  const diffHours = Math.max(1, (endDate.getTime() - startDate.getTime()) / 3600000);
  const daysCount = Math.max(1, Math.ceil(diffHours / 24));

  const dailyRate = Number(location.price_per_bag_per_day || 6.5);
  const totalPrice = Number((dailyRate * bagCount * daysCount).toFixed(2));

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (new Date(pickUpAt) <= new Date(dropOffAt)) {
        throw new Error('Pick-up time must be after drop-off time.');
      }

      // Generate unique idempotency key for this mutating request
      const idempotencyKey = `idem-book-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const bookingPayload = {
        location_id: location.id,
        trip_id: tripId,
        bag_count: bagCount,
        drop_off_at: new Date(dropOffAt).toISOString(),
        pick_up_at: new Date(pickUpAt).toISOString(),
        currency: 'USD',
      };

      const result = await apiClient.createStorageBooking(bookingPayload, idempotencyKey);
      setConfirmedBooking(result);
      onBookingSuccess(result);
    } catch (err: any) {
      setError(err.message || 'Failed to complete booking. Please verify capacity and retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[95vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Luggage className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {confirmedBooking ? 'Storage Booking Confirmed' : 'Reserve Luggage Storage'}
              </h3>
              <p className="text-xs text-slate-500">{location.name}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {confirmedBooking ? (
          /* Confirmation Success Screen */
          <div className="p-6 space-y-6 text-center animate-in zoom-in-95">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 block">
                Booking Secured & Confirmed
              </span>
              <h4 className="text-xl font-extrabold text-slate-900 mt-1">
                Ref #{confirmedBooking.id.slice(0, 8).toUpperCase()}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Show this digital pass at drop-off. A confirmation email has been sent.
              </p>
            </div>

            {/* Digital Pass / QR Stub */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 text-left space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Drop-off Location
                  </span>
                  <p className="text-xs font-bold text-slate-900">{location.name}</p>
                  <p className="text-[11px] text-slate-500">{location.address}</p>
                </div>
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-xs">
                  <QrCode className="w-8 h-8 text-slate-800" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Drop-off</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(confirmedBooking.drop_off_at).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    •{' '}
                    {new Date(confirmedBooking.drop_off_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Pick-up</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(confirmedBooking.pick_up_at).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    •{' '}
                    {new Date(confirmedBooking.pick_up_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                <span className="text-slate-500">{confirmedBooking.bag_count} bags stored</span>
                <span className="font-extrabold text-slate-900">
                  Total Paid: ${Number(confirmedBooking.price_total).toFixed(2)}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
            >
              Done & View My Bookings
            </button>
          </div>
        ) : (
          /* Active Booking Form */
          <form onSubmit={handleSubmitBooking} className="p-6 space-y-5">
            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Time Window Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Drop-off Time</label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={dropOffAt}
                    onChange={(e) => setDropOffAt(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Pick-up Time</label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={pickUpAt}
                    onChange={(e) => setPickUpAt(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Bag Counter */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">Number of Bags</label>
                <span className="text-[11px] text-slate-500">
                  {location.available_capacity || 25} slots remaining
                </span>
              </div>
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl p-2.5">
                <span className="text-xs font-medium text-slate-700 pl-2">
                  Suitcases, duffels, backpacks
                </span>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setBagCount(Math.max(1, bagCount - 1))}
                    disabled={bagCount <= 1}
                    className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center transition-colors"
                  >
                    -
                  </button>
                  <span className="w-6 text-center text-sm font-extrabold text-slate-900">
                    {bagCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBagCount(Math.min(10, bagCount + 1))}
                    className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 flex items-center justify-center transition-colors shadow-sm"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>
                  ${dailyRate.toFixed(2)} × {bagCount} {bagCount === 1 ? 'bag' : 'bags'} × {daysCount}{' '}
                  {daysCount === 1 ? 'day' : 'days'}
                </span>
                <span className="font-semibold text-slate-900">${totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Luggage Protection Insurance (up to $1,000)</span>
                <span className="font-semibold text-emerald-600">Included Free</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Platform Booking Fee</span>
                <span className="font-semibold text-emerald-600">$0.00</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-extrabold text-slate-900">
                <span>Total Amount Due</span>
                <span className="text-base text-indigo-600">${totalPrice.toFixed(2)} USD</span>
              </div>
            </div>

            {/* Payment Details Stub */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center justify-between">
                <span>Payment Method</span>
                <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-semibold">
                  <Lock className="w-3 h-3" /> 256-bit Secure
                </span>
              </label>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center space-x-3">
                <CreditCard className="w-5 h-5 text-indigo-600 shrink-0" />
                <div className="flex-1 text-xs">
                  <span className="font-bold text-slate-900 block">{cardName}</span>
                  <span className="text-slate-500 font-mono text-[11px]">{cardNumber}</span>
                </div>
                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md">
                  DEMO PAY
                </span>
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center space-x-2"
            >
              {loading ? (
                <span>Securing Storage & Capacity...</span>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Pay ${totalPrice.toFixed(2)} & Confirm Reservation</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
