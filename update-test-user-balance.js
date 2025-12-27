const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateTestUserBalance() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'Caroline',
        database: process.env.DB_NAME || 'cic'
    });

    try {
        // Update test user with some balance
        const testPhone = '+254700000999';
        
        await connection.execute(
            'UPDATE users SET wallet_balance = 5000, total_earnings = 5000 WHERE phone = ?',
            [testPhone]
        );
        
        console.log('✅ Updated test user balance to KES 5,000');
        
        // Verify the update
        const [users] = await connection.execute(
            'SELECT id, name, phone, wallet_balance, total_earnings FROM users WHERE phone = ?',
            [testPhone]
        );
        
        if (users.length > 0) {
            const user = users[0];
            console.log('📱 Test User Updated:');
            console.log(`   ID: ${user.id}`);
            console.log(`   Name: ${user.name}`);
            console.log(`   Phone: ${user.phone}`);
            console.log(`   Wallet: KES ${user.wallet_balance}`);
            console.log(`   Total Earnings: KES ${user.total_earnings}`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
}

updateTestUserBalance();















