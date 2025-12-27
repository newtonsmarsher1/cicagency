const { pool, testConnection } = require('./config/database');
require('dotenv').config();

/**
 * Reset all user accounts to initial state (PostgreSQL/Supabase)
 * - wallet_balance, total_earnings -> 0
 * - level -> 0
 * - tasks_completed_today -> 0
 * - Clears payments, user_tasks, withdrawal_requests
 */
async function resetAllUsers() {
    try {
        const ok = await testConnection();
        if (!ok) {
            console.error('❌ Database connection failed');
            process.exit(1);
        }

        console.log('🔗 Connected to database');
        console.log('⚠️  WARNING: This will reset ALL user accounts!');
        console.log('='.repeat(60));

        const [userCountRows] = await pool.execute('SELECT COUNT(*) as count FROM users');
        const userCount = userCountRows[0]?.count || 0;
        console.log(`📊 Found ${userCount} users to reset`);

        console.log('\n🔄 Starting reset process...\n');

        await pool.execute('BEGIN');

        try {
            console.log('1️⃣  Resetting user account fields...');
            await pool.execute(`
                UPDATE users 
                SET 
                    wallet_balance = 0.00,
                    total_earnings = 0.00,
                    level = 0,
                    tasks_completed_today = 0,
                    is_temporary_worker = FALSE,
                    temp_worker_start_date = NULL,
                    last_login = NULL
            `);
            console.log('   ✅ User accounts reset');

            console.log('2️⃣  Clearing payment records...');
            const [paymentCountRows] = await pool.execute('SELECT COUNT(*) as count FROM payments');
            await pool.execute('DELETE FROM payments');
            const paymentCount = paymentCountRows[0]?.count || 0;
            console.log(`   ✅ Deleted ${paymentCount} payment records`);

            console.log('3️⃣  Clearing task completion records...');
            const [taskCountRows] = await pool.execute('SELECT COUNT(*) as count FROM user_tasks');
            await pool.execute('DELETE FROM user_tasks');
            const taskCount = taskCountRows[0]?.count || 0;
            console.log(`   ✅ Deleted ${taskCount} task records`);

            console.log('4️⃣  Clearing withdrawal requests...');
            const [withdrawalCountRows] = await pool.execute('SELECT COUNT(*) as count FROM withdrawal_requests');
            await pool.execute('DELETE FROM withdrawal_requests');
            const withdrawalCount = withdrawalCountRows[0]?.count || 0;
            console.log(`   ✅ Deleted ${withdrawalCount} withdrawal requests`);

            await pool.execute('COMMIT');
            console.log('\n✅ All user accounts have been reset successfully!');
            console.log('='.repeat(60));
            console.log('📊 Summary:');
            console.log(`   - ${userCount} users reset`);
            console.log(`   - ${paymentCount} payment records deleted`);
            console.log(`   - ${taskCount} task records deleted`);
            console.log(`   - ${withdrawalCount} withdrawal requests deleted`);
            console.log('\n🎉 Reset complete! All accounts are now like new ones.');

        } catch (error) {
            await pool.execute('ROLLBACK');
            throw error;
        }

    } catch (error) {
        console.error('❌ Error resetting users:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

// Run the reset
console.log('🚀 Starting user account reset script...\n');
resetAllUsers()
    .then(() => {
        console.log('\n✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });