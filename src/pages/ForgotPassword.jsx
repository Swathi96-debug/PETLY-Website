import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Phone, Lock, CheckCircle2, ArrowLeft, ArrowRight, ShieldCheck, RefreshCw, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { forgotPassword, confirmPasswordReset } = useAuth();

  // Wizard steps: 'request' | 'confirm' | 'success'
  const [step, setStep] = useState('request');

  // Form states
  const [identifier, setIdentifier] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Cognito Delivery Details state
  const [deliveryDetails, setDeliveryDetails] = useState(null);

  // Status & feedback
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const mapCognitoError = (err) => {
    if (!err) return 'An unexpected error occurred. Please try again.';
    const code = err.code || err.name;
    switch (code) {
      case 'UserNotFoundException':
        return 'No Cognito account found for this email/phone. If you have an older account created before Cognito integration, please use Legacy Login on the login page.';
      case 'CodeMismatchException':
        return 'Invalid verification code. Please check the 6-digit code and try again.';
      case 'ExpiredCodeException':
        return 'The verification code has expired. Please click "Resend Code" to receive a new one.';
      case 'LimitExceededException':
        return 'Attempt limit exceeded. Please wait a few minutes before trying again.';
      case 'InvalidPasswordException':
        return 'Password does not meet security requirements. Must be at least 8 characters with uppercase, lowercase, number, and special character.';
      case 'InvalidParameterException':
        return err.message || 'Please provide valid information.';
      default:
        return err.message || 'Failed to process password reset. Please try again.';
    }
  };

  // Step 1: Request reset verification code from Cognito
  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!identifier.trim()) {
      setError('Please enter your email address or phone number.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await forgotPassword(identifier.trim());
      const details = result?.codeDeliveryDetails || result?.CodeDeliveryDetails || result;
      setDeliveryDetails(details || null);

      const medium = details?.DeliveryMedium || 'EMAIL';
      const destination = details?.Destination || identifier.trim();

      setSuccessMsg(`Verification code sent via ${medium} to ${destination}.`);
      setStep('confirm');
    } catch (err) {
      setError(mapCognitoError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2: Confirm new password with verification code in Cognito
  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!verificationCode.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await confirmPasswordReset(identifier.trim(), verificationCode.trim(), newPassword);
      setSuccessMsg('Your password has been reset successfully! You can now log in with your new password.');
      setStep('success');
      // Clear sensitive form state from memory
      setVerificationCode('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(mapCognitoError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Resend code via Cognito
  const handleResend = async () => {
    if (!identifier.trim()) return;
    setResending(true);
    setError('');
    try {
      const result = await forgotPassword(identifier.trim());
      const details = result?.codeDeliveryDetails || result?.CodeDeliveryDetails || result;
      if (details?.DeliveryMedium && details?.Destination) {
        setDeliveryDetails(details);
        setSuccessMsg(`A fresh verification code was sent via ${details.DeliveryMedium} to ${details.Destination}.`);
      } else {
        setSuccessMsg('A fresh verification code has been dispatched.');
      }
    } catch (err) {
      setError(mapCognitoError(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-20 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl glass-dark rounded-[3rem] p-10 lg:p-16 border border-white/10 shadow-4xl relative overflow-hidden"
      >
        <div className="absolute -bottom-24 -left-24 p-32 bg-orange-500/10 blur-[100px] rounded-full -z-10" />

        {/* Header Badge & Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-widest mb-4">
            <Sparkles size={14} />
            <span>AWS Cognito • Secure Recovery</span>
          </div>

          <h1 className="text-4xl font-black tracking-tighter text-white mb-2">
            {step === 'request' && 'Reset Password'}
            {step === 'confirm' && 'Create New Password'}
            {step === 'success' && 'Password Updated'}
          </h1>

          <p className="text-white/40 font-medium text-sm">
            {step === 'request' && 'Enter your email or phone to receive a secure Cognito verification code.'}
            {step === 'confirm' && (
              deliveryDetails?.DeliveryMedium && deliveryDetails?.Destination
                ? `Enter the confirmation code sent via ${deliveryDetails.DeliveryMedium} to ${deliveryDetails.Destination}`
                : `Enter the 6-digit confirmation code sent to ${identifier}`
            )}
            {step === 'success' && 'Your PETLY account is now secured with your new credentials.'}
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold flex items-center gap-3">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Notification */}
        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-xs font-bold flex items-center gap-3">
            <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* STEP 1: Request Code Form */}
        {step === 'request' && (
          <form onSubmit={handleRequestCode} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-white/30 uppercase tracking-widest ml-4">
                Email Address or Phone Number
              </label>
              <div className="relative">
                {identifier.includes('@') ? (
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                ) : (
                  <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                )}
                <input
                  type="text"
                  name="identifier"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="user@example.com or +919876543210"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-medium text-white outline-none focus:border-orange-500/50 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black rounded-2xl transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-3 group"
            >
              {submitting ? 'Requesting Code...' : 'Send Verification Code'}
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        )}

        {/* STEP 2: Confirm Verification Code & Set New Password */}
        {step === 'confirm' && (
          <form onSubmit={handleConfirmReset} className="space-y-6">
            {/* Delivery Details Card */}
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl text-center">
              <ShieldCheck size={36} className="mx-auto text-orange-400 mb-2" />
              <p className="text-white text-sm font-bold mb-1">Enter Verification Code</p>
              <p className="text-xs text-white/50">
                {deliveryDetails?.DeliveryMedium && deliveryDetails?.Destination ? (
                  <>
                    Verification code sent via <span className="text-orange-400 font-bold">{deliveryDetails.DeliveryMedium}</span> to <span className="text-white font-semibold">{deliveryDetails.Destination}</span>.
                  </>
                ) : (
                  <>
                    A verification code was sent to <span className="text-white font-semibold">{identifier}</span>.
                  </>
                )}
              </p>
            </div>

            {/* Verification Code Input */}
            <div className="space-y-2 max-w-xs mx-auto">
              <label className="text-xs font-black text-white/30 uppercase tracking-widest text-center block">
                6-Digit Confirmation Code
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

            {/* New Password Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-white/30 uppercase tracking-widest ml-4">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-medium text-white outline-none focus:border-orange-500/50 transition-all"
                  />
                </div>
              </div>
            </div>

            <p className="text-[11px] text-white/30 text-center">
              Must be at least 8 characters with uppercase, lowercase, numbers, and special symbols.
            </p>

            <div className="flex justify-between items-center text-xs px-2">
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
                onClick={() => {
                  setStep('request');
                  setError('');
                }}
                className="text-white/40 hover:text-white"
              >
                Change Email / Phone
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black rounded-2xl transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-3 group"
            >
              {submitting ? 'Resetting Password...' : 'Save New Password & Confirm'}
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        )}

        {/* STEP 3: Success State */}
        {step === 'success' && (
          <div className="space-y-8 text-center">
            <div className="p-8 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Password Successfully Reset</h2>
              <p className="text-white/60 text-sm leading-relaxed max-w-sm mx-auto">
                Your Cognito account credentials have been updated. You can now log in securely using your new password.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full py-5 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-3 group"
            >
              <span>Back to Login</span>
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="mt-10 text-center">
          <Link to="/login" className="inline-flex items-center gap-2 text-xs font-bold text-white/40 hover:text-white transition-colors">
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
