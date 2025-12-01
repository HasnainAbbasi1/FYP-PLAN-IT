const express = require('express');
const { signup, login, getProfile, verifyToken, forgotPassword, validateResetToken, resetPassword, updateProfile } = require('../controllers/authController');
const { verifyToken: verifyTokenMiddleware } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.get('/validate-reset-token/:token', validateResetToken);
router.post('/reset-password/:token', resetPassword);

// Protected routes
router.get('/profile', verifyTokenMiddleware, getProfile);
router.put('/profile', verifyTokenMiddleware, updateProfile);
router.get('/verify', verifyTokenMiddleware, verifyToken);

module.exports = router;