import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { verifyCognitoToken, resolveMongoUserFromCognitoPayload } from '../utils/cognitoVerifier.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Check if token is a Cognito RS256 token
      const parts = token.split('.');
      if (parts.length === 3) {
        let header = null;
        try {
          header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
        } catch {
          // not valid json header, fallback to standard jwt
        }

        if (header && header.alg === 'RS256') {
          // Verify via Cognito JWKS
          const payload = await verifyCognitoToken(token);
          req.user = await resolveMongoUserFromCognitoPayload(payload);
          if (!req.user) {
            return res.status(401).json({
              success: false,
              message: 'User belonging to this Cognito token could not be resolved.',
            });
          }
          return next();
        }
      }

      // Fallback to legacy JWT verification
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'petly_jwt_super_secret_key_2026_change_in_production'
      );

      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User belonging to this token no longer exists.',
        });
      }

      next();
    } catch (error) {
      console.error('[Auth Middleware Error]:', error.message);
      const status = error.statusCode || 401;
      return res.status(status).json({
        success: false,
        message: error.message || 'Not authorized, token failed or expired.',
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no bearer token provided.',
    });
  }
};

export const optionalProtect = async (req, res, next) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const parts = token.split('.');
      if (parts.length === 3) {
        let header = null;
        try {
          header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
        } catch {}

        if (header && header.alg === 'RS256') {
          const payload = await verifyCognitoToken(token);
          req.user = await resolveMongoUserFromCognitoPayload(payload);
          return next();
        }
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'petly_jwt_super_secret_key_2026_change_in_production'
      );

      req.user = await User.findById(decoded.id).select('-password');
    } catch {
      // Ignore invalid or expired token for optional auth routes
    }
  }
  next();
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user?.role}' is not authorized to access this route`
      });
    }
    next();
  };
};
