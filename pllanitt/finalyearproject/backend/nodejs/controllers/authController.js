const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const User = require('../models/User');
const emailService = require('../services/emailService');
const { JWT_SECRET, JWT_EXPIRATION } = require('../config/appConfig');

const AVATAR_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'avatars');

const ensureAvatarDirectory = async () => {
  await fs.promises.mkdir(AVATAR_UPLOAD_DIR, { recursive: true });
};

const deleteAvatarFile = async (avatarPath) => {
  if (!avatarPath || !avatarPath.startsWith('/uploads/avatars/')) return;
  const normalizedPath = avatarPath.startsWith('/') ? avatarPath.slice(1) : avatarPath;
  const absolutePath = path.join(__dirname, '..', normalizedPath);
  try {
    await fs.promises.unlink(absolutePath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn('Failed to delete avatar file:', err.message);
    }
  }
};

const saveBase64Avatar = async (avatarData, userId) => {
  if (!avatarData) return null;

  const matches = avatarData.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid avatar format. Please upload a valid image file.');
  }

  const mimeType = matches[1];
  const extension = mimeType.split('/')[1] || 'png';
  const buffer = Buffer.from(matches[2], 'base64');

  await ensureAvatarDirectory();
  const filename = `avatar_${userId}_${Date.now()}_${randomUUID()}.${extension}`;
  const filePath = path.join(AVATAR_UPLOAD_DIR, filename);
  await fs.promises.writeFile(filePath, buffer);

  // Return relative path that frontend can resolve via API base URL
  return `/uploads/avatars/${filename}`;
};

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRATION }
  );
};

const signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ 
        message: 'Name, email, and password are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Validate role if provided
    const validRoles = ['admin', 'planner', 'viewer'];
    const userRole = role && validRoles.includes(role) ? role : 'viewer';

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ 
        message: 'User with this email already exists' 
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: userRole
    });

    const token = generateToken(user.id);

    // Send welcome email (don't wait for it to complete)
    emailService.sendWelcomeEmail(user.email, user.name)
      .then(result => {
        if (result.success) {
          console.log(`✅ Welcome email sent to ${user.email}`);
        } else {
          console.log(`⚠️ Failed to send welcome email to ${user.email}:`, result.error);
        }
      })
      .catch(error => {
        console.log(`⚠️ Welcome email error for ${user.email}:`, error.message);
      });

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ 
        message: 'Email already exists' 
      });
    }

    res.status(500).json({ 
      message: 'Internal server error during signup' 
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required' 
      });
    }

    // Find user by email
    const user = await User.findByEmail(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ 
        message: 'Account is deactivated. Please contact administrator.' 
      });
    }

    // Validate password
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }

    // Update last login
    await user.update({ lastLogin: new Date() });

    // Generate token
    const token = generateToken(user.id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        bio: user.bio,
        avatar: user.avatar,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Internal server error during login' 
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        bio: user.bio,
        avatar: user.avatar,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      message: 'Internal server error' 
    });
  }
};

// Verify token
const verifyToken = async (req, res) => {
  res.json({
    message: 'Token is valid',
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    }
  });
};

// Forgot password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        message: 'Email is required',
        field: 'email'
      });
    }

    const user = await User.findByEmail(email.toLowerCase().trim());
    
    if (!user) {
      // For security, don't reveal if email exists or not
      return res.status(200).json({ 
        message: 'If an account with that email exists, we have sent password reset instructions.' 
      });
    }

    // Generate reset token
    const resetToken = user.generateResetToken();
    await user.save();

    // Send password reset email
    const emailResult = await emailService.sendPasswordResetEmail(email, resetToken, user.name);
    
    if (emailResult.success) {
      console.log(`✅ Password reset email sent to ${email}`);
      res.status(200).json({ 
        message: 'If an account with that email exists, we have sent password reset instructions to your email address.',
        emailSent: true,
        // In development mode, include the reset link
        ...(emailResult.messageId === 'dev-mode' && { 
          resetLink: emailResult.resetLink,
          developmentMode: true
        })
      });
    } else {
      console.error(`❌ Failed to send email to ${email}:`, emailResult.error);
      // Still return success to user for security (don't reveal if email exists)
      res.status(200).json({ 
        message: 'If an account with that email exists, we have sent password reset instructions to your email address.',
        emailSent: false,
        // In development, include the reset link if email fails
        ...(process.env.NODE_ENV === 'development' && { 
          resetLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`,
          emailError: emailResult.error
        })
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      message: 'Internal server error' 
    });
  }
};

// Validate reset token
const validateResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ 
        message: 'Reset token is required' 
      });
    }

    const user = await User.findByResetToken(token);
    
    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid or expired reset token' 
      });
    }

    res.status(200).json({ 
      message: 'Reset token is valid',
      email: user.email
    });
  } catch (error) {
    console.error('Validate reset token error:', error);
    res.status(500).json({ 
      message: 'Internal server error' 
    });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!token) {
      return res.status(400).json({ 
        message: 'Reset token is required' 
      });
    }

    if (!password || !confirmPassword) {
      return res.status(400).json({ 
        message: 'Password and confirm password are required' 
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ 
        message: 'Passwords do not match',
        field: 'confirmPassword'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long',
        field: 'password'
      });
    }

    const user = await User.findByResetToken(token);
    
    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid or expired reset token' 
      });
    }

    // Update password and clear reset token
    user.password = password;
    user.clearResetToken();
    await user.save();

    res.status(200).json({ 
      message: 'Password has been reset successfully' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      message: 'Internal server error' 
    });
  }
};

// Update current user profile
const updateProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const {
      name,
      email,
      phone,
      bio,
      avatar
    } = req.body || {};

    const updates = {};

    if (name !== undefined) {
      updates.name = name;
    }

    if (email !== undefined && email !== user.email) {
      const existingUser = await User.findByEmail?.(email.toLowerCase().trim());
      if (existingUser && existingUser.id !== user.id) {
        return res.status(409).json({ message: 'Email is already in use' });
      }
      updates.email = email.toLowerCase().trim();
    }

    if (phone !== undefined) {
      const cleanedPhone = typeof phone === 'string' ? phone.trim() : phone;
      updates.phone = cleanedPhone || null;
    }

    if (bio !== undefined) {
      updates.bio = bio;
    }

    if (avatar !== undefined) {
      if (!avatar) {
        await deleteAvatarFile(user.avatar);
        updates.avatar = null;
      } else if (typeof avatar === 'string' && avatar.startsWith('data:image')) {
        const newAvatarPath = await saveBase64Avatar(avatar, user.id);
        await deleteAvatarFile(user.avatar);
        updates.avatar = newAvatarPath;
      } else if (avatar.startsWith('/uploads/') || avatar.startsWith('http')) {
        // Existing path or external URL, keep as-is
        updates.avatar = avatar;
      } else {
        return res.status(400).json({ message: 'Invalid avatar format' });
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.json({
        message: 'No changes detected',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          bio: user.bio,
          avatar: user.avatar,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });
    }

    await user.update(updates);

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        bio: user.bio,
        avatar: user.avatar,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile', details: error.message });
  }
};

module.exports = {
  signup,
  login,
  getProfile,
  verifyToken,
  forgotPassword,
  validateResetToken,
  resetPassword,
  updateProfile
};