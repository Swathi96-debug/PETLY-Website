import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ForgotPassword = () => {
  const { resetPassword } = useAuth();
  const [form, setForm] = useState({ identifier: '', password: '', confirm: '' });
  const [status, setStatus] = useState('step-one');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!form.identifier.trim()) {
      setError('Enter your email address or phone number.');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }

    try {
      resetPassword(form.identifier.trim(), form.password);
      setMessage('Password reset complete. Use your new credentials to log in.');
      setStatus('done');
      setForm({ identifier: '', password: '', confirm: '' });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-20 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl glass-dark rounded-[3rem] p-10 lg:p-16 border border-white/10 shadow-4xl relative overflow-hidden"
      >
        <div className="absolute -bottom-24 -left-24 p-32 bg-orange-500/10 blur-[100px] rounded-full -z-10" />

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-6">
            <Mail size={14} className="fill-current" />
            <span>Account Recovery</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-white mb-4">Forgot Password</h1>
          <p className="text-white/40 font-medium">Enter your email or phone, then create a new password for PETLY.</p>
        </div>

        <div className="space-y-8">
          <div className="p-10 rounded-[2rem] bg-white/5 border border-white/10 text-center">
            <div className="mx-auto w-20 h-20 rounded-[2.5rem] bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-6">
              <CheckCircle2 size={40} />
            </div>
            <p className="text-white/40 text-sm leading-relaxed">
              PETLY password reset is handled entirely in-browser. Your account will be updated immediately and stored locally.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-white/30 uppercase tracking-widest ml-4">Email or Phone Number</label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                <input
                  type="text"
                  name="identifier"
                  value={form.identifier}
                  onChange={handleChange}
                  placeholder="john@example.com or +1 234 567 890"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-medium text-white outline-none focus:border-orange-500/50 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-white/30 uppercase tracking-widest ml-4">New Password</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-medium text-white outline-none focus:border-orange-500/50 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-white/30 uppercase tracking-widest ml-4">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                <input
                  type="password"
                  name="confirm"
                  value={form.confirm}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-medium text-white outline-none focus:border-orange-500/50 transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="text-left px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold">
                {error}
              </div>
            )}

            {message && (
              <div className="text-left px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-bold">
                {message}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-5 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-3"
            >
              Reset Password
            </button>
          </form>

          <div className="text-center">
            <Link to="/login" className="inline-flex items-center gap-2 text-sm font-black text-white/40 hover:text-white">
              <ArrowLeft size={16} /> Back to Login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
