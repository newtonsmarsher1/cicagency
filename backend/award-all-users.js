const path = require('path');
const { pool, testConnection } = require('./config/database');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

/**
 * Script to award all users a specific amount (PostgreSQL/Supabase)
 * Usage: node award-all-users.js
 */
async function awardAllUsers() {
    try {
        const connected = await testConnection();
        if (!connected) {
            console.error('❌ Database connection failed');
            process.exit(1);
        }

        const awardAmount = 809000;
        console.log(`💰 Awarding ${awardAmount.toLocaleString()} to all users...\n`);

        // Get user count
        const [userCountRows] = await pool.execute('SELECT COUNT(*) as count FROM users');
        const userCount = userCountRows[0]?.count || 0;
        console.log(`📊 Found ${userCount} users\n`);

        if (userCount === 0) {
            console.log('⚠️  No users found in database');
            return;
        }

        console.log('⚠️  WARNING: This will update ALL users in the database!');
        console.log(`   Amount to award: ${awardAmount.toLocaleString()}`);
        console.log(`   Users affected: ${userCount}`);
        console.log('\n🔄 Starting update...\n');

        await pool.execute('BEGIN');

        try {
            const [result] = await pool.execute(
                `UPDATE users 
                 SET 
                     wallet_balance = wallet_balance + ?,
                     total_earnings = total_earnings + ?
                 WHERE id > 0`,
                [awardAmount, awardAmount]
            );

            console.log(`✅ Updated ${result.affectedRows || result.rowCount || 0} users`);
            console.log(`   - Added ${awardAmount.toLocaleString()} to wallet_balance`);
            console.log(`   - Added ${awardAmount.toLocaleString()} to total_earnings`);

            // Record the award in payments table for each user
            console.log('\n📝 Recording awards in payments table...');
            const [users] = await pool.execute('SELECT id, name FROM users');
            
            let paymentRecords = 0;
            for (const user of users) {
                try {
                    await pool.execute(
                        `INSERT INTO payments (user_id, amount, payment_type, status, payment_method, description) 
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            user.id,
                            awardAmount,
                            'referral', // within CHECK constraint
                            'completed',
                            'system',
                            `System award: ${awardAmount.toLocaleString()}`
                        ]
                    );
                    paymentRecords++;
                } catch (paymentError) {
                    console.error(`⚠️  Could not record payment for user ${user.id} (${user.name}):`, paymentError.message);
                }
            }

            console.log(`✅ Recorded ${paymentRecords} payment entries`);

            await pool.execute('COMMIT');
            console.log('\n✅ All users have been awarded successfully!');
            console.log('='.repeat(60));
            console.log('📊 Summary:');
            console.log(`   - ${result.affectedRows || result.rowCount || 0} users updated`);
            console.log(`   - ${awardAmount.toLocaleString()} added to each user's wallet`);
            console.log(`   - ${awardAmount.toLocaleString()} added to each user's total earnings`);
            console.log(`   - ${paymentRecords} payment records created`);
            console.log('\n🎉 Award process complete!');

        } catch (error) {
            await pool.execute('ROLLBACK');
            throw error;
        }

    } catch (error) {
        console.error('❌ Error awarding users:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

console.log('🚀 Starting user award script...\n');
awardAllUsers()
    .then(() => {
        console.log('\n✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });

