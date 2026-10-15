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
    <div className="min-h-screen bg-[#1E0209] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Decorative High-End Ambient Backdrops */}
      <div className="absolute -top-40 -right-40 w-[36rem] h-[36rem] bg-gradient-to-br from-brand-700/30 to-gold/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[36rem] h-[36rem] bg-gradient-to-tr from-amber-600/20 to-brand-900/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:32px_32px] opacity-10 pointer-events-none" />

      <div className="w-full max-w-md bg-white/95 backdrop-blur-2xl border border-gold/30 rounded-3xl shadow-luxury-lg overflow-hidden z-10 transition-all">
        {/* Luxury Header Banner */}
        <div className="bg-gradient-to-br from-brand-950 via-brand-900 to-brand-850 px-8 py-9 text-center relative overflow-hidden border-b border-gold/30">
          <div className="absolute right-0 top-0 w-32 h-32 bg-gold/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-gold via-amber-400 to-yellow-300 flex items-center justify-center text-brand-950 font-black text-2xl shadow-gold-glow ring-4 ring-gold/30 mb-3.5">
              <span className="font-serif text-3xl font-black">B2P</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight font-serif">
              BillToPrint
            </h1>
            <p className="text-[11px] text-amber-200/90 mt-1 uppercase tracking-widest font-semibold">
              {storeName ? `${storeName} • Invoicing Suite` : 'Luxury POS & Billing Terminal'}
            </p>
          </div>
        </div>

        {/* Login Form Body */}
        <div className="p-6 sm:p-8 bg-white">
          <div className="flex items-center space-x-2.5 text-xs font-semibold text-brand-950 bg-brand-50/80 border border-brand-200/60 rounded-xl p-3.5 mb-5 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Enter staff credentials to unlock the point-of-sale terminal.</span>
          </div>

          {errorMsg && (
            <div className="flex items-start space-x-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl p-3 mb-5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
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
                  className="w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
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
                  className="w-full pl-10 pr-11 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-slate-400" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-gradient-to-r from-brand-900 via-brand-850 to-brand-900 hover:from-brand-950 hover:to-brand-900 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-2 text-sm disabled:opacity-60 cursor-pointer active-press border border-gold/30 ring-2 ring-brand-900/10"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-gold" />
                  <span>Verifying counter access...</span>
                </>
              ) : (
                <>
                  <span>Unlock POS Terminal</span>
                  <span className="text-gold font-bold text-base">→</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* High-Trust Footer */}
        <div className="bg-slate-50/80 border-t border-slate-100 px-6 py-3.5 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span>🔒 256-bit Secure POS Session</span>
          <span className="text-brand-900 font-bold">GST Compliant</span>
        </div>
      </div>
    </div>
  );
};
