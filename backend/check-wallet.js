const { pool, testConnection } = require('./config/database');
require('dotenv').config();

async function checkUserWallet() {
    try {
        const ok = await testConnection();
        if (!ok) {
            console.error('❌ Database connection failed');
            process.exit(1);
        }

        console.log('💰 Checking user wallet balances...');
        const [users] = await pool.execute(
            'SELECT id, name, wallet_balance, total_earnings, tasks_completed_today FROM users ORDER BY id'
        );
        
        console.log('💰 User wallet balances:');
        users.forEach(user => {
            console.log(`  User ${user.id} (${user.name || 'No name'}):`);
            console.log(`    Wallet Balance: KES ${user.wallet_balance || 0}`);
            console.log(`    Total Earnings: KES ${user.total_earnings || 0}`);
            console.log(`    Tasks Completed Today: ${user.tasks_completed_today || 0}`);
            console.log('');
        });

        console.log('📋 Checking recent task completions...');
        const [tasks] = await pool.execute(
            'SELECT user_id, task_id, is_complete, reward_amount, completed_at FROM user_tasks ORDER BY completed_at DESC LIMIT 10'
        );
        
        console.log('📋 Recent task completions:');
        tasks.forEach(task => {
            console.log(`  User ${task.user_id}, Task ${task.task_id}: ${task.is_complete ? 'Completed' : 'Failed'}, Reward: KES ${task.reward_amount || 0}, Date: ${task.completed_at}`);
        });

        console.log('\n✅ Wallet check completed');
    } catch (error) {
        console.error('❌ Error checking wallet:', error);
    }
}

// Run check
checkUserWallet();







