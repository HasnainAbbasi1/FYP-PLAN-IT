/**
 * Script to fix column type mismatches
 * This fixes the accessibility column in green_spaces from JSONB to BOOLEAN
 */

const { sequelize } = require('./config/database');

async function fixColumnTypes() {
  try {
    const dialect = sequelize.getDialect();
    console.log(`Detected database dialect: ${dialect}`);
    
    if (dialect !== 'postgres') {
      console.log('This script is for PostgreSQL only. Skipping...');
      process.exit(0);
    }
    
    console.log('Fixing column type mismatches...');
    
    // Fix accessibility column in green_spaces
    // Step 1: Drop the default first
    try {
      await sequelize.query(`
        ALTER TABLE "green_spaces" 
        ALTER COLUMN "accessibility" DROP DEFAULT;
      `);
      console.log('✅ Dropped default from accessibility column');
    } catch (e) {
      if (!e.message.includes('does not exist')) {
        console.log('Default may not exist, continuing...');
      }
    }
    
    // Step 2: Change type from JSONB to BOOLEAN
    // Handle existing data - convert JSONB values to boolean
    await sequelize.query(`
      ALTER TABLE "green_spaces" 
      ALTER COLUMN "accessibility" TYPE BOOLEAN 
      USING CASE 
        WHEN accessibility::text = 'true' OR accessibility::text = '"true"' OR accessibility::text = '{"value": true}' THEN true
        WHEN accessibility::text = 'false' OR accessibility::text = '"false"' OR accessibility::text = '{"value": false}' THEN false
        WHEN accessibility IS NULL THEN true
        ELSE true
      END;
    `);
    console.log('✅ Changed accessibility column type to BOOLEAN');
    
    // Step 3: Set NOT NULL and default
    await sequelize.query(`
      ALTER TABLE "green_spaces" 
      ALTER COLUMN "accessibility" SET NOT NULL,
      ALTER COLUMN "accessibility" SET DEFAULT true;
    `);
    console.log('✅ Set NOT NULL and default for accessibility column');
    
    // Step 4: Add comment
    await sequelize.query(`
      COMMENT ON COLUMN "green_spaces"."accessibility" IS 'Wheelchair accessible';
    `);
    console.log('✅ Added comment to accessibility column');
    
    console.log('✅ All column type fixes completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing column types:', error.message);
    
    // If column doesn't exist or is already the correct type, that's okay
    if (error.message.includes('does not exist') || 
        error.message.includes('already exists') ||
        error.message.includes('column "accessibility" is of type boolean') ||
        error.message.includes('column "accessibility" does not exist')) {
      console.log('Column already in correct state or does not exist, skipping...');
      process.exit(0);
    }
    process.exit(1);
  }
}

// Run the fix
fixColumnTypes();

