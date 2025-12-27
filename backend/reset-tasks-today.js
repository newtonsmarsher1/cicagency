const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool, testConnection } = require('./config/database');

/**
 * Reset tasks_completed_today to 0 for all users
 * This can be run manually to fix the issue where stats show old values
 */
async function resetAllUsersTasksToday() {
    try {
        console.log('🔄 Connecting to database...');
        const ok = await testConnection();
        if (!ok) {
            console.error('❌ Database connection failed');
            process.exit(1);
        }

        console.log('✅ Database connected');
        console.log('🔄 Resetting tasks_completed_today to 0 for all users...\n');

        // Get count of users with tasks_completed_today > 0
        const [countResult] = await pool.execute(
            'SELECT COUNT(*) as count FROM users WHERE tasks_completed_today > 0'
        );
        const userCount = parseInt(countResult[0]?.count || countResult.count || 0);
        
        console.log(`📊 Found ${userCount} users with tasks_completed_today > 0`);

        // Reset all users' tasks_completed_today to 0
        await pool.execute(
            'UPDATE users SET tasks_completed_today = 0 WHERE tasks_completed_today > 0'
        );

        console.log(`✅ Successfully reset tasks_completed_today to 0 for ${userCount} users`);
        console.log('✅ All users can now start with 0 completed tasks\n');

    } catch (error) {
        console.error('❌ Error resetting tasks:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

// Run the reset
console.log('🚀 Starting task reset script...\n');
resetAllUsersTasksToday()
    .then(() => {
        console.log('✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });

