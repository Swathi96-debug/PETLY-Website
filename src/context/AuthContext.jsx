import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import {
  cognitoSignUp,
  cognitoConfirmSignUp,
  cognitoResendCode,
  cognitoLogin,
  cognitoGetSession,
  cognitoSignOut,
  cognitoForgotPassword,
  cognitoConfirmPassword,
} from '../services/cognitoAuth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Validate and restore session on application mount
  useEffect(() => {
    const initializeAuth = async () => {
      // 1. Try to restore active Cognito session if available
      try {
        const cognitoSession = await cognitoGetSession();
        if (cognitoSession?.idToken) {
          localStorage.setItem('petly_token', cognitoSession.idToken);
        }
      } catch (err) {
        console.warn('[Cognito Session Check]:', err);
      }

      const token = localStorage.getItem('petly_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await authAPI.getMe();
        if (response.success && response.user) {
          setUser(response.user);
          localStorage.setItem('petly_current_user', JSON.stringify(response.user));
        }
      } catch (error) {
        // If token is invalid or expired (401), clear authentication state
        if (error.status === 401) {
          localStorage.removeItem('petly_token');
          localStorage.removeItem('petly_current_user');
          cognitoSignOut();
          setUser(null);
        } else {
          // Fall back to cached user in case of transient offline state
          const cached = localStorage.getItem('petly_current_user');
          if (cached) {
            try {
              setUser(JSON.parse(cached));
            } catch {
              setUser(null);
            }
          }
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Register a new user via AWS Cognito
   */
  const signup = async (userData) => {
    // 1. Register with Cognito User Pool
    const cognitoResult = await cognitoSignUp({
      username: userData.email,
      password: userData.password,
      email: userData.email,
      phone: userData.phone || '',
      fullName: userData.fullName,
    });

    // Check if account confirmation / verification code is required
    if (!cognitoResult.userConfirmed) {
      return {
        requiresVerification: true,
        username: cognitoResult.username || userData.email,
        email: userData.email,
        phone: userData.phone || '',
        codeDeliveryDetails: cognitoResult.codeDeliveryDetails || null,
      };
    }

    // Auto-login and sync if immediately confirmed
    return await login(userData.email, userData.password, 'cognito', { location: userData.location });
  };

  /**
   * Confirm Cognito registration with verification code
   */
  const confirmSignUp = async (username, code) => {
    await cognitoConfirmSignUp(username, code);
    return { success: true, message: 'Account verified successfully. You can now log in.' };
  };

  /**
   * Resend verification code
   */
  const resendVerification = async (username) => {
    return await cognitoResendCode(username);
  };

  /**
   * Authenticate user:
   * - Default mode: 'cognito' (Authenticates against AWS Cognito SRP protocol)
   * - Compatibility mode: 'legacy' (Explicit login for unmigrated MongoDB accounts)
   * No automatic/silent fallbacks.
   */
  const login = async (identifier, password, authMode = 'cognito', extraData = null) => {
    if (authMode === 'legacy') {
      // Explicit legacy JWT login
      const response = await authAPI.login(identifier, password);
      if (response.token) {
        localStorage.setItem('petly_token', response.token);
      }
      if (response.user) {
        setUser(response.user);
        localStorage.setItem('petly_current_user', JSON.stringify(response.user));
      }
      return response.user;
    }

    // Standard AWS Cognito login flow
    try {
      const authResult = await cognitoLogin(identifier, password);

      // Store Cognito ID Token for API Authorization header
      if (authResult.idToken) {
        localStorage.setItem('petly_token', authResult.idToken);
      }

      // Synchronize with MongoDB User document
      const syncPayload = {
        idToken: authResult.idToken,
        accessToken: authResult.accessToken,
      };
      if (extraData?.location) {
        syncPayload.location = extraData.location;
      }

      const syncResponse = await authAPI.cognitoSync(syncPayload);

      if (syncResponse.success && syncResponse.user) {
        setUser(syncResponse.user);
        localStorage.setItem('petly_current_user', JSON.stringify(syncResponse.user));
        return syncResponse.user;
      }

      throw new Error('Failed to synchronize user account.');
    } catch (err) {
      // Map Cognito error states explicitly
      if (err.code === 'UserNotConfirmedException') {
        const details = err.codeDeliveryDetails || err.CodeDeliveryDetails || err.data?.CodeDeliveryDetails || null;
        const unconfirmedErr = new Error(
          details?.DeliveryMedium && details?.Destination
            ? `Your account is not verified yet. Verification code sent via ${details.DeliveryMedium} to ${details.Destination}.`
            : 'Your account is not verified yet. Please enter the verification code sent to your email/phone.'
        );
        unconfirmedErr.code = 'UserNotConfirmedException';
        unconfirmedErr.username = err.username || identifier;
        unconfirmedErr.codeDeliveryDetails = details;
        throw unconfirmedErr;
      }
      if (err.code === 'UserNotFoundException') {
        const notFoundErr = new Error('No Cognito account found for this identifier. If you have an existing PETLY account created before Cognito integration, please use the Legacy Login option below.');
        notFoundErr.code = 'UserNotFoundException';
        notFoundErr.canUseLegacy = true;
        throw notFoundErr;
      }
      if (err.code === 'NotAuthorizedException') {
        throw new Error('Incorrect email/phone or password. Please verify your credentials.');
      }
      throw err;
    }
  };

  /**
   * Terminate user session
   */
  const logout = () => {
    cognitoSignOut();
    localStorage.removeItem('petly_token');
    localStorage.removeItem('petly_current_user');
    setUser(null);
  };

  /**
   * Update authenticated user's profile
   */
  const updateUser = async (updatedData) => {
    const response = await authAPI.updateProfile(updatedData);
    if (response.user) {
      setUser(response.user);
      localStorage.setItem('petly_current_user', JSON.stringify(response.user));
      return response.user;
    }
  };

  /**
   * Request Cognito password reset verification code
   */
  const forgotPassword = async (identifier) => {
    return await cognitoForgotPassword(identifier);
  };

  /**
   * Confirm Cognito password reset with code and new password
   */
  const confirmPasswordReset = async (identifier, verificationCode, newPassword) => {
    return await cognitoConfirmPassword(identifier, verificationCode, newPassword);
  };

  /**
   * Legacy password reset request alias
   */
  const resetPassword = async (identifier) => {
    return await cognitoForgotPassword(identifier);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signup,
        confirmSignUp,
        resendVerification,
        login,
        logout,
        forgotPassword,
        confirmPasswordReset,
        resetPassword,
        updateUser,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
