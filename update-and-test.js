// Update .env and test connection
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const password = 'Mirinewton@2005';
const encodedPassword = encodeURIComponent(password);
const connectionString = `postgresql://postgres:${encodedPassword}@db.gkavyanjmbidysinsqaz.supabase.co:5432/postgres`;

console.log('\n📝 Updating .env file...\n');

const envPath = path.join(__dirname, '.env');
let envContent = '';

// Read existing .env if it exists
if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    
    // Remove old POSTGRES_URL
    envContent = envContent.replace(/^POSTGRES_URL=.*$/gm, '');
    
    // Clean up extra blank lines
    envContent = envContent.replace(/\n{3,}/g, '\n\n');
}

// Add new POSTGRES_URL
const newLine = envContent.trim() === '' ? '' : '\n';
envContent = envContent.trim() + newLine + '\n# PostgreSQL Database Connection (New Supabase Project)\nPOSTGRES_URL=' + connectionString + '\n';

// Write to .env
fs.writeFileSync(envPath, envContent, 'utf8');

console.log('✅ Connection string updated in .env!');
console.log('\n📋 Connection details:');
console.log('   Host: db.gkavyanjmbidysinsqaz.supabase.co');
console.log('   Database: postgres');
console.log('   Password: [ENCODED]\n');

console.log('🧪 Testing connection...\n');

// Test the connection
const pool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.query('SELECT NOW() as current_time, version() as pg_version')
    .then(result => {
        console.log('✅ Connection successful!');
        console.log('   Current time:', result.rows[0].current_time);
        console.log('   PostgreSQL:', result.rows[0].pg_version.split(' ')[0] + ' ' + result.rows[0].pg_version.split(' ')[1]);
        console.log('\n🎉 Your database is ready!');
        console.log('   You can now run: npm start\n');
        pool.end();
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Connection failed!');
        console.error('   Error:', err.message);
        if (err.code === 'ENOTFOUND') {
            console.error('\n💡 DNS Error - Check:');
            console.error('   1. Supabase project status: https://supabase.com/dashboard/project/gkavyanjmbidysinsqaz');
            console.error('   2. Project might be paused or deleted');
            console.error('   3. Verify the project reference is correct\n');
        } else if (err.code === '28P01' || err.message.includes('password')) {
            console.error('\n💡 Authentication Error - Check:');
            console.error('   1. Password is correct');
            console.error('   2. Special characters are properly encoded\n');
        } else {
            console.error('\n💡 Error details:', err.code || 'Unknown');
        }
        pool.end();
        process.exit(1);
    });







