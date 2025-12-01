/**
 * Migration runner script
 * Automatically runs pending migrations
 */

const { sequelize } = require('../config/database');
const {
  initMigrationsTable,
  runMigration,
  getExecutedMigrations
} = require('../migrations/migrationTracker');

// Define all migrations
const migrations = [
  {
    name: 'add_zoning_columns',
    fn: async () => {
      await sequelize.query(`
        ALTER TABLE zoning_results 
        ADD COLUMN IF NOT EXISTS marla_summary JSON;
      `);
      await sequelize.query(`
        ALTER TABLE zoning_results 
        ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);
      `);
      await sequelize.query(`
        ALTER TABLE zoning_results 
        ADD COLUMN IF NOT EXISTS green_space_statistics JSON;
      `);
      await sequelize.query(`
        ALTER TABLE zoning_results 
        ADD COLUMN IF NOT EXISTS terrain_summary JSON;
      `);
    }
  },
  {
    name: 'create_project_activities_table',
    fn: async () => {
      // Check if table exists
      const [results] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'project_activities'
        );
      `);

      if (!results[0].exists) {
        // Create the table
        await sequelize.query(`
          CREATE TABLE "project_activities" (
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

        // Create indexes
        await sequelize.query(`
          CREATE INDEX "project_activities_project_id_idx" 
            ON "project_activities"("project_id");
        `);

        await sequelize.query(`
          CREATE INDEX "project_activities_user_id_idx" 
            ON "project_activities"("user_id");
        `);

        await sequelize.query(`
          CREATE INDEX "project_activities_created_at_idx" 
            ON "project_activities"("created_at" DESC);
        `);
      }
    }
  },
  {
    name: 'create_notifications_table',
    fn: async () => {
      // Check if table exists
      const [results] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'notifications'
        );
      `);

      if (!results[0].exists) {
        // Create the table
        await sequelize.query(`
          CREATE TABLE "notifications" (
            "id" SERIAL PRIMARY KEY,
            "user_id" INTEGER NOT NULL,
            "type" VARCHAR(255) NOT NULL,
            "title" VARCHAR(255) NOT NULL,
            "message" TEXT NOT NULL,
            "link" VARCHAR(500),
            "read" BOOLEAN NOT NULL DEFAULT false,
            "metadata" JSONB,
            "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            CONSTRAINT "notifications_user_id_fkey" 
              FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
          );
        `);

        // Create indexes
        await sequelize.query(`
          CREATE INDEX "notifications_user_id_idx" 
            ON "notifications"("user_id");
        `);

        await sequelize.query(`
          CREATE INDEX "notifications_read_idx" 
            ON "notifications"("read");
        `);

        await sequelize.query(`
          CREATE INDEX "notifications_created_at_idx" 
            ON "notifications"("created_at" DESC);
        `);
      }
      
      // Always check if link column exists (even if table was created before)
      const [linkColumnCheck] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'notifications'
          AND column_name = 'link'
        );
      `);
      
      if (!linkColumnCheck[0].exists) {
        await sequelize.query(`
          ALTER TABLE "notifications" 
          ADD COLUMN "link" VARCHAR(500);
        `);
      }
    }
  },
  {
    name: 'add_link_column_to_notifications',
    fn: async () => {
      // Check if column exists
      const [results] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'notifications'
          AND column_name = 'link'
        );
      `);

      if (!results[0].exists) {
        // Add the link column
        await sequelize.query(`
          ALTER TABLE "notifications" 
          ADD COLUMN "link" VARCHAR(500);
        `);
      }
    }
  },
  // Add more migrations here as needed
];

/**
 * Run all pending migrations
 */
async function runAllMigrations() {
  try {
    console.log('🔄 Starting migration process...');
    
    // Initialize migrations table
    await initMigrationsTable();
    
    // Get executed migrations
    const executed = await getExecutedMigrations();
    const executedNames = new Set(executed.map(m => m.name));
    
    console.log(`📊 Found ${executed.length} executed migrations`);
    console.log(`📋 Found ${migrations.length} total migrations`);
    
    // Run pending migrations
    let executedCount = 0;
    for (const migration of migrations) {
      if (!executedNames.has(migration.name)) {
        await runMigration(migration.name, migration.fn);
        executedCount++;
      }
    }
    
    if (executedCount === 0) {
      console.log('✅ All migrations are up to date');
    } else {
      console.log(`✅ Executed ${executedCount} new migration(s)`);
    }
    
    return { success: true, executedCount };
  } catch (error) {
    console.error('❌ Migration process failed:', error);
    return { success: false, error: error.message };
  }
}

// Run if called directly
if (require.main === module) {
  runAllMigrations()
    .then((result) => {
      if (result.success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runAllMigrations, migrations };

