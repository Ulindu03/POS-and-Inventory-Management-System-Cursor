import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { authApi } from '@/lib/api/auth.api';
import { Toaster, toast } from 'sonner';

const ResetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { toast.error('Invalid reset link'); return; }
    if (!password || password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (password !== confirm) { toast.error('Passwords do not match'); return; }
    try {
      setLoading(true);
      await authApi.resetPassword(token, password);
      toast.success('Password reset successful. Please sign in.');
      setTimeout(() => navigate('/login', { replace: true }), 800);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Reset failed. Link may be expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
      <Toaster position="top-right" richColors />
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 bg-white/5 border border-white/10 rounded-2xl p-6">
        <h1 className="text-2xl font-bold">Reset Password</h1>
        <p className="text-sm text-white/70">Enter a new password for your account.</p>
        <div>
          <label className="block text-sm mb-1">New Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-yellow-300"
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Confirm Password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-yellow-300"
            autoComplete="new-password"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg font-semibold bg-yellow-400 text-black disabled:opacity-60"
        >
          {loading ? 'Resetting…' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
};

export default ResetPasswordPage;
