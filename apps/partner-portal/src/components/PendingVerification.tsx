import React, { useState } from 'react';
import { PartnerProfile, partnerApi } from '../api/client';
import {
  Clock,
  ShieldAlert,
  CheckCircle2,
  Building2,
  FileCheck,
  Zap,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

interface PendingVerificationProps {
  profile: PartnerProfile;
  onApproved: () => void;
}

export const PendingVerification: React.FC<PendingVerificationProps> = ({
  profile,
  onApproved,
}) => {
  const [approving, setApproving] = useState(false);
  const [approvalFeedback, setApprovalFeedback] = useState<string | null>(null);

  const businessName =
    profile.storage_provider?.business_name ||
    profile.transport_provider?.name ||
    'Partner Business';

  const handleSimulateAdminApproval = async () => {
    try {
      setApproving(true);
      setApprovalFeedback(null);
      await partnerApi.approvePartner(profile.id || 'partner-acc-demo-1', 'Approved via Partner Portal evaluation action.');
      setApprovalFeedback('Application approved by Admin! Activating verified dashboard...');
      setTimeout(() => {
        onApproved();
      }, 1000);
    } catch (err: any) {
      setApprovalFeedback(`Approval failed: ${err.message}`);
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6 space-y-6">
      {/* Main Review Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Banner */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 p-6 sm:p-8 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
              <Clock className="w-8 h-8 text-white animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-amber-100">
                Application Status
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-0.5">
                Verification in Progress
              </h2>
            </div>
          </div>
          <p className="text-amber-50 text-sm mt-3 leading-relaxed">
            Thank you for applying to become a TravelSync partner. Our trust, safety, and compliance team is actively reviewing your commercial registration, identity verification, and insurance documents.
          </p>
        </div>

        {/* Progress Pipeline */}
        <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
            Verification Timeline
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-3.5 bg-white rounded-2xl border border-emerald-200 shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-900">Application Submitted</p>
                <p className="text-[11px] text-slate-500">Profile & banking received</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3.5 bg-amber-50 rounded-2xl border border-amber-300 shadow-xs">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 animate-spin" />
              <div>
                <p className="text-xs font-bold text-amber-900">Compliance Review</p>
                <p className="text-[11px] text-amber-700">Under review (1-2 business days)</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3.5 bg-white rounded-2xl border border-slate-200 opacity-60">
              <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center shrink-0">
                <span className="w-2 h-2 rounded-full bg-slate-300" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-600">Platform Activation</p>
                <p className="text-[11px] text-slate-400">Manage locations & bookings</p>
              </div>
            </div>
          </div>
        </div>

        {/* Application Summary */}
        <div className="p-6 sm:p-8 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Submitted Profile Details
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block font-medium">Business Name</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">{businessName}</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block font-medium">Service Category</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block uppercase">
                {profile.type || 'Storage'}
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block font-medium">Account Owner</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">{profile.user.full_name}</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block font-medium">Contact Email</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">{profile.user.email}</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block font-medium">Payout Reference</span>
              <span className="font-mono text-slate-900 text-xs mt-0.5 block truncate">
                {profile.storage_provider?.payout_details_ref || 'DE89...3000'}
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block font-medium">Application ID</span>
              <span className="font-mono text-slate-900 text-xs mt-0.5 block truncate">
                {profile.id || 'partner-acc-demo-1'}
              </span>
            </div>
          </div>
        </div>

        {/* Demo Fast-Action Admin Approver Card */}
        <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800">
          <div className="space-y-1 text-center sm:text-left">
            <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-400">
              <Zap className="w-3.5 h-3.5" />
              <span>Developer / Evaluator Quick Action</span>
            </div>
            <p className="text-xs text-slate-300">
              Simulate admin approval to transition status to <code className="text-emerald-300 font-mono">VERIFIED</code> and unlock management features immediately.
            </p>
            {approvalFeedback && (
              <p className="text-xs font-bold text-emerald-400 pt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{approvalFeedback}</span>
              </p>
            )}
          </div>

          <button
            onClick={handleSimulateAdminApproval}
            disabled={approving}
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 shrink-0"
          >
            {approving ? (
              <span>Approving Application...</span>
            ) : (
              <>
                <span>Simulate Admin Approval</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
