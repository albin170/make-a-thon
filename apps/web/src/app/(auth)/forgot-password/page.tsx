'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiClient.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'Request failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/20 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md glass-card rounded-3xl p-8 sm:p-10 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 mb-3 shadow-lg shadow-violet-500/30">
            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.083-8-12.356-8-5.096 0-5.096 8 0 8 5.273 0 7.261-8 12.356-8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Reset Password</h1>
          <p className="text-sm text-slate-400 mt-1">We&apos;ll send you a secure link to reset your password</p>
        </div>

        {submitted ? (
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-5 text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
              ✓
            </div>
            <h3 className="text-base font-semibold text-white">Check your email</h3>
            <p className="text-xs text-slate-300 mt-2">
              If an account with <span className="font-semibold text-emerald-300">{email}</span> exists, you will receive password reset instructions.
            </p>
            <div className="mt-5">
              <Link href="/login" className="text-xs text-violet-400 hover:text-violet-300 font-semibold transition">
                ← Back to Sign in
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm text-white placeholder-slate-500"
                placeholder="name@company.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl btn-neon py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Sending link...' : 'Send Reset Link →'}
            </button>

            <p className="text-center text-xs text-slate-400 pt-3">
              Remembered your password?{' '}
              <Link href="/login" className="text-violet-400 hover:text-violet-300 font-semibold transition">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
