const { pool, testConnection } = require('../config/database');
require('dotenv').config();

/**
 * Migration script to ensure 'completed' status exists in payments.status CHECK constraint (PostgreSQL)
 */
async function updatePaymentsStatusCheck() {
    try {
        const ok = await testConnection();
        if (!ok) {
            console.error('❌ Database connection failed');
            process.exit(1);
        }

        console.log('🔄 Ensuring payments.status allows "completed"...');

        await pool.execute(`ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check`);
        await pool.execute(`
            ALTER TABLE payments 
            ADD CONSTRAINT payments_status_check 
            CHECK (status IN ('pending', 'success', 'failed', 'cancelled', 'completed'))
        `);

        console.log('✅ payments.status check constraint updated (includes "completed")');
    } catch (error) {
        console.error('❌ Error updating payments status constraint:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

console.log('🚀 Starting payments status update migration...\n');
updatePaymentsStatusCheck()
    .then(() => {
        console.log('\n✅ Migration completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    });



