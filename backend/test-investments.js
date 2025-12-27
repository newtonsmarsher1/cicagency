/**
 * Test script to verify investments table on Supabase/PostgreSQL
 */
const path = require('path');
const { testConnection, initializeDatabase, pool } = require('./config/database');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function ensureTables() {
    // initializeDatabase is idempotent and will create investments/users/payments
    await initializeDatabase();
}

async function tableExists(name) {
    const [rows] = await pool.execute(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ?`,
        [name]
    );
    return rows.length > 0;
}

async function testInvestments() {
    try {
        console.log('🔗 Testing connection...');
        const ok = await testConnection();
        if (!ok) {
            console.error('❌ Cannot continue because database connection failed');
            process.exit(1);
        }

        console.log('🛠️  Ensuring schema is present...');
        await ensureTables();

        const hasInvestments = await tableExists('investments');
        const hasUsers = await tableExists('users');
        const hasPayments = await tableExists('payments');

        console.log(hasInvestments ? '✅ investments table exists' : '❌ investments table missing');
        console.log(hasUsers ? '✅ users table exists' : '❌ users table missing');
        console.log(hasPayments ? '✅ payments table exists' : '❌ payments table missing');

        if (!hasInvestments || !hasUsers || !hasPayments) {
            console.error('\n⚠️  One or more required tables are missing. Re-run initializeDatabase or check Supabase permissions.');
        } else {
            console.log('\n✅ All checks completed! Schema is ready.');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

console.log('🚀 Testing investments setup (Supabase/PostgreSQL)...\n');
testInvestments()
    .then(() => {
        console.log('\n✅ Test completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    });



