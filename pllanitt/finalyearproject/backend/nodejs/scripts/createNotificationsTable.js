/**
 * Migration script to create notifications table
 * Run this script to create the table if it doesn't exist
 */

const { sequelize } = require('../config/database');

async function createNotificationsTable() {
  try {
    console.log('Creating notifications table...');

    // Check if table exists
    const [results] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
      );
    `);

    const tableExists = results[0].exists;

    if (tableExists) {
      console.log('✅ Table notifications already exists. Skipping creation.');
      await sequelize.close();
      return;
    }

    // Create the table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL,
        "type" VARCHAR(255) NOT NULL,
        "title" VARCHAR(255) NOT NULL,
        "message" TEXT NOT NULL,
        "read" BOOLEAN NOT NULL DEFAULT false,
        "metadata" JSONB,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "notifications_user_id_fkey" 
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    // Create indexes for better performance
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" 
        ON "notifications"("user_id");
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "notifications_read_idx" 
        ON "notifications"("read");
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" 
        ON "notifications"("created_at" DESC);
    `);

    console.log('✅ Successfully created notifications table with indexes.');
    await sequelize.close();
  } catch (error) {
    console.error('❌ Error creating notifications table:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

// Run the migration
createNotificationsTable();

