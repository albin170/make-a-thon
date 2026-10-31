'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { setAuthSession } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'customer' | 'staff'>('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Allow username 'admin' or 'staff' directly, or email
      let submitEmail = email.trim();
      if (submitEmail.toLowerCase() === 'admin') submitEmail = 'admin@gmail.com';
      if (submitEmail.toLowerCase() === 'staff') submitEmail = 'staff@gmail.com';

      const res = await apiClient.post<any>('/auth/login', {
        email: submitEmail,
        password: password.trim(),
      });
      setAuthSession(res.accessToken, res.refreshToken, res.user);

      if (res.user.role === 'CUSTOMER') {
        router.push('/portal/dashboard');
      } else if (res.user.role === 'STAFF') {
        router.push('/staff/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setPreset = (userType: 'admin' | 'staff' | 'customer') => {
    if (userType === 'admin') {
      setActiveTab('staff');
      setEmail('admin@gmail.com');
      setPassword('test123');
    } else if (userType === 'staff') {
      setActiveTab('staff');
      setEmail('staff@gmail.com');
      setPassword('test123');
    } else {
      setActiveTab('customer');
      setEmail('acme@example.com');
      setPassword('Customer@12345');
    }
  };

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background ambient neon glow spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/20 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/20 blur-[150px] pointer-events-none" />
      <div className="absolute top-[30%] right-[35%] w-[350px] h-[350px] rounded-full bg-cyan-600/15 blur-[120px] pointer-events-none" />

      {/* Main split grid container */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 min-h-screen">
        {/* Left Hero Branding Section */}
        <div className="lg:col-span-7 flex flex-col justify-between p-8 sm:p-12 lg:p-16 border-b lg:border-b-0 lg:border-r border-white/10 relative">
          {/* Brand Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.083-8-12.356-8-5.096 0-5.096 8 0 8 5.273 0 7.261-8 12.356-8z" />
              </svg>
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">Brightloop</span>
          </div>

          {/* Hero Content */}
          <div className="my-auto py-12 max-w-xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
              Smarter Subscriptions.{' '}
              <span className="bg-gradient-to-r from-violet-400 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
                A Brighter Business.
              </span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
              Manage subscriptions, track revenue, and grow with ease. Built for modern recurring billing workflows with enterprise security.
            </p>

            {/* Feature Badges */}
            <div className="mt-8 space-y-3.5">
              <div className="flex items-center gap-3.5 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-md">
                <div className="w-8 h-8 rounded-lg bg-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
                  ⚡
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Automate Billing & Renewals</h4>
                  <p className="text-xs text-slate-400">Zero manual intervention for recurring monthly and annual schedules.</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-md">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  📊
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Track Growth in Real-Time</h4>
                  <p className="text-xs text-slate-400">Live MRR, churn rate, invoice statuses, and financial summaries.</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-md">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                  🛡️
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Secure & Reliable</h4>
                  <p className="text-xs text-slate-400">Strict RBAC backend guards for Admin, Staff, and Customer portals.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Left Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 pt-6 border-t border-white/5 gap-3">
            <p>Brightloop • Subscription Management System © 2026 Brightloop. All rights reserved.</p>
            <div className="flex items-center gap-4 text-slate-400">
              <span className="hover:text-white cursor-pointer transition">GitHub</span>
              <span className="hover:text-white cursor-pointer transition">Twitter</span>
              <span className="hover:text-white cursor-pointer transition">Discord</span>
            </div>
          </div>
        </div>

        {/* Right Glassmorphism Login Card Section */}
        <div className="lg:col-span-5 flex items-center justify-center p-6 sm:p-10 lg:p-12 relative">
          <div className="w-full max-w-md glass-card rounded-3xl p-8 sm:p-10 shadow-2xl relative">
            {/* Top Logo & Welcome */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 mb-3 shadow-lg shadow-violet-500/30">
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.083-8-12.356-8-5.096 0-5.096 8 0 8 5.273 0 7.261-8 12.356-8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Welcome Back!</h2>
              <p className="text-sm text-slate-400 mt-1">Sign in to continue to your workspace</p>
            </div>

            {/* Role Switcher Pill Tabs */}
            <div className="flex rounded-xl bg-white/[0.06] p-1 mb-6 border border-white/10">
              <button
                type="button"
                onClick={() => { setActiveTab('customer'); setEmail('acme@example.com'); setPassword('Customer@12345'); }}
                className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition ${
                  activeTab === 'customer'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>👤</span> Customer
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('staff'); setEmail('admin@gmail.com'); setPassword('test123'); }}
                className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition ${
                  activeTab === 'staff'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>💼</span> Staff / Admin
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-5 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400 flex items-center gap-2">
                <span className="shrink-0 text-base">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Email Address or Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm text-white placeholder-slate-500"
                    placeholder={activeTab === 'customer' ? 'Enter customer email' : 'admin@gmail.com or admin'}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  <Link href="/forgot-password" className="text-xs text-violet-400 hover:text-violet-300 transition">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl glass-input text-sm text-white placeholder-slate-500"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-white/20 bg-slate-900 text-violet-600 focus:ring-0"
                  />
                  <span>Remember me</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl btn-neon py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {loading ? 'Authenticating...' : 'Sign In →'}
              </button>
            </form>

            {/* Quick Demo Credentials */}
            <div className="mt-6 pt-5 border-t border-white/10">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-2.5">
                Quick Demo Presets
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPreset('admin')}
                  className="px-2 py-1.5 rounded-lg bg-violet-600/15 border border-violet-500/30 text-violet-300 text-xs font-medium hover:bg-violet-600/25 transition text-center"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('staff')}
                  className="px-2 py-1.5 rounded-lg bg-indigo-600/15 border border-indigo-500/30 text-indigo-300 text-xs font-medium hover:bg-indigo-600/25 transition text-center"
                >
                  Staff
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('customer')}
                  className="px-2 py-1.5 rounded-lg bg-cyan-600/15 border border-cyan-500/30 text-cyan-300 text-xs font-medium hover:bg-cyan-600/25 transition text-center"
                >
                  Customer
                </button>
              </div>
            </div>

            {/* Social SSO Mockups */}
            <div className="mt-6">
              <div className="relative flex items-center justify-center mb-4">
                <div className="border-t border-white/10 w-full" />
                <span className="bg-[#0e1427] px-3 text-xs text-slate-500 uppercase">or</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <button type="button" className="flex items-center justify-center py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
                  <span className="text-sm">Google</span>
                </button>
                <button type="button" className="flex items-center justify-center py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
                  <span className="text-sm">GitHub</span>
                </button>
                <button type="button" className="flex items-center justify-center py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
                  <span className="text-sm">Microsoft</span>
                </button>
              </div>
            </div>

            {/* Register Link */}
            <p className="mt-6 text-center text-xs text-slate-400">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-violet-400 hover:text-violet-300 font-semibold transition">
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
