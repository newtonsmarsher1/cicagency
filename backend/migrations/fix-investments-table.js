const { pool, testConnection } = require('../config/database');
require('dotenv').config();

/**
 * Migration script to add missing columns to investments table (PostgreSQL)
 */
async function fixInvestmentsTable() {
    try {
        const ok = await testConnection();
        if (!ok) {
            console.error('❌ Database connection failed');
            process.exit(1);
        }

        console.log('🔍 Checking investments table structure...\n');

        const [columns] = await pool.execute(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'investments'
            ORDER BY ordinal_position
        `);

        console.log('Current columns:');
        columns.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type})`);
        });
        console.log('');

        // Add missing columns (idempotent)
        console.log('➕ Ensuring plan_name column exists...');
        await pool.execute(`
            ALTER TABLE investments 
            ADD COLUMN IF NOT EXISTS plan_name VARCHAR(255) NOT NULL DEFAULT 'Basic Plan'
        `);

        console.log('➕ Ensuring daily_return column exists...');
        await pool.execute(`
            ALTER TABLE investments 
            ADD COLUMN IF NOT EXISTS daily_return DECIMAL(5,2) NOT NULL DEFAULT 0.00
        `);

        console.log('➕ Ensuring duration column exists...');
        await pool.execute(`
            ALTER TABLE investments 
            ADD COLUMN IF NOT EXISTS duration INT NOT NULL DEFAULT 30
        `);

        const [finalColumns] = await pool.execute(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'investments'
            ORDER BY ordinal_position
        `);

        console.log('\n✅ Final table structure:');
        finalColumns.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type})`);
        });

        console.log('\n✅ Investments table fixed successfully!');

    } catch (error) {
        console.error('❌ Error fixing investments table:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

console.log('🚀 Starting investments table fix...\n');
fixInvestmentsTable()
    .then(() => {
        console.log('\n✅ Migration completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    });



