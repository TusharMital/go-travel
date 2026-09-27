import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import {
  Bell,
  CheckCircle2,
  Clock,
  Mail,
  MessageSquare,
  Smartphone,
  Shield,
  X,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Check,
} from 'lucide-react';

export interface NotificationItem {
  id: string;
  user_id: string;
  channel: 'email' | 'sms' | 'push';
  template: string;
  title?: string;
  content?: string;
  payload: Record<string, any>;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sent_at?: string;
  read_at?: string;
  created_at: string;
}

export const NotificationsPopover: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [triggeringJob, setTriggeringJob] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [filterUnread, setFilterUnread] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.listMyNotifications(1, 30, filterUnread);
      if (res && res.data) {
        setNotifications(res.data);
      }
    } catch (err: any) {
      console.warn('Failed to load notifications:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, [filterUnread]);

  // Handle click outside to close popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: 'delivered', read_at: new Date().toISOString() } : n))
      );
    } catch (err: any) {
      console.error('Failed to mark read:', err.message);
    }
  };

  const handleTriggerPickupJob = async () => {
    try {
      setTriggeringJob(true);
      setFeedback(null);
      const res = await api.triggerPickupRemindersJob();
      setFeedback(res?.message || 'Scheduled 1-hour pickup reminder job executed!');
      await fetchNotifications();
    } catch (err: any) {
      setFeedback(`Job execution error: ${err.message}`);
    } finally {
      setTriggeringJob(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const unreadCount = notifications.filter((n) => n.status !== 'delivered').length;

  const getChannelBadge = (channel: string) => {
    switch (channel?.toLowerCase()) {
      case 'sms':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-200">
            <MessageSquare className="w-3 h-3" /> SMS
          </span>
        );
      case 'push':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm bg-[#FF6B35]/15 text-[#FF6B35] border border-[#FF6B35]/30">
            <Smartphone className="w-3 h-3" /> Push
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-700 border border-slate-300">
            <Mail className="w-3 h-3" /> Email
          </span>
        );
    }
  };

  const getTemplateIcon = (template: string) => {
    switch (template) {
      case 'BOOKING_CONFIRMED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'BOOKING_CANCELLED':
        return <AlertCircle className="w-4 h-4 text-rose-500" />;
      case 'PICKUP_REMINDER_1H':
        return <Clock className="w-4 h-4 text-[#F2C94C] animate-pulse" />;
      case 'PARTNER_STATUS_CHANGED':
        return <Shield className="w-4 h-4 text-[#FF6B35]" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
      if (diff < 60) return 'Just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return `${Math.floor(diff / 86400)}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 rounded-sm text-slate-600 hover:text-[#FF6B35] hover:bg-[#FF6B35]/10 transition-all border border-slate-200 bg-white shadow-xs focus:outline-none focus:ring-1 focus:ring-[#FF6B35]"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#FF6B35] text-[10px] font-mono font-bold text-white ring-2 ring-white animate-in zoom-in">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white/95 backdrop-blur-md rounded-lg shadow-2xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 bg-[#0B0F12] text-white flex items-center justify-between border-b border-[#263038]">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-[#1E252B] border border-[#37444F] rounded-sm text-[#FF6B35]">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                  TRANSIT TELEMETRY ALERTS
                </h3>
                <p className="text-[10px] font-mono text-slate-400">
                  {unreadCount > 0 ? `${unreadCount} UNREAD NOTIFICATIONS` : 'TELEMETRY UP TO DATE'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={fetchNotifications}
                disabled={loading}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-sm transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#FF6B35]' : ''}`} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-sm transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Scheduled Job Tester Bar */}
          <div className="bg-[#141A1F] px-3.5 py-2 border-b border-[#263038] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center space-x-1.5 text-[#E8ECF0] font-medium text-[11px]">
              <Clock className="w-3.5 h-3.5 text-[#F2C94C] shrink-0" />
              <span>1H PICKUP REMINDER:</span>
            </div>
            <button
              onClick={handleTriggerPickupJob}
              disabled={triggeringJob}
              className="px-2.5 py-1 bg-[#FF6B35] hover:bg-[#E85D26] disabled:opacity-50 text-white text-[10px] font-mono font-bold uppercase tracking-wider rounded-sm shadow-xs transition-all flex items-center space-x-1"
            >
              {triggeringJob ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>RUNNING...</span>
                </>
              ) : (
                <span>DISPATCH JOB</span>
              )}
            </button>
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div className="px-3.5 py-2 bg-emerald-50 border-b border-emerald-100 text-emerald-800 text-xs font-medium flex items-center gap-1.5 animate-in fade-in">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">{feedback}</span>
            </div>
          )}

          {/* Filter Bar */}
          <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setFilterUnread(false)}
                className={`px-2.5 py-1 rounded-sm font-mono font-bold text-[11px] uppercase tracking-wider transition-all ${
                  !filterUnread
                    ? 'bg-white text-[#FF6B35] shadow-xs border border-slate-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilterUnread(true)}
                className={`px-2.5 py-1 rounded-sm font-mono font-bold text-[11px] uppercase tracking-wider transition-all ${
                  filterUnread
                    ? 'bg-white text-[#FF6B35] shadow-xs border border-slate-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">dev: telemetry</span>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 font-mono">
            {notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2 font-sans">
                <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-600">No notifications found</p>
                <p className="text-[11px] text-slate-400">
                  Book luggage storage or transport to see data-driven alert triggers.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const isUnread = item.status !== 'delivered';
                return (
                  <div
                    key={item.id}
                    className={`p-3.5 transition-colors text-left flex gap-3 ${
                      isUnread ? 'bg-[#FF6B35]/5 hover:bg-[#FF6B35]/10' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      <div className="w-7 h-7 rounded-sm bg-white border border-slate-200 shadow-xs flex items-center justify-center">
                        {getTemplateIcon(item.template)}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {getChannelBadge(item.channel)}
                          <span className="text-[9px] font-mono uppercase bg-slate-100 text-slate-600 px-1 py-0.5 rounded-sm">
                            {item.template}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatTimeAgo(item.created_at)}
                        </span>
                      </div>

                      <h4 className="text-xs font-sans font-bold text-slate-900 leading-snug">
                        {item.title || item.payload?.title || item.template}
                      </h4>

                      <p className="text-[11px] font-sans text-slate-600 leading-relaxed break-words">
                        {item.content || item.payload?.notes || JSON.stringify(item.payload)}
                      </p>

                      {/* Action buttons & status */}
                      <div className="pt-1 flex items-center justify-between text-[10px]">
                        <span
                          className={`font-semibold ${
                            item.status === 'delivered'
                              ? 'text-emerald-600'
                              : item.status === 'sent'
                              ? 'text-[#FF6B35]'
                              : 'text-amber-600'
                          }`}
                        >
                          ● {item.status.toUpperCase()}
                        </span>

                        {isUnread && (
                          <button
                            onClick={(e) => handleMarkAsRead(item.id, e)}
                            className="inline-flex items-center gap-1 font-semibold text-[#FF6B35] hover:text-[#E85D26] hover:underline"
                          >
                            <Check className="w-3 h-3" /> Mark Read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center font-mono">
            <span className="text-[10px] text-slate-500">
              Provider: <code className="text-[#FF6B35]">ConsoleNotificationsAdapter</code> (Rule #2)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
