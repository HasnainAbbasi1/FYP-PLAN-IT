require('dotenv').config();
const { sequelize } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Get database dialect
    const dialect = sequelize.getDialect();
    console.log(`📊 Database dialect: ${dialect}`);

    // Check if columns exist
    const checkColumnExists = async (tableName, columnName) => {
      const [results] = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '${tableName}' AND column_name = '${columnName}'
      `);
      return results.length > 0;
    };

    // Migration statements
    const columnsToAdd = [
      { name: 'marla_summary', type: dialect === 'postgres' ? 'JSON' : 'TEXT' },
      { name: 'image_url', type: 'VARCHAR(500)' },
      { name: 'green_space_statistics', type: dialect === 'postgres' ? 'JSON' : 'TEXT' },
      { name: 'terrain_summary', type: dialect === 'postgres' ? 'JSON' : 'TEXT' }
    ];

    // PostgreSQL-specific comments (skip for SQLite)
    const commentStatements = dialect === 'postgres' ? [
      "COMMENT ON COLUMN zoning_results.marla_summary IS 'Marla summary with residential, commercial, park, roads breakdown'",
      "COMMENT ON COLUMN zoning_results.image_url IS 'URL to the 2D zoning visualization image'",
      "COMMENT ON COLUMN zoning_results.green_space_statistics IS 'Green space statistics from 2D visualization'",
      "COMMENT ON COLUMN zoning_results.terrain_summary IS 'Terrain analysis summary with area calculations'"
    ] : [];

    console.log(`📝 Running migration: add_zoning_fields`);
    console.log(`📊 Found ${columnsToAdd.length} columns to add`);

    // Execute ALTER TABLE statements
    for (let i = 0; i < columnsToAdd.length; i++) {
      const column = columnsToAdd[i];
      
      // Check if column already exists
      const exists = await checkColumnExists('zoning_results', column.name);
      if (exists) {
        console.log(`ℹ️  Column '${column.name}': Already exists (skipping)`);
        continue;
      }

      // Build ALTER TABLE statement based on dialect
      let statement;
      if (dialect === 'postgres') {
        statement = `ALTER TABLE zoning_results ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}`;
      } else {
        // SQLite doesn't support IF NOT EXISTS, but we already checked
        statement = `ALTER TABLE zoning_results ADD COLUMN ${column.name} ${column.type}`;
      }

      try {
        await sequelize.query(statement);
        console.log(`✅ Added column '${column.name}' (${i + 1}/${columnsToAdd.length})`);
      } catch (error) {
        // Ignore "column already exists" errors
        if (error.message && (
          error.message.includes('already exists') ||
          error.message.includes('duplicate column') ||
          error.message.includes('SQLITE_ERROR: duplicate column name')
        )) {
          console.log(`ℹ️  Column '${column.name}': Already exists (skipping)`);
        } else {
          console.error(`❌ Error adding column '${column.name}':`, error.message);
          throw error;
        }
      }
    }

    // Execute COMMENT statements (PostgreSQL only)
    if (commentStatements.length > 0) {
      console.log(`📝 Adding column comments (PostgreSQL only)`);
      for (let i = 0; i < commentStatements.length; i++) {
        try {
          await sequelize.query(commentStatements[i]);
          console.log(`✅ Added comment ${i + 1}/${commentStatements.length}`);
        } catch (error) {
          console.log(`ℹ️  Comment ${i + 1}: ${error.message}`);
          // Continue even if comments fail
        }
      }
    }

    console.log('✅ Migration completed successfully!');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await sequelize.close();
    process.exit(1);
  }
}

runMigration();

