import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { loginWithPassword } from '../store/useAuthStore';

interface LoginProps {
  storeName?: string;
}

export const Login: React.FC<LoginProps> = ({ storeName }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    const { error } = await loginWithPassword(cleanEmail, password);
    setLoading(false);

    if (error) {
      setErrorMsg(error.message || 'Authentication failed. Please verify your credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Decorative High-End Ambient Backdrops */}
      <div className="absolute -top-40 -right-40 w-[32rem] h-[32rem] bg-brand-700/25 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[32rem] h-[32rem] bg-amber-500/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden z-10 transition-all">
        {/* Header Banner */}
        <div className="bg-gradient-to-br from-brand-900 via-brand-850 to-brand-800 px-8 py-10 text-center relative overflow-hidden border-b border-gold/20">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-gold to-amber-300 flex items-center justify-center text-brand-950 font-black text-2xl shadow-xl ring-4 ring-gold/20 mb-3.5">
            B2P
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            BillToPrint
          </h1>
          <p className="text-xs text-amber-200/90 mt-1 uppercase tracking-widest font-semibold">
            {storeName ? `${storeName} • Invoicing System` : 'Enterprise Point of Sale & Billing'}
          </p>
        </div>

        {/* Login Form Body */}
        <div className="p-6 sm:p-8 bg-white">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3 mb-6">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Enter staff or manager credentials to unlock the point of sale counter.</span>
          </div>

          {errorMsg && (
            <div className="flex items-start space-x-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3 mb-5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Staff / Admin Email
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@billtoprint.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-gradient-to-r from-brand-800 to-brand-900 hover:from-brand-900 hover:to-brand-950 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-2 text-sm disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-gold" />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to POS Counter</span>
                  <span className="text-gold font-bold">→</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 text-center text-xs text-slate-500 font-medium">
          BillToPrint • Professional Retail Billing Suite
        </div>
      </div>
    </div>
  );
};
