import React, { useState } from 'react';
import { partnerApi } from '../api/client';
import {
  Building2,
  Luggage,
  Car,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  MapPin,
  FileText,
} from 'lucide-react';

interface OnboardingFormProps {
  onSuccess: () => void;
}

export const OnboardingForm: React.FC<OnboardingFormProps> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [businessName, setBusinessName] = useState('Bavaria SafeStash & Mobility GmbH');
  const [partnerType, setPartnerType] = useState<'storage' | 'transport' | 'both'>('storage');
  const [contactName, setContactName] = useState('Maximilian Weber');
  const [contactPhone, setContactPhone] = useState('+49 89 23456789');
  const [city, setCity] = useState('Berlin');
  const [address, setAddress] = useState('Friedrichstrasse 101');
  const [taxId, setTaxId] = useState('DE987654321');
  const [payoutDetailsRef, setPayoutDetailsRef] = useState('DE89370400440532013000');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName || !city) {
      setError('Please fill in business name and city.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await partnerApi.submitOnboarding({
        business_name: businessName,
        partner_type: partnerType,
        contact_name: contactName,
        contact_phone: contactPhone,
        city,
        address,
        tax_id: taxId,
        payout_details_ref: payoutDetailsRef,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to submit onboarding form.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 sm:p-8 text-white">
          <div className="inline-flex items-center space-x-2 bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-semibold text-emerald-300 mb-4">
            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Partner Onboarding Application</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Join the Verified Partner Network
          </h1>
          <p className="text-slate-300 text-sm mt-2 max-w-xl">
            List your luggage storage facilities or transport fleet on TravelSync. Enjoy automated bookings, real-time inventory management, and fast weekly payouts.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="m-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-3 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {/* Partner Type Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              1. Select Service Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => setPartnerType('storage')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start space-x-3.5 ${
                  partnerType === 'storage'
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl mt-0.5 ${
                    partnerType === 'storage' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Luggage className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Luggage Storage Partner</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Operate secure lockers, hotel storage desks, or retail bag-drop locations.
                  </p>
                </div>
              </div>

              <div
                onClick={() => setPartnerType('transport')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start space-x-3.5 ${
                  partnerType === 'transport'
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl mt-0.5 ${
                    partnerType === 'transport' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Transport & Fleet Partner</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Licensed taxis, private airport transfers, shuttle fleets, or micro-mobility.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Business & Legal Info */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              2. Legal Business Entity & Contacts
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Legal Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. Acme Luggage Hub GmbH"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Tax / VAT Registration ID
                </label>
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. DE123456789"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Primary Contact Person
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. Helena Berg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. +49 30 12345678"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Operating City *
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. Berlin"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Headquarters Street Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. Friedrichstrasse 101"
                />
              </div>
            </div>
          </div>

          {/* Banking / Payout Setup */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                3. Payout Settlement Details
              </label>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Bank Account IBAN / Account Number (for automated payouts)
              </label>
              <input
                type="text"
                value={payoutDetailsRef}
                onChange={(e) => setPayoutDetailsRef(e.target.value)}
                className="w-full font-mono px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                placeholder="DE89 3704 0044 0532 0130 00"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                Weekly automated settlements via SEPA / ACH directly to your corporate bank account.
              </p>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>By submitting, you agree to the Platform Partner Terms and insurance standards.</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2 shrink-0"
            >
              {loading ? (
                <span>Submitting Application...</span>
              ) : (
                <>
                  <span>Submit for Verification</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
