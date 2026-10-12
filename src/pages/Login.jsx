import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Mail, Phone, Lock, ArrowRight, Zap, CheckCircle2, RefreshCw, KeyRound, ShieldCheck } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { login, confirmSignUp, resendVerification } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Auth state
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
  });

  // Verification state (if account unconfirmed)
  const [needsVerification, setNeedsVerification] = useState(false);
  const [unconfirmedUser, setUnconfirmedUser] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [deliveryDetails, setDeliveryDetails] = useState(null);
  const [resending, setResending] = useState(false);

  // Explicit Legacy Login Mode
  const [useLegacyMode, setUseLegacyMode] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      if (needsVerification) {
        // Confirm account
        await confirmSignUp(unconfirmedUser, verificationCode);
        setSuccessMsg('Account verified successfully! Logging you in...');
        // Auto-login after verification
        await login(unconfirmedUser, formData.password, 'cognito');
        navigate('/profile');
        return;
      }

      // Explicit authentication mode: 'legacy' vs 'cognito'
      const mode = useLegacyMode ? 'legacy' : 'cognito';
      await login(formData.identifier, formData.password, mode);
      navigate('/profile');
    } catch (err) {
      if (err.code === 'UserNotConfirmedException') {
        setNeedsVerification(true);
        const username = err.username || formData.identifier;
        setUnconfirmedUser(username);
        const details = err.codeDeliveryDetails || null;
        setDeliveryDetails(details);
        if (details?.DeliveryMedium && details?.Destination) {
          setError(`Your account is not verified yet. Verification code sent via ${details.DeliveryMedium} to ${details.Destination}.`);
        } else {
          setError('Your account is not verified yet. A verification code was sent to your email/phone.');
        }
      } else {
        setError(err.message || 'Login failed. Please verify your credentials.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!unconfirmedUser) return;
    setResending(true);
    setError('');
    try {
      const res = await resendVerification(unconfirmedUser);
      const details = res?.CodeDeliveryDetails || res?.codeDeliveryDetails || res;
      if (details?.DeliveryMedium && details?.Destination) {
        setDeliveryDetails(details);
        setSuccessMsg(`A new verification code was sent via ${details.DeliveryMedium} to ${details.Destination}.`);
      } else {
        setSuccessMsg('Verification code resent successfully.');
      }
    } catch (err) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setResending(false);
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
        
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-4">
            <Zap size={14} className="fill-current" />
            <span>{useLegacyMode ? 'Legacy PETLY Account' : 'AWS Cognito Authentication'}</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white mb-2">
            {needsVerification ? 'Verify Your Account' : 'Welcome Back'}
          </h1>
          <p className="text-white/40 font-medium text-sm">
            {needsVerification
              ? (deliveryDetails?.DeliveryMedium && deliveryDetails?.Destination
                  ? `Enter the 6-digit confirmation code sent via ${deliveryDetails.DeliveryMedium} to ${deliveryDetails.Destination}`
                  : `Enter the 6-digit confirmation code sent to ${unconfirmedUser}`)
              : (useLegacyMode 
                  ? 'Sign in with your original PETLY password' 
                  : 'Sign in with verified Email or Phone number')}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold flex items-center gap-3">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-xs font-bold flex items-center gap-3">
            <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!needsVerification ? (
            <>
              {/* Identifier (Email or Phone) */}
              <div className="space-y-2">
                <label className="text-xs font-black text-white/30 uppercase tracking-widest ml-4">
                  {useLegacyMode ? 'Email or Phone' : 'Email Address or Phone (+91...)'}
                </label>
                <div className="relative">
                  {formData.identifier.includes('@') ? (
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                  ) : (
                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                  )}
                  <input 
                    type="text" 
                    name="identifier" 
                    required 
                    value={formData.identifier} 
                    onChange={handleChange}
                    placeholder="user@example.com or +919876543210"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-medium text-white outline-none focus:border-orange-500/50 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-4">
                  <label className="text-xs font-black text-white/30 uppercase tracking-widest">Password</label>
                  <Link to="/forgot" className="text-[10px] font-black text-orange-500/50 uppercase tracking-widest hover:text-orange-400">
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                  <input 
                    type="password" 
                    name="password" 
                    required 
                    value={formData.password} 
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-medium text-white outline-none focus:border-orange-500/50 transition-all"
                  />
                </div>
              </div>
            </>
          ) : (
            /* Verification Code Form */
            <div className="space-y-5">
              <div className="p-5 bg-white/5 border border-white/10 rounded-2xl text-center">
                <ShieldCheck size={36} className="mx-auto text-orange-400 mb-2" />
                <p className="text-white text-xs font-bold mb-1">Account Confirmation Required</p>
                <p className="text-xs text-white/50">
                  {deliveryDetails?.DeliveryMedium && deliveryDetails?.Destination ? (
                    <>
                      Verification code sent via <span className="text-orange-400 font-bold">{deliveryDetails.DeliveryMedium}</span> to <span className="text-white font-semibold">{deliveryDetails.Destination}</span>.
                    </>
                  ) : (
                    <>
                      A verification code was sent to <span className="text-white font-semibold">{unconfirmedUser}</span>.
                    </>
                  )}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-white/30 uppercase tracking-widest ml-4">
                  6-Digit Verification Code
                </label>
                <input 
                  type="text" 
                  required
                  maxLength={6}
                  value={verificationCode} 
                  onChange={(e) => setVerificationCode(e.target.value.trim())}
                  placeholder="123456"
                  className="w-full bg-white/5 border border-orange-500/50 rounded-2xl py-4 text-center tracking-widest text-xl font-black text-white outline-none"
                />
              </div>
              <div className="flex justify-between items-center text-xs px-2">
                <button 
                  type="button" 
                  onClick={handleResend} 
                  disabled={resending}
                  className="text-orange-400 hover:underline flex items-center gap-1 font-bold"
                >
                  <RefreshCw size={12} className={resending ? 'animate-spin' : ''} />
                  {resending ? 'Resending...' : 'Resend Code'}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setNeedsVerification(false);
                    setDeliveryDetails(null);
                    setError('');
                  }}
                  className="text-white/40 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <button 
            type="submit"
            disabled={submitting}
            className="w-full py-5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black rounded-2xl transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-3 group"
          >
            {submitting 
              ? (needsVerification ? 'Verifying...' : 'Logging In...') 
              : (needsVerification ? 'Confirm & Log In' : 'Log In to PETLY')}
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        {/* Explicit Legacy Compatibility Option */}
        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <button
            type="button"
            onClick={() => {
              setUseLegacyMode(!useLegacyMode);
              setError('');
              setNeedsVerification(false);
              setDeliveryDetails(null);
            }}
            className="inline-flex items-center gap-2 text-xs font-bold text-white/50 hover:text-orange-400 transition-colors"
          >
            <KeyRound size={14} />
            <span>
              {useLegacyMode 
                ? 'Switch to AWS Cognito Login' 
                : 'Have an older account? Use Legacy Login'}
            </span>
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-white/40 text-sm font-medium">
            New to the ecosystem? <Link to="/signup" className="text-orange-400 font-bold hover:underline">Create Account</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
