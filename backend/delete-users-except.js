// Script to delete all users except the specified phone number
// Run: node backend/delete-users-except.js

const { pool } = require('./config/database');
require('dotenv').config();

async function deleteUsersExcept(keepPhone) {
    let connection;
    
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        console.log('\n🔍 Starting user deletion process...');
        console.log('='.repeat(50));
        
        // First, find the user to keep
        const [keepUser] = await connection.execute(
            'SELECT id, name, phone, invitation_code FROM users WHERE phone = ?',
            [keepPhone]
        );
        
        if (keepUser.length === 0) {
            console.log(`❌ User with phone ${keepPhone} not found!`);
            console.log('   Aborting deletion - cannot proceed without the user to keep.');
            await connection.rollback();
            connection.release();
            return;
        }
        
        const userToKeep = keepUser[0];
        console.log(`✅ Found user to keep:`);
        console.log(`   ID: ${userToKeep.id}`);
        console.log(`   Name: ${userToKeep.name}`);
        console.log(`   Phone: ${userToKeep.phone}`);
        console.log(`   Invitation Code: ${userToKeep.invitation_code || 'N/A'}`);
        
        // Get count of users to delete
        const [allUsers] = await connection.execute(
            'SELECT COUNT(*) as total FROM users WHERE phone != ?',
            [keepPhone]
        );
        
        const usersToDelete = allUsers[0].total;
        console.log(`\n📊 Found ${usersToDelete} users to delete`);
        
        if (usersToDelete === 0) {
            console.log('✅ No users to delete - only the specified user exists.');
            await connection.commit();
            connection.release();
            return;
        }
        
        // Step 1: Set invited_by to NULL for users who were invited by users we're deleting
        // This prevents foreign key constraint issues
        console.log('\n🔧 Step 1: Clearing invited_by references...');
        const [updateResult] = await connection.execute(
            `UPDATE users 
             SET invited_by = NULL 
             WHERE invited_by IN (
                 SELECT id FROM (SELECT id FROM users WHERE phone != ?) AS temp
             )`,
            [keepPhone]
        );
        console.log(`   Updated ${updateResult.affectedRows} user references`);
        
        // Step 2: Delete related data first (due to foreign keys)
        console.log('\n🗑️  Step 2: Deleting related data...');
        
        // Delete user tasks
        const [tasksDeleted] = await connection.execute(
            'DELETE FROM user_tasks WHERE user_id IN (SELECT id FROM users WHERE phone != ?)',
            [keepPhone]
        );
        console.log(`   Deleted ${tasksDeleted.affectedRows} user tasks`);
        
        // Delete payments
        const [paymentsDeleted] = await connection.execute(
            'DELETE FROM payments WHERE user_id IN (SELECT id FROM users WHERE phone != ?)',
            [keepPhone]
        );
        console.log(`   Deleted ${paymentsDeleted.affectedRows} payments`);
        
        // Delete withdrawal requests
        const [withdrawalsDeleted] = await connection.execute(
            'DELETE FROM withdrawal_requests WHERE user_id IN (SELECT id FROM users WHERE phone != ?)',
            [keepPhone]
        );
        console.log(`   Deleted ${withdrawalsDeleted.affectedRows} withdrawal requests`);
        
        // Delete payment details
        const [paymentDetailsDeleted] = await connection.execute(
            'DELETE FROM payment_details WHERE user_id IN (SELECT id FROM users WHERE phone != ?)',
            [keepPhone]
        );
        console.log(`   Deleted ${paymentDetailsDeleted.affectedRows} payment details`);
        
        // Delete notifications
        const [notificationsDeleted] = await connection.execute(
            'DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE phone != ?)',
            [keepPhone]
        );
        console.log(`   Deleted ${notificationsDeleted.affectedRows} notifications`);
        
        // Update invitation_codes table - set created_by and used_by to NULL for deleted users
        const [invCodesUpdated] = await connection.execute(
            `UPDATE invitation_codes 
             SET created_by = NULL, used_by = NULL 
             WHERE created_by IN (SELECT id FROM users WHERE phone != ?) 
                OR used_by IN (SELECT id FROM users WHERE phone != ?)`,
            [keepPhone, keepPhone]
        );
        console.log(`   Updated ${invCodesUpdated.affectedRows} invitation code references`);
        
        // Step 3: Delete the users
        console.log('\n🗑️  Step 3: Deleting users...');
        const [usersDeleted] = await connection.execute(
            'DELETE FROM users WHERE phone != ?',
            [keepPhone]
        );
        console.log(`   Deleted ${usersDeleted.affectedRows} users`);
        
        // Verify only the kept user remains
        const [remainingUsers] = await connection.execute(
            'SELECT COUNT(*) as total FROM users'
        );
        
        console.log(`\n✅ Verification: ${remainingUsers[0].total} user(s) remaining`);
        
        if (remainingUsers[0].total === 1) {
            const [finalUser] = await connection.execute(
                'SELECT id, name, phone FROM users'
            );
            console.log(`   Remaining user: ${finalUser[0].name} (${finalUser[0].phone})`);
        }
        
        // Commit transaction
        await connection.commit();
        console.log('\n✅ All users deleted successfully (except the specified user)');
        console.log('='.repeat(50) + '\n');
        
        connection.release();
        
    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        console.error('\n❌ Error during deletion:', error.message);
        console.error(error);
        throw error;
    }
}

// Get phone number from command line or use default
const keepPhone = process.argv[2] || '+254114710035';

console.log(`\n⚠️  WARNING: This will delete ALL users except ${keepPhone}`);
console.log('Press Ctrl+C within 5 seconds to cancel...\n');

// Wait 5 seconds before proceeding
setTimeout(async () => {
    try {
        await deleteUsersExcept(keepPhone);
        process.exit(0);
    } catch (error) {
        console.error('Failed to delete users:', error);
        process.exit(1);
    }
}, 5000);


