// Simple database connection test
require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
    console.error('❌ POSTGRES_URL not found in .env file');
    process.exit(1);
}

// Validate connection string format
if (connectionString.includes('[region]') || connectionString.includes('[YOUR-PASSWORD]')) {
    console.error('❌ Connection string has placeholders!');
    console.error('   Found:', connectionString.includes('[region]') ? '[region]' : '[YOUR-PASSWORD]');
    console.error('\n💡 Get the actual connection string from:');
    console.error('   Supabase Dashboard → Settings → Database → Connection string → Session mode');
    console.error('   Then replace [YOUR-PASSWORD] with your actual URL-encoded password');
    console.error('\n   Or run: node update-pooled-connection.js');
    process.exit(1);
}

console.log('🔗 Testing database connection...\n');
console.log('Connection string:', connectionString.replace(/:[^:@]+@/, ':****@')); // Hide password
console.log('');

const pool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000
});

pool.query('SELECT NOW() as current_time, version() as pg_version')
    .then(result => {
        console.log('✅ Connection successful!');
        console.log('   Current time:', result.rows[0].current_time);
        console.log('   PostgreSQL version:', result.rows[0].pg_version.split(' ')[0] + ' ' + result.rows[0].pg_version.split(' ')[1]);
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Connection failed!');
        console.error('   Error:', err.message);
        if (err.code === 'ENOTFOUND') {
            console.error('\n💡 DNS Error - Possible causes:');
            console.error('   1. Supabase project is paused or deleted');
            console.error('   2. Wrong project reference in connection string');
            console.error('   3. Network/DNS issues');
            console.error('\n   Check: https://supabase.com/dashboard/project/gkavyanjmbidysinsqaz');
        }
        process.exit(1);
    })
    .finally(() => {
        pool.end();
    });







