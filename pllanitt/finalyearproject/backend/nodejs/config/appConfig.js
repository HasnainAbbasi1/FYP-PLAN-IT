const path = require('path');
const dotenv = require('dotenv');

// Ensure environment variables are loaded even when modules are imported directly
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'dev-planit-secret';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '1h';

if (!process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET is not set in environment. Using development fallback secret.');
}

module.exports = {
  JWT_SECRET,
  JWT_EXPIRATION
};

