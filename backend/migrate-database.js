const path = require('path');
const { initializeDatabase, testConnection } = require('./config/database');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

/**
 * Supabase/PostgreSQL migration runner
 * Uses the centralized initializer in backend/config/database.js
 */
async function migrateDatabase() {
    try {
        console.log('🔗 Testing database connection...');
        const ok = await testConnection();
        if (!ok) {
            console.error('❌ Cannot migrate because database connection failed');
            process.exit(1);
        }

        console.log('🚀 Applying schema (idempotent) for Supabase/PostgreSQL...');
        await initializeDatabase();
        console.log('🎉 Database migration completed successfully (PostgreSQL/Supabase)');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrateDatabase();
