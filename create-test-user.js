const mysql = require('mysql2/promise');
require('dotenv').config();

async function createTestUser() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'Caroline',
        database: process.env.DB_NAME || 'cic'
    });

    try {
        // Create a test user with known credentials
        const testPhone = '+254700000999';
        const testPassword = 'test123';
        const testName = 'Test User';
        
        // Check if user exists
        const [existingUsers] = await connection.execute(
            'SELECT id FROM users WHERE phone = ?',
            [testPhone]
        );
        
        if (existingUsers.length > 0) {
            // Update existing user
            await connection.execute(
                'UPDATE users SET wallet_balance = 10000, total_earnings = 10000, level = 0 WHERE phone = ?',
                [testPhone]
            );
            console.log('✅ Updated existing test user');
        } else {
            // Create new user
            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash(testPassword, 10);
            
            await connection.execute(
                'INSERT INTO users (name, phone, password, wallet_balance, total_earnings, level) VALUES (?, ?, ?, ?, ?, ?)',
                [testName, testPhone, hashedPassword, 10000, 10000, 0]
            );
            console.log('✅ Created new test user');
        }
        
        console.log('📱 Test User Credentials:');
        console.log('   Phone: +254700000999');
        console.log('   Password: test123');
        console.log('   Wallet: KES 10,000');
        console.log('   Level: 0 (can enroll in J1)');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
}

createTestUser();















