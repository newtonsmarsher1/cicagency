const path = require('path');
const { initializeDatabase, testConnection, pool } = require('./config/database');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function addSampleData() {
    // Grab any user and add sample payments to help local testing
    const [users] = await pool.execute('SELECT id FROM users LIMIT 1');
    if (!users || users.length === 0) {
        console.log('ℹ️  No users found; skipping sample data seed');
        return;
    }

            const userId = users[0].id;
            
    await pool.execute(`
                UPDATE users SET 
                    wallet_balance = 175.00,
                    total_earnings = 175.00,
                    level = 1,
                    email = 'user@example.com'
                WHERE id = ?
            `, [userId]);

    await pool.execute(`
        INSERT INTO payments (user_id, amount, status, description, payment_type, payment_method)
        VALUES 
            (?, 100.00, 'completed', 'Initial recharge', 'recharge', 'system'),
            (?, 50.00, 'completed', 'Welcome bonus', 'bonus', 'system'),
            (?, 25.00, 'completed', 'Referral bonus', 'referral', 'system')
        ON CONFLICT DO NOTHING
            `, [userId, userId, userId]);

    console.log('✅ Sample data added for user', userId);
}

async function updateDatabase() {
    try {
        console.log('🔗 Testing database connection...');
        const ok = await testConnection();
        if (!ok) {
            console.error('❌ Cannot update because database connection failed');
            process.exit(1);
        }

        console.log('🛠️  Ensuring schema is up to date (PostgreSQL/Supabase)...');
        await initializeDatabase();
        await addSampleData();

        console.log('🎉 Database update completed successfully!');
        console.log('📊 All required tables and columns are now available');
        console.log('🔄 You can now restart your server to use the new features');
    } catch (error) {
        console.error('❌ Database update failed:', error.message);
        process.exit(1);
    }
}

// Run the update
updateDatabase();
