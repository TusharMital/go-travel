import React, { useState } from 'react';
import {
  FileText,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  User,
  Shield,
  Layers,
  Copy,
  Check,
} from 'lucide-react';
import { AdminAuditEvent } from '../api/client';

interface AuditLogViewerTabProps {
  events: AdminAuditEvent[];
  onFilterChange: (filters: { action?: string; entityType?: string; search?: string }) => void;
  isLoading?: boolean;
}

export const AuditLogViewerTab: React.FC<AuditLogViewerTabProps> = ({
  events,
  onFilterChange,
  isLoading,
}) => {
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');

  // Expandable row state (logId -> boolean)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleActionChange = (action: string) => {
    setSelectedAction(action);
    onFilterChange({ action, entityType: selectedEntityType, search: searchText });
  };

  const handleEntityChange = (entityType: string) => {
    setSelectedEntityType(entityType);
    onFilterChange({ action: selectedAction, entityType, search: searchText });
  };

  const handleSearchChange = (search: string) => {
    setSearchText(search);
    onFilterChange({ action: selectedAction, entityType: selectedEntityType, search });
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATED') || action.includes('CONFIRMED')) {
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }
    if (action.includes('CHECKED_IN') || action.includes('CHECKED_OUT')) {
      return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    }
    if (action.includes('STATUS_CHANGED') || action.includes('ONBOARDING')) {
      return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    }
    if (action.includes('CANCELLED') || action.includes('FAILED') || action.includes('SUSPENDED')) {
      return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    }
    return 'bg-slate-700 text-slate-300 border-slate-600';
  };

  return (
    <div className="space-y-6">
      {/* Filters Toolbar */}
      <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Action Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedAction}
              onChange={(e) => handleActionChange(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/50 cursor-pointer"
            >
              <option value="all">All Actions</option>
              <option value="STORAGE_BOOKING_CREATED">STORAGE_BOOKING_CREATED</option>
              <option value="STORAGE_BOOKING_CHECKED_IN">STORAGE_BOOKING_CHECKED_IN</option>
              <option value="STORAGE_BOOKING_CHECKED_OUT">STORAGE_BOOKING_CHECKED_OUT</option>
              <option value="STORAGE_BOOKING_CANCELLED">STORAGE_BOOKING_CANCELLED</option>
              <option value="STORAGE_LOCATION_CREATED">STORAGE_LOCATION_CREATED</option>
              <option value="STORAGE_INVENTORY_UPDATED">STORAGE_INVENTORY_UPDATED</option>
              <option value="PARTNER_ONBOARDING_SUBMITTED">PARTNER_ONBOARDING_SUBMITTED</option>
              <option value="PARTNER_STATUS_CHANGED">PARTNER_STATUS_CHANGED</option>
              <option value="PAYMENT_INTENT_CREATED">PAYMENT_INTENT_CREATED</option>
              <option value="PAYMENT_CAPTURED">PAYMENT_CAPTURED</option>
              <option value="TRIP_CREATED">TRIP_CREATED</option>
            </select>
          </div>

          {/* Entity Type Filter */}
          <div className="flex items-center space-x-2">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedEntityType}
              onChange={(e) => handleEntityChange(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/50 cursor-pointer"
            >
              <option value="all">All Entities</option>
              <option value="StorageBooking">StorageBooking</option>
              <option value="TransportBooking">TransportBooking</option>
              <option value="PartnerAccount">PartnerAccount</option>
              <option value="StorageLocation">StorageLocation</option>
              <option value="Payment">Payment</option>
              <option value="Trip">Trip</option>
              <option value="User">User</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search action, entity ID, actor, or correlation ID..."
            value={searchText}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      {events.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800">
          <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white">No audit records found</h3>
          <p className="text-xs text-slate-400 mt-1">There are no events matching your filter selections.</p>
        </div>
      ) : (
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity Target</th>
                  <th className="py-3 px-4">Actor / Role</th>
                  <th className="py-3 px-4">Correlation ID</th>
                  <th className="py-3 px-4 text-right">State Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {events.map((event) => {
                  const isExpanded = !!expandedRows[event.id];
                  const hasStateDiff = event.beforeState || event.afterState;

                  return (
                    <React.Fragment key={event.id}>
                      <tr className="hover:bg-slate-800/40 transition">
                        {/* Timestamp */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-mono text-white text-xs">
                            {new Date(event.createdAt).toISOString().replace('T', ' ').slice(0, 19)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {new Date(event.createdAt).toLocaleDateString()}
                          </div>
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${getActionColor(
                              event.action
                            )}`}
                          >
                            {event.action}
                          </span>
                        </td>

                        {/* Entity */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-300">{event.entityType}</div>
                          <div className="flex items-center space-x-1 font-mono text-[10px] text-slate-400">
                            <span className="truncate max-w-[130px]">{event.entityId}</span>
                            <button
                              onClick={() => handleCopy(event.entityId, `entity-${event.id}`)}
                              title="Copy Entity ID"
                              className="text-slate-500 hover:text-white"
                            >
                              {copiedId === `entity-${event.id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Actor */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">
                            {event.actor?.fullName || event.actorUserId || 'System'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {event.actor?.role?.toUpperCase() || 'AUTOMATED'}
                          </div>
                        </td>

                        {/* Correlation ID */}
                        <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                          <div className="flex items-center space-x-1">
                            <span className="truncate max-w-[120px]">{event.correlationId}</span>
                            <button
                              onClick={() => handleCopy(event.correlationId, `corr-${event.id}`)}
                              title="Copy Correlation ID"
                              className="text-slate-500 hover:text-white"
                            >
                              {copiedId === `corr-${event.id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Toggle Diff */}
                        <td className="py-3 px-4 text-right">
                          {hasStateDiff ? (
                            <button
                              onClick={() => toggleRow(event.id)}
                              className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold transition"
                            >
                              <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-600 font-mono">No diff</span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable JSON Diff Row */}
                      {isExpanded && (
                        <tr className="bg-slate-950/80">
                          <td colSpan={6} className="p-4 border-t border-slate-800">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                              {/* Before State */}
                              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                                <div className="text-slate-400 font-bold mb-2 pb-1 border-b border-slate-800 text-[10px] uppercase">
                                  Before State
                                </div>
                                <pre className="text-[11px] text-slate-300 overflow-x-auto">
                                  {event.beforeState ? JSON.stringify(event.beforeState, null, 2) : 'null (Created or Initial)'}
                                </pre>
                              </div>

                              {/* After State */}
                              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                                <div className="text-emerald-400 font-bold mb-2 pb-1 border-b border-slate-800 text-[10px] uppercase">
                                  After State
                                </div>
                                <pre className="text-[11px] text-emerald-300 overflow-x-auto">
                                  {event.afterState ? JSON.stringify(event.afterState, null, 2) : 'null (Deleted)'}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
