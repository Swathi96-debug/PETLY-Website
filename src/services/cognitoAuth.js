import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
} from 'amazon-cognito-identity-js';

const poolData = {
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || 'ap-south-1_FOSSdDF3X',
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '6t5n62bf51u15ga6scg5lu78g1',
};

const userPool = new CognitoUserPool(poolData);

export const getUserPool = () => userPool;

/**
 * Format phone number to E.164 if not already formatted
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  const trimmed = phone.trim();
  if (trimmed.startsWith('+')) return trimmed;
  // If 10 digits (e.g. India standard), prefix with +91
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length === 10) {
    return `+91${digitsOnly}`;
  }
  return `+${digitsOnly}`;
};

/**
 * Register user in Cognito User Pool
 */
export const cognitoSignUp = ({ username, password, email, phone, fullName }) => {
  return new Promise((resolve, reject) => {
    const attributeList = [];

    if (email) {
      attributeList.push(new CognitoUserAttribute({ Name: 'email', Value: email.trim().toLowerCase() }));
    }

    if (fullName) {
      attributeList.push(new CognitoUserAttribute({ Name: 'name', Value: fullName.trim() }));
    }

    if (phone) {
      const formattedPhone = formatPhoneNumber(phone);
      attributeList.push(new CognitoUserAttribute({ Name: 'phone_number', Value: formattedPhone }));
    }

    // Use email or phone as username
    const authUsername = (username || email || formatPhoneNumber(phone)).trim();

    userPool.signUp(authUsername, password, attributeList, null, (err, result) => {
      if (err) {
        return reject(err);
      }
      resolve({
        user: result.user,
        userConfirmed: result.userConfirmed,
        userSub: result.userSub,
        codeDeliveryDetails: result.codeDeliveryDetails,
        username: authUsername,
      });
    });
  });
};

/**
 * Confirm user signup with email/phone verification code
 */
export const cognitoConfirmSignUp = (username, code) => {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({
      Username: username.trim(),
      Pool: userPool,
    });

    cognitoUser.confirmRegistration(code.trim(), true, (err, result) => {
      if (err) {
        return reject(err);
      }
      resolve(result);
    });
  });
};

/**
 * Resend verification code
 */
export const cognitoResendCode = (username) => {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({
      Username: username.trim(),
      Pool: userPool,
    });

    cognitoUser.resendConfirmationCode((err, result) => {
      if (err) {
        return reject(err);
      }
      resolve(result);
    });
  });
};

/**
 * Authenticate with Cognito (SRP Protocol)
 * Supports email or phone number as username
 */
export const cognitoLogin = (username, password) => {
  return new Promise((resolve, reject) => {
    // If identifier is pure digits or starts with +, format as phone
    let authUsername = username.trim();
    if (!authUsername.includes('@') && (authUsername.startsWith('+') || /^\d+$/.test(authUsername.replace(/\s|-/g, '')))) {
      authUsername = formatPhoneNumber(authUsername);
    } else {
      authUsername = authUsername.toLowerCase();
    }

    const authenticationDetails = new AuthenticationDetails({
      Username: authUsername,
      Password: password,
    });

    const cognitoUser = new CognitoUser({
      Username: authUsername,
      Pool: userPool,
    });

    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (session) => {
        const idToken = session.getIdToken().getJwtToken();
        const accessToken = session.getAccessToken().getJwtToken();
        const refreshToken = session.getRefreshToken().getToken();
        const payload = session.getIdToken().decodePayload();

        resolve({
          idToken,
          accessToken,
          refreshToken,
          payload,
          userSub: payload.sub,
          username: authUsername,
        });
      },
      onFailure: (err) => {
        if (err && !err.username) {
          err.username = authUsername;
        }
        reject(err);
      },
    });
  });
};

/**
 * Get active Cognito session if available
 */
export const cognitoGetSession = () => {
  return new Promise((resolve) => {
    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) {
      return resolve(null);
    }

    cognitoUser.getSession((err, session) => {
      if (err || !session || !session.isValid()) {
        return resolve(null);
      }

      const idToken = session.getIdToken().getJwtToken();
      const accessToken = session.getAccessToken().getJwtToken();
      const payload = session.getIdToken().decodePayload();

      resolve({
        idToken,
        accessToken,
        payload,
        userSub: payload.sub,
        cognitoUser,
      });
    });
  });
};

/**
 * Sign out of Cognito session
 */
export const cognitoSignOut = () => {
  const cognitoUser = userPool.getCurrentUser();
  if (cognitoUser) {
    cognitoUser.signOut();
  }
};

/**
 * Initiate Cognito Forgot Password flow
 * Requests a verification code sent to verified email/phone
 */
export const cognitoForgotPassword = (username) => {
  return new Promise((resolve, reject) => {
    let authUsername = username.trim();
    if (!authUsername.includes('@') && (authUsername.startsWith('+') || /^\d+$/.test(authUsername.replace(/\s|-/g, '')))) {
      authUsername = formatPhoneNumber(authUsername);
    } else {
      authUsername = authUsername.toLowerCase();
    }

    const cognitoUser = new CognitoUser({
      Username: authUsername,
      Pool: userPool,
    });

    cognitoUser.forgotPassword({
      onSuccess: (data) => {
        resolve({
          username: authUsername,
          codeDeliveryDetails: data?.CodeDeliveryDetails || data?.codeDeliveryDetails || data,
        });
      },
      onFailure: (err) => {
        reject(err);
      },
      inputVerificationCode: (data) => {
        resolve({
          username: authUsername,
          codeDeliveryDetails: data?.CodeDeliveryDetails || data?.codeDeliveryDetails || data,
        });
      },
    });
  });
};

/**
 * Confirm Cognito Forgot Password with verification code and new password
 */
export const cognitoConfirmPassword = (username, verificationCode, newPassword) => {
  return new Promise((resolve, reject) => {
    let authUsername = username.trim();
    if (!authUsername.includes('@') && (authUsername.startsWith('+') || /^\d+$/.test(authUsername.replace(/\s|-/g, '')))) {
      authUsername = formatPhoneNumber(authUsername);
    } else {
      authUsername = authUsername.toLowerCase();
    }

    const cognitoUser = new CognitoUser({
      Username: authUsername,
      Pool: userPool,
    });

    cognitoUser.confirmPassword(verificationCode.trim(), newPassword, {
      onSuccess: (result) => {
        resolve(result || 'SUCCESS');
      },
      onFailure: (err) => {
        reject(err);
      },
    });
  });
};
