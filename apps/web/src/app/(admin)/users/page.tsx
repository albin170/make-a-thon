'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'STAFF',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any>('/users');
      setUsers(res.data || []);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await apiClient.post('/users', formData);
      setSuccess(`Account for ${formData.email} successfully created and saved to database.`);
      setFormData({ firstName: '', lastName: '', email: '', password: '', role: 'STAFF' });
      setShowModal(false);
      await fetchUsers();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create user account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Staff & Administrative Users</h1>
          <p className="text-sm text-slate-400 mt-1">
            Admin power: add new Admin and Staff accounts directly into the database.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-neon px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-violet-600/30 self-start sm:self-auto"
        >
          <span>+</span> Add New User (Admin / Staff)
        </button>
      </div>

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <span>✓</span>
          <span>{success}</span>
        </div>
      )}

      {/* Glassmorphism Table Card */}
      <div className="glass-card rounded-3xl overflow-hidden shadow-2xl border border-white/10">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm divide-y divide-white/10">
            <thead className="bg-white/[0.03] text-slate-400 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
                      Loading staff and admin accounts...
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.03] transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {(u.firstName || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {u.firstName || 'User'} {u.lastName || ''}
                          </p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          u.role === 'ADMIN'
                            ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                            : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                        }`}
                      >
                        {u.role === 'ADMIN' ? '🛡️ ADMIN' : '💼 STAFF'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        ACTIVE
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                      {new Date(u.createdAt || Date.now()).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for adding Admin or Staff */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="glass-card rounded-3xl border border-white/20 max-w-md w-full p-6 sm:p-8 shadow-2xl relative">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Add Admin or Staff Account</h2>
                <p className="text-xs text-slate-400 mt-0.5">New credentials will be persisted to the database.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                    placeholder="Admin"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                    placeholder="Member"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                  placeholder="newstaff@brightloop.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                  placeholder="Min 6 characters"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Role & Authority</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl glass-input text-white bg-slate-900"
                >
                  <option value="STAFF">Internal Staff (Operational Access)</option>
                  <option value="ADMIN">Administrator (Full System Control)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-neon px-5 py-2 rounded-xl text-xs font-bold"
                >
                  {submitting ? 'Creating...' : 'Create Account →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
