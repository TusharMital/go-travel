import React from 'react';
import {
  X,
  MapPin,
  Clock,
  Shield,
  Star,
  CheckCircle2,
  Calendar,
  Luggage,
  ExternalLink,
} from 'lucide-react';

interface StorageDetailModalProps {
  location: any;
  onClose: () => void;
  onBookNow: (location: any) => void;
}

export const StorageDetailModal: React.FC<StorageDetailModalProps> = ({
  location,
  onClose,
  onBookNow,
}) => {
  if (!location) return null;

  const days = [
    { key: 'mon', label: 'Monday' },
    { key: 'tue', label: 'Tuesday' },
    { key: 'wed', label: 'Wednesday' },
    { key: 'thu', label: 'Thursday' },
    { key: 'fri', label: 'Friday' },
    { key: 'sat', label: 'Saturday' },
    { key: 'sun', label: 'Sunday' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Header Photo / Cover */}
        <div className="relative h-56 bg-slate-900 rounded-t-3xl overflow-hidden">
          <img
            src={
              location.photos?.[0] ||
              'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=80'
            }
            alt={location.name}
            className="w-full h-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-transparent" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-4 left-6 right-6 text-white">
            <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 mb-1">
              <span className="bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                Verified Storage Partner
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-amber-300">
                <Star className="w-3.5 h-3.5 fill-amber-300" />
                {location.rating || 4.8} ({location.review_count || 24} reviews)
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black">{location.name}</h2>
            <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-1 mt-1">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{location.address}</span>
            </p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Daily Rate
              </span>
              <span className="text-lg font-black text-slate-900">
                ${Number(location.price_per_bag_per_day || 6.5).toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500 block">per bag / day</span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Distance
              </span>
              <span className="text-lg font-black text-indigo-600">
                {location.distance_km ? `${location.distance_km} km` : 'Near you'}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {location.walking_time?.formatted_duration
                  ? `🚶 ${location.walking_time.formatted_duration}`
                  : 'Fast walking'}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Available Slots
              </span>
              <span className="text-lg font-black text-emerald-600">
                {location.available_capacity || 25} left
              </span>
              <span className="text-[10px] text-slate-500 block">Max: {location.max_bag_size || 'large'}</span>
            </div>
          </div>

          {/* Trust & Security Guarantee */}
          <div className="border border-emerald-100 bg-emerald-50/60 rounded-2xl p-4 flex items-start space-x-3.5 text-emerald-950">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl mt-0.5">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-900">Protected & Insured Storage</h4>
              <p className="text-xs text-emerald-800/90 mt-0.5 leading-relaxed">
                Every booked bag is insured up to $1,000 against theft and damage. Stored in monitored staff-only rooms with 24/7 CCTV surveillance.
              </p>
            </div>
          </div>

          {/* Operating Hours */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>Weekly Operating Hours</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {days.map((d) => {
                const hours = location.opening_hours?.[d.key] || { open: '08:00', close: '22:00' };
                return (
                  <div key={d.key} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="font-bold text-slate-700 block">{d.label}</span>
                    <span className="text-slate-500 text-[11px]">
                      {hours.open} - {hours.close}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Accepted Item Categories */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
              <Luggage className="w-4 h-4 text-slate-500" />
              <span>Accepted Item Types</span>
            </h4>
            <div className="flex flex-wrap gap-2 text-xs">
              {(location.accepted_item_categories || ['Luggage', 'Backpack', 'Shopping Bags']).map(
                (cat: string) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 font-semibold rounded-full capitalize"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    {cat.replace('_', ' ')}
                  </span>
                )
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-100">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                onBookNow(location);
              }}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
            >
              <span>Book Storage Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
