import crypto from 'crypto';
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import { verifyCognitoToken, resolveMongoUserFromCognitoPayload } from '../utils/cognitoVerifier.js';

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
export const signup = async (req, res, next) => {
  try {
    const { fullName, email, phone, location, password, role, shelterDetails } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide fullName, email, and password.',
      });
    }

    // Security Constraint: Public signup can ONLY create 'user' or 'shelter' accounts. Admin role is NEVER allowed via public signup.
    let assignedRole = 'user';
    if (role === 'shelter') {
      assignedRole = 'shelter';
    } else if (role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin account creation is forbidden via public signup.',
      });
    }

    // Check if user already exists with email
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    // Check if user already exists with phone if provided
    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: 'An account with this phone number already exists.',
        });
      }
    }

    // Create user instance
    const user = await User.create({
      fullName,
      email,
      phone: phone || '',
      location: location || '',
      password,
      role: assignedRole,
      shelterDetails: assignedRole === 'shelter' ? (shelterDetails || {}) : {},
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        location: user.location,
        shelterDetails: user.shelterDetails,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { identifier: idField, email, phone, password } = req.body;
    const identifier = idField || email || phone;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email/phone and password.',
      });
    }

    // Find user by email or phone and include password for matching
    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { phone: identifier }],
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        location: user.location,
        shelterDetails: user.shelterDetails,
        addresses: user.addresses || [],
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res, next) => {
  try {
    const { fullName, email, phone, location, bio, avatarUrl, shelterDetails } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (fullName !== undefined) {
      const trimmedName = fullName.trim();
      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          message: 'Full name is required.',
        });
      }
      user.fullName = trimmedName;
    }

    if (email !== undefined) {
      const trimmedEmail = email.trim().toLowerCase();
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address.',
        });
      }

      if (trimmedEmail !== user.email) {
        const existing = await User.findOne({ email: trimmedEmail, _id: { $ne: user._id } });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: 'Email address is already in use by another account.',
          });
        }
        user.email = trimmedEmail;
      }
    }

    if (phone !== undefined) {
      const trimmedPhone = phone.trim();
      if (trimmedPhone) {
        const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,16}$/;
        if (!phoneRegex.test(trimmedPhone)) {
          return res.status(400).json({
            success: false,
            message: 'Please provide a valid phone number format.',
          });
        }
      }
      user.phone = trimmedPhone;
    }

    if (location !== undefined) {
      if (typeof location === 'object' && location !== null) {
        const { area, city, state, pincode } = location;
        if (!pincode || !/^\d{6}$/.test(String(pincode).trim())) {
          return res.status(400).json({
            success: false,
            message: 'PIN code must be exactly 6 numeric digits.',
          });
        }
        if (!state || !String(state).trim()) {
          return res.status(400).json({
            success: false,
            message: 'State is required.',
          });
        }
        if (!city || !String(city).trim()) {
          return res.status(400).json({
            success: false,
            message: 'City is required.',
          });
        }
        if (!area || !String(area).trim()) {
          return res.status(400).json({
            success: false,
            message: 'Area / Post Office is required.',
          });
        }
        user.location = {
          area: String(area).trim(),
          city: String(city).trim(),
          state: String(state).trim(),
          pincode: String(pincode).trim(),
        };
      } else if (typeof location === 'string') {
        user.location = location.trim();
      }
    }

    if (bio !== undefined) {
      user.bio = bio.trim();
    }

    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (shelterDetails && user.role === 'shelter') {
      user.shelterDetails = { ...user.shelterDetails, ...shelterDetails };
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password (Authenticated User)
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current password and new password.',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long.',
      });
    }

    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Request Password Reset Token
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email or phone number.',
      });
    }

    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { phone: identifier }],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'There is no account associated with that email or phone.',
      });
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'Password reset token generated successfully.',
      resetToken, // In production email workflow, this is sent via email link
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password using reset token
// @route   PUT /api/auth/reset-password/:resetToken
// @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
    }

    // Hash token from param
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resetToken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token.',
      });
    }

    // Set new password
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now log in.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Synchronize Cognito authenticated identity with MongoDB User
// @route   POST /api/auth/cognito-sync
// @access  Public (Bearer Cognito Token or body token)
export const cognitoSync = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = req.body?.idToken || req.body?.accessToken;
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'No Cognito token provided for synchronization.',
      });
    }

    const payload = await verifyCognitoToken(token);

    // Extract optional location from request body if valid
    let syncLocation = null;
    if (req.body?.location) {
      const loc = req.body.location;
      if (typeof loc === 'object' && loc !== null && loc.pincode && loc.state && loc.city && loc.area) {
        if (/^\d{6}$/.test(String(loc.pincode).trim())) {
          syncLocation = {
            area: String(loc.area).trim(),
            city: String(loc.city).trim(),
            state: String(loc.state).trim(),
            pincode: String(loc.pincode).trim(),
          };
        }
      } else if (typeof loc === 'string' && loc.trim() !== '') {
        syncLocation = loc.trim();
      }
    }

    const user = await resolveMongoUserFromCognitoPayload(payload, { location: syncLocation });

    res.status(200).json({
      success: true,
      message: 'Cognito identity synchronized successfully with PETLY MongoDB account.',
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        location: user.location,
        cognitoSub: user.cognitoSub,
        shelterDetails: user.shelterDetails,
        addresses: user.addresses || [],
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    const status = error.statusCode || 401;
    res.status(status).json({
      success: false,
      message: error.message || 'Cognito token verification failed.',
    });
  }
};
