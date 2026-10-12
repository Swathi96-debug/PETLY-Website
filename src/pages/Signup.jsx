import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Lock, Sparkles, ArrowRight, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react';
import IndianLocationSelector from '../components/Location/IndianLocationSelector';

const Signup = () => {
  const navigate = useNavigate();
  const { signup, confirmSignUp, resendVerification, login } = useAuth();
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  // Form inputs
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  });

  // Location selector state
  const [locationData, setLocationData] = useState({
    state: '',
    city: '',
    pincode: '',
    area: '',
  });
  const [locationValid, setLocationValid] = useState(false);

  // Verification step state
  const [verificationPending, setVerificationPending] = useState(false);
  const [unconfirmedUsername, setUnconfirmedUsername] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [deliveryDetails, setDeliveryDetails] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      if (verificationPending) {
        // Step 2: Confirm registration code
        await confirmSignUp(unconfirmedUsername, verificationCode);
        setSuccessMsg('Account verified successfully! Logging you in...');
        // Auto-login to complete session and sync with MongoDB, preserving verified location
        await login(unconfirmedUsername, formData.password, 'cognito', { location: locationData });
        navigate('/profile');
        return;
      }

      // Step 1: Validate location selection first
      if (!locationValid) {
        setError('Please verify and select a complete Indian location (State, City, 6-digit PIN, and Area).');
        setSubmitting(false);
        return;
      }

      // Register in Cognito User Pool, attaching location for subsequent sync
      const result = await signup({ ...formData, location: locationData });
      if (result?.requiresVerification) {
        setVerificationPending(true);
        setUnconfirmedUsername(result.username || formData.email);
        setDeliveryDetails(result.codeDeliveryDetails || null);

        const medium = result.codeDeliveryDetails?.DeliveryMedium;
        const destination = result.codeDeliveryDetails?.Destination;
        if (medium && destination) {
          setSuccessMsg(`Verification code sent via ${medium} to ${destination}! Please enter it below to activate your account.`);
        } else {
          setSuccessMsg(`Verification code sent to ${formData.email}! Please enter it below to activate your account.`);
        }
      } else {
        navigate('/profile');
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!unconfirmedUsername) return;
    setResending(true);
    setError('');
    try {
      const res = await resendVerification(unconfirmedUsername);
      const details = res?.CodeDeliveryDetails || res?.codeDeliveryDetails || res;
      if (details?.DeliveryMedium && details?.Destination) {
        setDeliveryDetails(details);
        setSuccessMsg(`A new verification code was sent via ${details.DeliveryMedium} to ${details.Destination}.`);
      } else {
        setSuccessMsg('A new verification code has been dispatched.');
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl glass-dark rounded-[3rem] p-10 lg:p-16 border border-white/10 shadow-4xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-32 bg-orange-500/10 blur-[100px] rounded-full -z-10" />
        
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-widest mb-4">
            <Sparkles size={14} />
            <span>Join the PETLY Pack • AWS Cognito</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white mb-2">
            {verificationPending ? 'Verify Your Account' : 'Create Account'}
          </h1>
          <p className="text-white/40 font-medium text-sm">
            {verificationPending 
              ? (deliveryDetails?.DeliveryMedium && deliveryDetails?.Destination
                  ? `Enter the 6-digit confirmation code sent via ${deliveryDetails.DeliveryMedium} to ${deliveryDetails.Destination}`
                  : `Enter the 6-digit confirmation code sent to ${unconfirmedUsername}`)
              : 'Secure authentication powered by Amazon Cognito identity.'}
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {!verificationPending ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-white/30 uppercase tracking-widest ml-4">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                    <input 
                      type="text" 
                      name="fullName" 
                      required 
                      value={formData.fullName} 
                      onChange={handleChange}
                      placeholder="Jane Doe"
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
                      type="email" 
                      name="email" 
                      required 
                      value={formData.email} 
                      onChange={handleChange}
                      placeholder="jane@example.com"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-medium text-white outline-none focus:border-orange-500/50 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Phone */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-white/30 uppercase tracking-widest ml-4">Phone Number (+91...)</label>
                  <div className="relative">
                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                    <input 
                      type="tel" 
                      name="phone" 
                      value={formData.phone} 
                      onChange={handleChange}
                      placeholder="+91 9876543210"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-medium text-white outline-none focus:border-orange-500/50 transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-white/30 uppercase tracking-widest ml-4">Password (Min 8 chars, 1 Upper, 1 Special)</label>
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
              </div>

              {/* Structured Indian Location Selector */}
              <div className="pt-2">
                <IndianLocationSelector
                  value={locationData}
                  onChange={(newLoc, isValid) => {
                    setLocationData(newLoc);
                    setLocationValid(isValid);
                  }}
                />
              </div>
            </>
          ) : (
            /* Verification Code UI */
            <div className="space-y-6 py-4">
              <div className="p-6 bg-white/5 border border-white/10 rounded-2xl text-center">
                <ShieldCheck size={40} className="mx-auto text-orange-400 mb-3" />
                <p className="text-white text-sm font-bold mb-1">Enter Verification Code</p>
                <p className="text-xs text-white/40">
                  {deliveryDetails?.DeliveryMedium && deliveryDetails?.Destination ? (
                    <>
                      Verification code sent via <span className="text-orange-400 font-bold">{deliveryDetails.DeliveryMedium}</span> to <span className="text-white font-semibold">{deliveryDetails.Destination}</span>.
                    </>
                  ) : (
                    <>
                      A 6-digit confirmation code was sent to <span className="text-white font-semibold">{unconfirmedUsername}</span>.
                    </>
                  )}
                </p>
              </div>

              <div className="space-y-2 max-w-xs mx-auto">
                <label className="text-xs font-black text-white/30 uppercase tracking-widest text-center block">
                  Confirmation Code
                </label>
                <input 
                  type="text" 
                  required
                  maxLength={6}
                  value={verificationCode} 
                  onChange={(e) => setVerificationCode(e.target.value.trim())}
                  placeholder="123456"
                  className="w-full bg-white/5 border border-orange-500/50 rounded-2xl py-4 text-center tracking-widest text-2xl font-black text-white outline-none"
                />
              </div>

              <div className="flex justify-between items-center text-xs px-4 max-w-xs mx-auto">
                <button 
                  type="button" 
                  onClick={handleResend} 
                  disabled={resending}
                  className="text-orange-400 hover:underline flex items-center gap-1 font-bold"
                >
                  <RefreshCw size={12} className={resending ? 'animate-spin' : ''} />
                  {resending ? 'Sending...' : 'Resend Code'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setVerificationPending(false)}
                  className="text-white/40 hover:text-white"
                >
                  Back to form
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
              ? (verificationPending ? 'Verifying...' : 'Registering in Cognito...') 
              : (verificationPending ? 'Verify & Activate Account' : 'Create PETLY Account')}
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-white/40 text-sm font-medium">
            Already have an account? <Link to="/login" className="text-orange-400 font-bold hover:underline">Log In</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
