import React, { useState } from 'react';
import {
  Users,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Building,
  Mail,
  Phone,
  MapPin,
  FileCheck,
  AlertOctagon,
  ShieldAlert,
} from 'lucide-react';
import { AdminPartner, adminApi } from '../api/client';

interface PartnerVerificationTabProps {
  partners: AdminPartner[];
  counts: { pending: number; verified: number; suspended: number; total: number };
  onPartnerUpdated: () => void;
  currentRole: 'admin' | 'support' | 'traveler';
}

export const PartnerVerificationTab: React.FC<PartnerVerificationTabProps> = ({
  partners,
  counts,
  onPartnerUpdated,
  currentRole,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [activePartner, setActivePartner] = useState<AdminPartner | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'suspend' | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [suspensionReason, setSuspensionReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filter partners
  const filteredPartners = partners.filter((p) => {
    if (selectedStatus !== 'all' && p.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.businessName.toLowerCase().includes(q);
      const matchEmail = p.user.email.toLowerCase().includes(q);
      const matchOwner = p.user.full_name.toLowerCase().includes(q);
      return matchName || matchEmail || matchOwner;
    }
    return true;
  });

  const handleOpenApprove = (partner: AdminPartner) => {
    setActivePartner(partner);
    setActionType('approve');
    setReviewNotes('Business registration and commercial liability insurance verified.');
    setStatusMessage(null);
  };

  const handleOpenSuspend = (partner: AdminPartner) => {
    setActivePartner(partner);
    setActionType('suspend');
    setSuspensionReason('');
    setStatusMessage(null);
  };

  const handleConfirmAction = async () => {
    if (!activePartner || !actionType) return;

    if (actionType === 'suspend' && (!suspensionReason || suspensionReason.trim().length < 3)) {
      setStatusMessage({ text: 'A detailed suspension reason is required (min 3 chars).', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (actionType === 'approve') {
        await adminApi.approvePartner(activePartner.id, reviewNotes);
        setStatusMessage({ text: `Partner "${activePartner.businessName}" has been successfully approved!`, type: 'success' });
      } else {
        await adminApi.suspendPartner(activePartner.id, suspensionReason);
        setStatusMessage({ text: `Partner "${activePartner.businessName}" has been suspended.`, type: 'success' });
      }

      setTimeout(() => {
        setActionType(null);
        setActivePartner(null);
        onPartnerUpdated();
      }, 800);
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Operation failed. Please try again.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl">
        {/* Status Filter Chips */}
        <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setSelectedStatus('pending')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedStatus === 'pending'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white bg-slate-800/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Review</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                selectedStatus === 'pending' ? 'bg-slate-950 text-amber-300' : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {counts.pending}
            </span>
          </button>

          <button
            onClick={() => setSelectedStatus('verified')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedStatus === 'verified'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white bg-slate-800/60'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Verified Partners</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                selectedStatus === 'verified' ? 'bg-slate-950 text-emerald-300' : 'bg-emerald-500/20 text-emerald-300'
              }`}
            >
              {counts.verified}
            </span>
          </button>

          <button
            onClick={() => setSelectedStatus('suspended')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedStatus === 'suspended'
                ? 'bg-rose-500 text-slate-950 shadow-md shadow-rose-500/20'
                : 'text-slate-400 hover:text-white bg-slate-800/60'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Suspended</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                selectedStatus === 'suspended' ? 'bg-slate-950 text-rose-300' : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              {counts.suspended}
            </span>
          </button>

          <button
            onClick={() => setSelectedStatus('all')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedStatus === 'all'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white bg-slate-800/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>All ({counts.total})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search business or contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Role Notice if Support */}
      {currentRole === 'support' && (
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center space-x-2 text-xs text-blue-300">
          <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0" />
          <span>You are viewing in <strong>Support Role</strong> mode. Verification approval and suspension require <strong>Admin</strong> privileges.</span>
        </div>
      )}

      {/* Partner Cards List */}
      {filteredPartners.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800">
          <Building className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white">No partners found</h3>
          <p className="text-xs text-slate-400 mt-1">There are no partners matching the current filter criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPartners.map((partner) => {
            const isPending = partner.status === 'pending';
            const isVerified = partner.status === 'verified';
            const isSuspended = partner.status === 'suspended';

            return (
              <div
                key={partner.id}
                className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-xl flex flex-col justify-between hover:border-slate-700 transition"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-base">{partner.businessName}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                          {partner.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">Contact: {partner.user.full_name}</p>
                    </div>

                    {/* Status Pill */}
                    <div>
                      {isPending && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending Review
                        </span>
                      )}
                      {isVerified && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </span>
                      )}
                      {isSuspended && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          <AlertOctagon className="w-3 h-3 mr-1" />
                          Suspended
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <div className="flex items-center space-x-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{partner.user.email}</span>
                    </div>

                    <div className="flex items-center space-x-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{partner.user.phone || 'No phone provided'}</span>
                    </div>

                    <div className="flex items-center space-x-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{partner.storageProvider?.locationCount ?? 0} Locations Configured</span>
                    </div>

                    <div className="flex items-center space-x-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                      <FileCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">IBAN: {partner.storageProvider?.payoutDetailsRef?.slice(0, 10)}...</span>
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-slate-500">
                    Registered: {new Date(partner.createdAt).toLocaleDateString()} at{' '}
                    {new Date(partner.createdAt).toLocaleTimeString()}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-end space-x-2">
                  {isPending && (
                    <button
                      onClick={() => handleOpenApprove(partner)}
                      disabled={currentRole !== 'admin'}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-md transition ${
                        currentRole === 'admin'
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Approve Partner</span>
                    </button>
                  )}

                  {isVerified && (
                    <button
                      onClick={() => handleOpenSuspend(partner)}
                      disabled={currentRole !== 'admin'}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-md transition ${
                        currentRole === 'admin'
                          ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <AlertOctagon className="w-4 h-4" />
                      <span>Suspend Partner</span>
                    </button>
                  )}

                  {isSuspended && (
                    <button
                      onClick={() => handleOpenApprove(partner)}
                      disabled={currentRole !== 'admin'}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-md transition ${
                        currentRole === 'admin'
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Re-activate / Re-verify</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Approve Modal */}
      {actionType === 'approve' && activePartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center space-x-3 text-emerald-400">
              <CheckCircle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-white">Approve Partner Verification</h3>
            </div>

            <p className="text-xs text-slate-300">
              Confirm approval for <strong>{activePartner.businessName}</strong>. This will activate their storage hubs, enable booking check-in/out, and dispatch an official approval notification.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Compliance Verification Notes (Optional)
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="e.g. Commercial liability insurance verified."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            {statusMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold ${
                  statusMessage.type === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {statusMessage.text}
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setActionType(null)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition flex items-center space-x-1.5"
              >
                {isSubmitting ? <span>Processing...</span> : <span>Confirm Approval</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {actionType === 'suspend' && activePartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertOctagon className="w-6 h-6" />
              <h3 className="text-lg font-bold text-white">Suspend Partner Account</h3>
            </div>

            <p className="text-xs text-slate-300">
              Suspending <strong>{activePartner.businessName}</strong> will immediately disable discovery for their locations, halt new customer bookings, and notify the partner with the reason below.
            </p>

            <div>
              <label className="block text-xs font-semibold text-rose-400 mb-1">
                Mandatory Suspension Reason *
              </label>
              <textarea
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder="Specify regulatory violation, insurance lapse, or customer dispute reason..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50"
              />
            </div>

            {statusMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold ${
                  statusMessage.type === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {statusMessage.text}
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setActionType(null)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/20 transition flex items-center space-x-1.5"
              >
                {isSubmitting ? <span>Suspending...</span> : <span>Confirm Suspension</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
