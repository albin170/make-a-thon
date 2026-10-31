'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await apiClient.post<any>('/auth/forgot-password', { email });
      setMessage(res.message || 'If an account exists, a reset link has been dispatched.');
    } catch {
      setMessage('If an account exists, a reset link has been dispatched.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg border border-slate-200">
        <h1 className="text-xl font-bold text-slate-900 mb-2">Reset Password</h1>
        <p className="text-xs text-slate-500 mb-6">Enter your registered email address to receive recovery instructions.</p>

        {message ? (
          <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700 border border-green-200">
            {message}
            <div className="mt-4">
              <Link href="/login" className="text-xs font-semibold text-blue-600 hover:underline">Return to Login</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <div className="text-center pt-2">
              <Link href="/login" className="text-xs text-slate-500 hover:underline">Back to Login</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
