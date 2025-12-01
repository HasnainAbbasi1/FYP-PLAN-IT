/**
 * Script to create an admin user in the database
 * Run with: node scripts/createAdmin.js
 *
 * NOTE:
 * This script must use the same .env as the main backend server
 * so that DATABASE_URL points to Postgres instead of falling
 * back to the default SQLite database.
 */

const path = require('path');

// Load env from backend/.env (two levels up from scripts/)
require('dotenv').config({
  path: path.join(__dirname, '..', '..', '.env')
});

const { sequelize } = require('../config/database');
const User = require('../models/User');

async function createAdmin() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Admin credentials
    const adminData = {
      name: 'Admin User',
      email: 'admin@planit.com',
      password: 'Admin123',  // Meets validation: uppercase, lowercase, number
      role: 'admin',
      isActive: true
    };

    // Check if admin already exists
    const existingAdmin = await User.findOne({ where: { email: adminData.email } });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      console.log('📧 Email:', adminData.email);
      console.log('🔑 Use your existing password to login');
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create(adminData);

    console.log('✅ Admin user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:    ', adminData.email);
    console.log('🔑 Password: ', adminData.password);
    console.log('👤 Role:     ', admin.role);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
    console.log('🌐 Login at:  http://localhost:5173/login');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }
}

createAdmin();

