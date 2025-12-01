/**
 * Migration tracker to manage database migrations
 */

const { sequelize } = require('../config/database');

const MIGRATIONS_TABLE = 'schema_migrations';

/**
 * Initialize migrations table
 */
async function initMigrationsTable() {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Migrations table initialized');
  } catch (error) {
    console.error('❌ Failed to initialize migrations table:', error);
    throw error;
  }
}

/**
 * Check if migration has been executed
 */
async function isMigrationExecuted(migrationName) {
  try {
    const [results] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM ${MIGRATIONS_TABLE} 
      WHERE name = :name
    `, {
      replacements: { name: migrationName }
    });
    
    return results[0]?.count > 0;
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
}

/**
 * Mark migration as executed
 */
async function markMigrationExecuted(migrationName) {
  try {
    await sequelize.query(`
      INSERT INTO ${MIGRATIONS_TABLE} (name) 
      VALUES (:name)
      ON CONFLICT (name) DO NOTHING
    `, {
      replacements: { name: migrationName }
    });
    console.log(`✅ Migration marked as executed: ${migrationName}`);
  } catch (error) {
    console.error('Error marking migration as executed:', error);
    throw error;
  }
}

/**
 * Get all executed migrations
 */
async function getExecutedMigrations() {
  try {
    const [results] = await sequelize.query(`
      SELECT name, executed_at 
      FROM ${MIGRATIONS_TABLE} 
      ORDER BY executed_at ASC
    `);
    return results;
  } catch (error) {
    console.error('Error getting executed migrations:', error);
    return [];
  }
}

/**
 * Run migration if not already executed
 */
async function runMigration(migrationName, migrationFn) {
  try {
    const executed = await isMigrationExecuted(migrationName);
    
    if (executed) {
      console.log(`⏭️  Migration already executed: ${migrationName}`);
      return false;
    }

    console.log(`🔄 Running migration: ${migrationName}`);
    await migrationFn();
    await markMigrationExecuted(migrationName);
    console.log(`✅ Migration completed: ${migrationName}`);
    return true;
  } catch (error) {
    console.error(`❌ Migration failed: ${migrationName}`, error);
    throw error;
  }
}

module.exports = {
  initMigrationsTable,
  isMigrationExecuted,
  markMigrationExecuted,
  getExecutedMigrations,
  runMigration
};

