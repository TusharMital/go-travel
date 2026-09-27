import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, KeyRound, Mail, Lock, User, Phone, Briefcase, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { ApiError } from '../api/client';

export type AuthMode = 'login' | 'register' | 'forgot' | 'reset' | 'verify';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const { login, register, requestPasswordReset, resetPassword, confirmEmailVerification } = useAuth();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'traveler' | 'partner_storage' | 'partner_transport'>('traveler');
  const [businessName, setBusinessName] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Status states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleQuickFill = (demoEmail: string, demoRole: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
    setErrorMsg(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      await login(email, password);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      await register({
        email,
        password,
        full_name: fullName,
        phone: phone || undefined,
        role,
        business_name: role !== 'traveler' ? businessName : undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const msg = await requestPasswordReset(email);
      setSuccessMsg(msg);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch password reset request.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const msg = await resetPassword(token, newPassword);
      setSuccessMsg(msg);
      setTimeout(() => setMode('login'), 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Reset failed. Token might be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const msg = await confirmEmailVerification(token);
      setSuccessMsg(msg);
      setTimeout(() => onClose(), 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Token may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="p-6 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {mode === 'login' && 'Welcome Back'}
              {mode === 'register' && 'Create Your Account'}
              {mode === 'forgot' && 'Reset Password'}
              {mode === 'reset' && 'Enter Reset Token'}
              {mode === 'verify' && 'Verify Email Address'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {mode === 'login' && 'Sign in to access your trips and bookings'}
              {mode === 'register' && 'Join the Integrated Travel Platform'}
              {mode === 'forgot' && 'Receive a secure reset link'}
              {mode === 'reset' && 'Choose a strong new password'}
              {mode === 'verify' && 'Confirm token sent to your email'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* MODE: LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Demo 1-Click Fast Logins */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  ⚡ QUICK STATION DEMO ACCOUNTS:
                </span>
                <div className="flex flex-wrap gap-1.5 font-mono">
                  <button
                    type="button"
                    onClick={() => handleQuickFill('traveler@example.com', 'traveler')}
                    className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm bg-[#FF6B35]/15 text-[#FF6B35] hover:bg-[#FF6B35]/25 font-bold border border-[#FF6B35]/30"
                  >
                    Traveler
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('storage.partner@example.com', 'partner_storage')}
                    className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm bg-[#1E3A34]/15 text-[#1E3A34] hover:bg-[#1E3A34]/25 font-bold border border-[#1E3A34]/30"
                  >
                    Storage Partner
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('transport.partner@example.com', 'partner_transport')}
                    className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm bg-slate-200 text-slate-800 hover:bg-slate-300 font-bold border border-slate-300"
                  >
                    Transport Partner
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('admin@platform.com', 'admin')}
                    className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm bg-amber-50 text-amber-800 hover:bg-amber-100 font-bold border border-amber-200"
                  >
                    Admin
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-slate-700 mb-1 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="traveler@example.com"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B35] focus:border-[#FF6B35] transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setMode('forgot');
                    }}
                    className="text-xs font-mono text-[#FF6B35] hover:text-[#E85D26]"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B35] focus:border-[#FF6B35] transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#FF6B35] hover:bg-[#E85D26] text-white font-mono font-bold uppercase tracking-wider rounded-sm text-xs shadow-xs transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>

              <div className="text-center pt-2">
                <span className="text-xs text-slate-500">Don't have an account? </span>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setMode('register');
                  }}
                  className="text-xs font-mono font-semibold text-[#FF6B35] hover:text-[#E85D26]"
                >
                  Create one now
                </button>
              </div>
            </form>
          )}

          {/* MODE: REGISTER */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono font-semibold text-slate-700 mb-1 uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Elena Rostova"
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-slate-700 mb-1 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="elena@example.com"
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-slate-700 mb-1 uppercase tracking-wider">Account Role</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('traveler')}
                    className={`p-2 text-center rounded-sm border text-xs font-mono font-medium transition-all ${
                      role === 'traveler'
                        ? 'border-[#FF6B35] bg-[#FF6B35]/10 text-[#FF6B35]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🎒 Traveler
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('partner_storage')}
                    className={`p-2 text-center rounded-sm border text-xs font-mono font-medium transition-all ${
                      role === 'partner_storage'
                        ? 'border-[#1E3A34] bg-[#1E3A34]/15 text-[#1E3A34]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🏬 Storage
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('partner_transport')}
                    className={`p-2 text-center rounded-sm border text-xs font-mono font-medium transition-all ${
                      role === 'partner_transport'
                        ? 'border-slate-700 bg-slate-200 text-slate-900'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🚕 Transport
                  </button>
                </div>
              </div>

              {role !== 'traveler' && (
                <div>
                  <label className="block text-xs font-mono font-semibold text-slate-700 mb-1 uppercase tracking-wider">Business Name</label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Berlin Safekeep Network"
                      className="w-full pl-9 pr-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-mono font-semibold text-slate-700 mb-1 uppercase tracking-wider">Password (min 8 chars)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#FF6B35] hover:bg-[#E85D26] text-white font-mono font-bold uppercase tracking-wider rounded-sm text-xs shadow-xs transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? 'Registering Account...' : 'Complete Registration'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>

              <div className="text-center pt-1">
                <span className="text-xs text-slate-500">Already registered? </span>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setMode('login');
                  }}
                  className="text-xs font-mono font-semibold text-[#FF6B35] hover:text-[#E85D26]"
                >
                  Sign in
                </button>
              </div>
            </form>
          )}

          {/* MODE: FORGOT PASSWORD */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed font-mono">
                Enter your email address and we'll dispatch a secure reset token via our telemetry notifications provider.
              </p>

              <div>
                <label className="block text-xs font-mono font-semibold text-slate-700 mb-1 uppercase tracking-wider">Registered Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="traveler@example.com"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#FF6B35] hover:bg-[#E85D26] text-white font-mono font-bold uppercase tracking-wider rounded-sm text-xs shadow-xs transition-all flex items-center justify-center space-x-2"
              >
                {loading ? 'Sending Request...' : 'Send Reset Link'}
              </button>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setMode('reset');
                  }}
                  className="text-xs font-mono text-[#FF6B35] hover:text-[#E85D26]"
                >
                  Already have a reset token?
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setMode('login');
                  }}
                  className="text-xs text-slate-500 font-medium"
                >
                  Back to login
                </button>
              </div>
            </form>
          )}

          {/* MODE: RESET PASSWORD */}
          {mode === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-semibold text-slate-700 mb-1 uppercase tracking-wider">Reset Token</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste 64-char token here"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-sm text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-slate-700 mb-1 uppercase tracking-wider">New Password (min 8 chars)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#FF6B35] hover:bg-[#E85D26] text-white font-mono font-bold uppercase tracking-wider rounded-sm text-xs shadow-xs transition-all"
              >
                {loading ? 'Updating Password...' : 'Set New Password'}
              </button>
            </form>
          )}

          {/* MODE: VERIFY EMAIL */}
          {mode === 'verify' && (
            <form onSubmit={handleConfirmVerification} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-semibold text-slate-700 mb-1 uppercase tracking-wider">Verification Token</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste token from console / email"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-sm text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#1E3A34] hover:bg-[#2A524A] text-white font-mono font-bold uppercase tracking-wider rounded-sm text-xs shadow-xs transition-all"
              >
                {loading ? 'Verifying Token...' : 'Confirm Verification'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
