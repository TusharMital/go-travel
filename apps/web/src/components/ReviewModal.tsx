import React, { useState, useEffect } from 'react';
import {
  X,
  Star,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Luggage,
  Car,
  Clock,
} from 'lucide-react';
import { apiClient } from '../api/client';

interface ReviewModalProps {
  booking: {
    id: string;
    type?: 'storage' | 'transport';
    title?: string;
    locationName?: string;
    status: string;
    drop_off_at?: string;
    pick_up_at?: string;
    scheduled_at?: string;
    bag_count?: number;
    price_total?: number | string;
  } | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const RATING_LABELS: Record<number, string> = {
  1: '1 Star - Poor / Subpar Experience',
  2: '2 Stars - Fair / Needs Improvement',
  3: '3 Stars - Good / Met Expectations',
  4: '4 Stars - Very Good / Highly Satisfied',
  5: '5 Stars - Exceptional / Outstanding Service!',
};

export const ReviewModal: React.FC<ReviewModalProps> = ({
  booking,
  onClose,
  onSuccess,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [checkingExisting, setCheckingExisting] = useState<boolean>(true);
  const [existingReview, setExistingReview] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successSubmitted, setSuccessSubmitted] = useState<boolean>(false);

  if (!booking) return null;

  const isStorage = booking.type === 'storage' || Boolean(booking.drop_off_at);
  const isCheckedOut =
    booking.status === 'checked_out' ||
    (!isStorage && booking.status === 'completed');

  const title =
    booking.title ||
    booking.locationName ||
    (isStorage ? 'Luggage Storage Service' : 'City Transit Transfer');

  useEffect(() => {
    let isMounted = true;
    const checkReviewStatus = async () => {
      setCheckingExisting(true);
      setErrorMessage(null);
      try {
        const res = await apiClient.getBookingReview(booking.id);
        if (isMounted) {
          if (res?.data?.hasReviewed && res?.data?.review) {
            setExistingReview(res.data.review);
          }
        }
      } catch (err: any) {
        // If checking review fails (e.g. mock fallback), fallback gracefully
        console.warn('Could not check booking review status:', err);
      } finally {
        if (isMounted) setCheckingExisting(false);
      }
    };

    checkReviewStatus();
    return () => {
      isMounted = false;
    };
  }, [booking.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCheckedOut) {
      setErrorMessage(
        isStorage
          ? "Booking must be checked out before submitting a review. Current status is '" +
              booking.status +
              "'."
          : "Transport ride must be completed before submitting a review. Current status is '" +
              booking.status +
              "'."
      );
      return;
    }

    if (rating < 1 || rating > 5) {
      setErrorMessage('Please select a star rating between 1 and 5.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await apiClient.submitReview({
        bookingId: booking.id,
        rating,
        comment: comment.trim() || undefined,
      });

      setSuccessSubmitted(true);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      const msg =
        err?.message ||
        err?.error?.message ||
        'Failed to submit review. Please try again.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const activeRating = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center border border-amber-200/60 shadow-xs">
              <Star className="w-6 h-6 fill-amber-400 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 leading-tight">
                Rate & Review Experience
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Post-checkout verified feedback for completed bookings
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Booking Card Brief */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white rounded-xl border border-slate-200/80 text-indigo-600 shadow-2xs">
              {isStorage ? <Luggage className="w-4 h-4" /> : <Car className="w-4 h-4" />}
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 leading-tight">{title}</h4>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                Ref: #{booking.id.slice(0, 10).toUpperCase()}
              </p>
            </div>
          </div>

          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
              isCheckedOut
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {booking.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        {/* Already Reviewed State */}
        {existingReview ? (
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 space-y-3 animate-in fade-in">
            <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>You have already submitted a review for this booking</span>
            </div>

            <div className="bg-white rounded-xl p-3.5 border border-emerald-100/80 shadow-2xs space-y-2">
              <div className="flex items-center space-x-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= existingReview.rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-200'
                    }`}
                  />
                ))}
                <span className="text-xs font-bold text-slate-700 ml-2">
                  {existingReview.rating} out of 5 stars
                </span>
              </div>

              {existingReview.comment ? (
                <p className="text-xs text-slate-600 italic leading-relaxed">
                  "{existingReview.comment}"
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic">No written comment provided.</p>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              Close
            </button>
          </div>
        ) : successSubmitted ? (
          /* Submission Success State */
          <div className="text-center py-6 space-y-3 animate-in zoom-in-95">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-black text-slate-900">
              Thank You for Your Feedback!
            </h4>
            <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
              Your {rating}-star review has been verified and posted. It helps other travelers make
              confident travel choices.
            </p>
            <div className="pt-2">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
              >
                Done
              </button>
            </div>
          </div>
        ) : !isCheckedOut ? (
          /* Pre-Condition Block: Booking NOT completed / checked-out */
          <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-5 space-y-3">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-900">
                  Review Submission Unavailable
                </h4>
                <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
                  Reviews are strictly tied to completed reservations. To ensure verified and
                  trustworthy ratings, luggage must be{' '}
                  <span className="font-bold underline">checked out</span> from the facility before
                  feedback can be accepted.
                </p>
                <div className="mt-2 text-[11px] text-amber-700 font-medium">
                  Current Status: <span className="font-bold capitalize">{booking.status}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                Understood
              </button>
            </div>
          </div>
        ) : (
          /* Main Review Submission Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center space-x-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Star Rating Picker */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Your Overall Rating
              </label>

              <div className="flex items-center justify-center space-x-2 py-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="p-1 rounded-xl transition-transform hover:scale-125 focus:outline-none"
                    aria-label={`${star} Stars`}
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        star <= activeRating
                          ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                          : 'text-slate-300 hover:text-slate-400'
                      }`}
                    />
                  </button>
                ))}
              </div>

              <div className="text-xs font-extrabold text-indigo-700 h-5">
                {RATING_LABELS[activeRating] || ''}
              </div>
            </div>

            {/* Written Comment Box */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                  <span>Written Review & Feedback (Optional)</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {comment.length} / 1000
                </span>
              </div>
              <textarea
                rows={4}
                maxLength={1000}
                placeholder="Share details about punctuality, friendliness of staff, cleanliness of facility, and ease of luggage handoff..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            {/* Security Guarantee Note */}
            <div className="flex items-center space-x-2 text-[11px] text-slate-500 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Verified Buyer Review • Logged to immutable audit trail with ID #
                {booking.id.slice(0, 8)}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                {loading ? (
                  <span>Submitting...</span>
                ) : (
                  <>
                    <span>Submit Review</span>
                    <Star className="w-3.5 h-3.5 fill-white" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
