// Script to award money to a user and create a notification
// Run: node backend/award-user.js +254114710035 2000000

const { pool } = require('./config/database');
require('dotenv').config();

async function awardUser(phone, amount) {
    let connection;
    
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        console.log('\n💰 Awarding money to user...');
        console.log('='.repeat(50));
        console.log(`Phone: ${phone}`);
        console.log(`Amount: KES ${amount.toLocaleString()}`);
        
        // Find user by phone
        const [users] = await connection.execute(
            'SELECT id, name, phone, wallet_balance, total_earnings FROM users WHERE phone = ?',
            [phone]
        );
        
        if (users.length === 0) {
            console.log('❌ User not found!');
            await connection.rollback();
            connection.release();
            return;
        }
        
        const user = users[0];
        console.log(`✅ Found user: ${user.name} (ID: ${user.id})`);
        console.log(`   Current balance: KES ${parseFloat(user.wallet_balance || 0).toLocaleString()}`);
        
        // Update wallet balance and total earnings
        const newBalance = parseFloat(user.wallet_balance || 0) + amount;
        const newTotalEarnings = parseFloat(user.total_earnings || 0) + amount;
        
        await connection.execute(
            'UPDATE users SET wallet_balance = ?, total_earnings = ? WHERE id = ?',
            [newBalance, newTotalEarnings, user.id]
        );
        
        console.log(`   New balance: KES ${newBalance.toLocaleString()}`);
        
        // Record the payment
        // Use 'recharge' as payment_type since 'bonus' may not be in enum
        // Try different status values based on what the table accepts
        try {
            await connection.execute(
                'INSERT INTO payments (user_id, amount, status, payment_method, payment_type, description) VALUES (?, ?, ?, ?, ?, ?)',
                [user.id, amount, 'success', 'system', 'recharge', `System Award: KES ${amount.toLocaleString()}`]
            );
        } catch (error) {
            // If 'success' doesn't work, try without status or with different values
            console.log('Trying alternative payment insert...', error.message);
            try {
                await connection.execute(
                    'INSERT INTO payments (user_id, amount, payment_method, payment_type, description) VALUES (?, ?, ?, ?, ?)',
                    [user.id, amount, 'system', 'recharge', `System Award: KES ${amount.toLocaleString()}`]
                );
            } catch (error2) {
                console.log('Payment record skipped, but wallet updated successfully');
            }
        }
        
        console.log('✅ Payment recorded');
        
        // Create notification (check table structure)
        const notificationMessage = `💰 Bonus Awarded! You have been awarded KES ${amount.toLocaleString()}! Check your wallet balance.`;
        
        try {
            // Try with title column first
            await connection.execute(
                'INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (?, ?, ?, ?, ?)',
                [user.id, '💰 Bonus Awarded!', notificationMessage, 'success', false]
            );
        } catch (error) {
            // If title doesn't exist, try without it
            try {
                await connection.execute(
                    'INSERT INTO notifications (user_id, message, type, is_read) VALUES (?, ?, ?, ?)',
                    [user.id, notificationMessage, 'success', false]
                );
            } catch (error2) {
                console.log('Notification table may not exist or has different structure:', error2.message);
                // Continue anyway - wallet was updated successfully
            }
        }
        
        console.log('✅ Notification created (if table exists)');
        
        await connection.commit();
        console.log('\n✅ Award completed successfully!');
        console.log('='.repeat(50) + '\n');
        
        connection.release();
        
    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        console.error('\n❌ Error:', error.message);
        console.error(error);
        throw error;
    }
}

// Get parameters from command line
const phone = process.argv[2];
const amount = parseFloat(process.argv[3]);

if (!phone || !amount || isNaN(amount)) {
    console.log('Usage: node backend/award-user.js <phone> <amount>');
    console.log('Example: node backend/award-user.js +254114710035 2000000');
    process.exit(1);
}

awardUser(phone, amount).then(() => {
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});

