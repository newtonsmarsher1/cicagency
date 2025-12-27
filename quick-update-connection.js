// Quick script to help update connection string
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('\n🔧 Update PostgreSQL Connection String\n');
console.log('Project: gkavyanjmbidysinsqaz');
console.log('Host: db.gkavyanjmbidysinsqaz.supabase.co\n');

rl.question('Enter your Supabase database password: ', (password) => {
    if (!password || password.trim() === '') {
        console.error('\n❌ Password cannot be empty!');
        rl.close();
        process.exit(1);
    }

    // URL encode the password
    const encodedPassword = encodeURIComponent(password);
    
    // Build connection string
    const connectionString = `postgresql://postgres:${encodedPassword}@db.gkavyanjmbidysinsqaz.supabase.co:5432/postgres`;
    
    const envPath = path.join(__dirname, '.env');
    
    console.log('\n📝 Updating .env file...\n');
    
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
    const { Pool } = require('pg');
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
            console.log('\n🎉 Ready to start your server!');
            console.log('   Run: npm start\n');
            rl.close();
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
            }
            rl.close();
            pool.end();
            process.exit(1);
        });
});







