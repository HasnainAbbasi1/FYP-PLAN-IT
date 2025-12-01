/**
 * Migration script to add missing columns to zoning_results table
 * Run this script if you encounter "column does not exist" errors
 * 
 * Usage: node scripts/addZoningColumns.js
 */

const { sequelize } = require('../config/database');

async function addZoningColumns() {
  try {
    console.log('🔄 Starting migration: Adding columns to zoning_results table...');
    
    await sequelize.query(`
      ALTER TABLE zoning_results 
      ADD COLUMN IF NOT EXISTS marla_summary JSON;
    `);
    console.log('✅ Added marla_summary column');
    
    await sequelize.query(`
      ALTER TABLE zoning_results 
      ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);
    `);
    console.log('✅ Added image_url column');
    
    await sequelize.query(`
      ALTER TABLE zoning_results 
      ADD COLUMN IF NOT EXISTS green_space_statistics JSON;
    `);
    console.log('✅ Added green_space_statistics column');
    
    await sequelize.query(`
      ALTER TABLE zoning_results 
      ADD COLUMN IF NOT EXISTS terrain_summary JSON;
    `);
    console.log('✅ Added terrain_summary column');
    
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
addZoningColumns();

