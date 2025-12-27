const { pool, testConnection } = require('./config/database');
require('dotenv').config();

async function updateUser4Wallet() {
    try {
        const ok = await testConnection();
        if (!ok) {
            console.error('❌ Database connection failed');
            process.exit(1);
        }

        console.log('💰 Updating User 4 wallet balance...');
        await pool.execute(
            'UPDATE users SET wallet_balance = 22.00, total_earnings = 22.00, tasks_completed_today = 2 WHERE id = 4'
        );
        console.log('✅ User 4 wallet updated to KES 22.00');

        const [users] = await pool.execute(
            'SELECT id, name, wallet_balance, total_earnings, tasks_completed_today FROM users WHERE id IN (4, 11)'
        );
        
        console.log('💰 Updated wallet balances:');
        users.forEach(user => {
            console.log(`  User ${user.id} (${user.name}):`);
            console.log(`    Wallet Balance: KES ${user.wallet_balance}`);
            console.log(`    Total Earnings: KES ${user.total_earnings}`);
            console.log(`    Tasks Completed Today: ${user.tasks_completed_today}`);
            console.log('');
        });

    } catch (error) {
        console.error('❌ Error updating wallet:', error);
    }
}

// Run update
updateUser4Wallet();







