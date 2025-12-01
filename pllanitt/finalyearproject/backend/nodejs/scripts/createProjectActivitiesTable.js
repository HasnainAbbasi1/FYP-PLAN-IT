/**
 * Migration script to create project_activities table
 * Run this script to create the table if it doesn't exist
 */

const { sequelize } = require('../config/database');

async function createProjectActivitiesTable() {
  try {
    console.log('Creating project_activities table...');

    // Check if table exists
    const [results] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'project_activities'
      );
    `);

    const tableExists = results[0].exists;

    if (tableExists) {
      console.log('✅ Table project_activities already exists. Skipping creation.');
      await sequelize.close();
      return;
    }

    // Create the table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "project_activities" (
        "id" SERIAL PRIMARY KEY,
        "project_id" INTEGER NOT NULL,
        "user_id" INTEGER,
        "activity_type" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "metadata" JSONB,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "project_activities_project_id_fkey" 
          FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "project_activities_user_id_fkey" 
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    // Create indexes for better performance
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "project_activities_project_id_idx" 
        ON "project_activities"("project_id");
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "project_activities_user_id_idx" 
        ON "project_activities"("user_id");
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "project_activities_created_at_idx" 
        ON "project_activities"("created_at" DESC);
    `);

    console.log('✅ Successfully created project_activities table with indexes.');
    await sequelize.close();
  } catch (error) {
    console.error('❌ Error creating project_activities table:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

// Run the migration
createProjectActivitiesTable();

