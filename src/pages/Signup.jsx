import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, MapPin, Lock, Camera, Sparkles, ArrowRight } from 'lucide-react';

const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    area: '',
    city: '',
    state: '',
    password: '',
    profilePic: null
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    try {
      signup(formData);
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl glass-dark rounded-[3rem] p-10 lg:p-16 border border-white/10 shadow-4xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-32 bg-orange-500/10 blur-[100px] rounded-full -z-10" />
        
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-widest mb-6">
            <Sparkles size={14} />
            <span>Join the PETLY Pack</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-white mb-4">Create Account</h1>
          <p className="text-white/40 font-medium">Start your digital pet parenthood journey today.</p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm font-bold flex items-center gap-3">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div className="space-y-2">
              <label className="text-xs font-black text-white/30 uppercase tracking-widest ml-4">Full Name</label>
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                <input 
                  type="text" name="fullName" required value={formData.fullName} onChange={handleChange}
                  placeholder="John Doe"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-medium text-white outline-none focus:border-orange-500/50 transition-all"
                />
              </div>
            </div>

            {/* Email */}
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Phone */}
            <div className="space-y-2">
              <label className="text-xs font-black text-white/30 uppercase tracking-widest ml-4">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                <input 
                  type="tel" name="phone" required value={formData.phone} onChange={handleChange}
                  placeholder="+1 234 567 890"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-medium text-white outline-none focus:border-orange-500/50 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-xs font-black text-white/30 uppercase tracking-widest ml-4">Password</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                <input 
                  type="password" name="password" required value={formData.password} onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-medium text-white outline-none focus:border-orange-500/50 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Location Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-white/30 uppercase tracking-widest ml-4">Area</label>
              <input 
                type="text" name="area" required value={formData.area} onChange={handleChange}
                placeholder="Downtown"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-medium text-white outline-none focus:border-orange-500/50 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-white/30 uppercase tracking-widest ml-4">City</label>
              <input 
                type="text" name="city" required value={formData.city} onChange={handleChange}
                placeholder="New York"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-medium text-white outline-none focus:border-orange-500/50 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-white/30 uppercase tracking-widest ml-4">State</label>
              <input 
                type="text" name="state" required value={formData.state} onChange={handleChange}
                placeholder="NY"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-medium text-white outline-none focus:border-orange-500/50 transition-all"
              />
            </div>
          </div>

          {/* Profile Picture Placeholder */}
          <div className="pt-4">
            <div className="flex items-center gap-6 p-6 rounded-2xl bg-white/5 border border-dashed border-white/10 hover:border-orange-500/50 transition-all cursor-pointer group">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 group-hover:text-orange-500 group-hover:bg-orange-500/10 transition-all">
                <Camera size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-white mb-1">Set Profile Picture</p>
                <p className="text-xs text-white/40">Upload your best photo to stand out.</p>
              </div>
            </div>
          </div>

          <button 
            type="submit"
            className="w-full py-5 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-3 group"
          >
            Create PETLY Account
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-12 text-center">
          <p className="text-white/40 text-sm font-medium">
            Already have an account? <Link to="/login" className="text-orange-400 font-bold hover:underline">Log In</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
