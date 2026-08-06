import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Sparkles, ArrowRight, Zap } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    try {
      login(formData.email, formData.password);
      navigate('/profile');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen pt-32 pb-20 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md glass-dark rounded-[3rem] p-10 lg:p-16 border border-white/10 shadow-4xl relative overflow-hidden"
      >
        <div className="absolute -bottom-24 -left-24 p-32 bg-orange-500/10 blur-[100px] rounded-full -z-10" />
        
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-6">
            <Zap size={14} className="fill-current" />
            <span>Secure Neural Login</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-white mb-4">Welcome Back</h1>
          <p className="text-white/40 font-medium">Access your PETLY ecosystem.</p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm font-bold flex items-center gap-3">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-white/30 uppercase tracking-widest ml-4">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={18} />
              <input 
                type="email" name="email" required value={formData.email} onChange={handleChange}
                placeholder="john@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-medium text-white outline-none focus:border-orange-500/50 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center px-4">
              <label className="text-xs font-black text-white/30 uppercase tracking-widest">Password</label>
              <a href="#" className="text-[10px] font-black text-orange-500/50 uppercase tracking-widest hover:text-orange-400">Forgot?</a>
            </div>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={18} />
              <input 
                type="password" name="password" required value={formData.password} onChange={handleChange}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-medium text-white outline-none focus:border-orange-500/50 transition-all"
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full py-5 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-3 group"
          >
            Log In to PETLY
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-12 text-center">
          <p className="text-white/40 text-sm font-medium">
            New to the ecosystem? <Link to="/signup" className="text-orange-400 font-bold hover:underline">Create Account</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
