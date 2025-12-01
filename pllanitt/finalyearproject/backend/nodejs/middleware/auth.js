const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/appConfig');

// Verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      console.log('🔴 Auth failed: No authorization header');
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      console.log('🔴 Auth failed: Invalid token format');
      return res.status(401).json({ message: 'Access denied. Invalid token format.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.userId);
    
    if (!user || !user.isActive) {
      console.log('🔴 Auth failed: User not found or inactive', { userId: decoded.userId, userExists: !!user, isActive: user?.isActive });
      return res.status(401).json({ message: 'Access denied. User not found or inactive.' });
    }

    req.user = user;
    console.log('✅ Auth successful:', { userId: user.id, email: user.email, role: user.role });
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      console.log('🔴 Auth failed: Invalid token', error.message);
      return res.status(401).json({ message: 'Access denied. Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      console.log('🔴 Auth failed: Token expired');
      return res.status(401).json({ message: 'Access denied. Token expired.' });
    }
    console.error('🔴 Auth error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Check user role
const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Access denied. User not authenticated.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.',
        requiredRoles: roles,
        userRole: req.user.role
      });
    }

    next();
  };
};

// Admin only middleware
const adminOnly = checkRole(['admin']);
const requireAdmin = checkRole(['admin']);

// Planner and above middleware
const plannerAndAbove = checkRole(['admin', 'planner']);



module.exports = {
  verifyToken,
  checkRole,
  adminOnly,
  requireAdmin,
  plannerAndAbove
};