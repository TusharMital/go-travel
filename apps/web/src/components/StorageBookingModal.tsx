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
import { BaggageClaimPass } from './motion/BaggageClaimPass';
import { SplitFlapTicker } from './motion/SplitFlapTicker';

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
    <div className="fixed inset-0 z-50 bg-[#0B0F12]/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-[#141A20] text-[#E8ECF0] rounded-[6px] max-w-lg w-full max-h-[95vh] overflow-y-auto shadow-2xl border border-[#263038]">
        {/* Header */}
        <div className="p-4 border-b border-[#263038] flex items-center justify-between bg-[#0B0F12]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-[4px] bg-[#1E262C] border border-[#263038] flex items-center justify-center text-cargo-500">
              <Luggage className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 bg-[#1C242A] text-signal font-bold rounded-[2px] border border-[#263038]">
                  {confirmedBooking ? 'PASS ISSUED' : 'LOCKER DISPATCH'}
                </span>
                <h3 className="font-display text-sm font-bold text-[#E8ECF0]">
                  {confirmedBooking ? 'Storage Booking Confirmed' : 'Reserve Luggage Storage'}
                </h3>
              </div>
              <p className="font-mono text-xs text-[#718096] truncate">{location.name}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#718096] hover:text-[#E8ECF0] hover:bg-[#1E262C] rounded-[3px] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {confirmedBooking ? (
          /* Confirmation Success Screen with Physical Stamped Baggage Pass */
          <div className="p-4 animate-in zoom-in-95">
            <BaggageClaimPass
              bookingId={confirmedBooking.id}
              type="storage"
              serviceName={location.name}
              locationAddress={location.address}
              timeWindowStart={confirmedBooking.drop_off_at}
              timeWindowEnd={confirmedBooking.pick_up_at}
              bagCount={confirmedBooking.bag_count}
              totalPrice={Number(confirmedBooking.price_total)}
              currency={confirmedBooking.currency || 'USD'}
              onDone={onClose}
            />
          </div>
        ) : (
          /* Active Booking Form */
          <form onSubmit={handleSubmitBooking} className="p-5 space-y-4">
            {error && (
              <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 rounded-[3px] font-mono text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Time Window Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-mono text-xs font-bold text-[#E8ECF0] block mb-1">
                  DROP-OFF WINDOW
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={dropOffAt}
                    onChange={(e) => setDropOffAt(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-[#0B0F12] border border-[#263038] rounded-[3px] font-mono text-xs text-[#E8ECF0] focus:border-cargo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-mono text-xs font-bold text-[#E8ECF0] block mb-1">
                  CLAIM BY WINDOW
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={pickUpAt}
                    onChange={(e) => setPickUpAt(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-[#0B0F12] border border-[#263038] rounded-[3px] font-mono text-xs text-[#E8ECF0] focus:border-cargo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Bag Counter */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-mono text-xs font-bold text-[#E8ECF0]">NUMBER OF BAGS</label>
                <span className="font-mono text-[10px] text-signal font-semibold">
                  {location.available_capacity || 25} SLOTS OPEN
                </span>
              </div>
              <div className="flex items-center justify-between bg-[#0B0F12] border border-[#263038] rounded-[3px] p-2">
                <span className="font-mono text-xs text-[#718096] pl-2">
                  Standard baggage items
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setBagCount(Math.max(1, bagCount - 1))}
                    disabled={bagCount <= 1}
                    className="w-7 h-7 rounded-[3px] bg-[#141A20] border border-[#263038] text-[#E8ECF0] font-mono font-bold hover:bg-[#1E262C] disabled:opacity-30 flex items-center justify-center transition-colors"
                  >
                    -
                  </button>
                  <span className="w-6 text-center font-mono font-bold text-[#E8ECF0] text-sm">
                    {bagCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBagCount(Math.min(10, bagCount + 1))}
                    className="w-7 h-7 rounded-[3px] bg-cargo-500 text-white font-mono font-bold hover:bg-cargo-600 flex items-center justify-center transition-colors shadow-cargo-glow"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Price Telemetry Readout */}
            <div className="bg-[#0B0F12] border border-[#263038] rounded-[3px] p-3 font-mono text-xs space-y-1.5">
              <div className="flex justify-between text-[#718096]">
                <span>
                  ${dailyRate.toFixed(2)} × {bagCount} bag(s) × {daysCount} day(s)
                </span>
                <span className="font-bold text-[#E8ECF0]">${totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#718096]">
                <span>Luggage Guarantee & Insurance (up to $1,000)</span>
                <span className="font-bold text-concourse-400">Included</span>
              </div>
              <div className="pt-2 border-t border-[#263038] flex justify-between items-center text-[#E8ECF0]">
                <span className="font-bold text-xs uppercase tracking-wider">Total Captured Rate</span>
                <SplitFlapTicker value={totalPrice.toFixed(2)} prefix="$" size="md" />
              </div>
            </div>

            {/* Payment Details Card */}
            <div>
              <label className="font-mono text-xs font-bold text-[#E8ECF0] block mb-1 flex items-center justify-between">
                <span>PAYMENT TELEMETRY</span>
                <span className="text-[10px] text-concourse-400 flex items-center gap-1 font-bold">
                  <Lock className="w-3 h-3" /> TLS ENCRYPTED ESCROW
                </span>
              </label>
              <div className="bg-[#0B0F12] border border-[#263038] rounded-[3px] p-2.5 flex items-center space-x-3">
                <CreditCard className="w-5 h-5 text-signal shrink-0" />
                <div className="flex-1 font-mono text-xs">
                  <span className="font-bold text-[#E8ECF0] block">{cardName}</span>
                  <span className="text-[#718096] text-[11px]">{cardNumber}</span>
                </div>
                <span className="font-mono text-[9px] font-bold bg-[#1C242A] text-signal border border-[#263038] px-2 py-0.5 rounded-[2px]">
                  TEST ESCROW
                </span>
              </div>
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-cargo-500 hover:bg-cargo-600 disabled:opacity-50 text-white font-mono text-xs font-bold rounded-[3px] shadow-cargo-glow transition-all flex items-center justify-center space-x-2 active:scale-95"
            >
              {loading ? (
                <span>SECURING LOCKER CAPACITY & AUTHORIZING...</span>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>AUTHORIZE ${totalPrice.toFixed(2)} & LOCK RESERVATION</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
