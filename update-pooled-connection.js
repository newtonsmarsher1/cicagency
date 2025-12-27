// Helper script to update .env with pooled connection string
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('\n🔧 Update Pooled Connection String\n');
console.log('='.repeat(60));
console.log('You need to get the connection string from Supabase Dashboard');
console.log('='.repeat(60));
console.log('\nSteps:');
console.log('1. Go to: https://supabase.com/dashboard/project/gkavyanjmbidysinsqaz');
console.log('2. Settings → Database → Connection string → Session mode');
console.log('3. Copy the connection string (it will have the actual region)');
console.log('4. Paste it below (it will have [YOUR-PASSWORD] placeholder)');
console.log('\nExample format:');
console.log('postgresql://postgres.gkavyanjmbidysinsqaz:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true');
console.log('');

rl.question('Paste the connection string from Supabase (with [YOUR-PASSWORD]): ', (connectionString) => {
    if (!connectionString || connectionString.trim() === '') {
        console.error('\n❌ Connection string cannot be empty!');
        rl.close();
        process.exit(1);
    }
    
    // Check if it has [YOUR-PASSWORD] placeholder
    if (!connectionString.includes('[YOUR-PASSWORD]')) {
        console.log('\n⚠️  Warning: Connection string doesn\'t have [YOUR-PASSWORD] placeholder');
        console.log('   If it already has a password, make sure it\'s URL-encoded');
    }
    
    rl.question('Enter your database password: ', (password) => {
        if (!password || password.trim() === '') {
            console.error('\n❌ Password cannot be empty!');
            rl.close();
            process.exit(1);
        }
        
        // URL encode the password
        const encodedPassword = encodeURIComponent(password);
        
        // Replace [YOUR-PASSWORD] with encoded password
        const finalConnectionString = connectionString.replace('[YOUR-PASSWORD]', encodedPassword);
        
        // Validate the connection string
        if (!finalConnectionString.startsWith('postgresql://')) {
            console.error('\n❌ Invalid connection string format!');
            console.error('   Should start with: postgresql://');
            rl.close();
            process.exit(1);
        }
        
        console.log('\n📝 Updating .env file...\n');
        
        const envPath = path.join(__dirname, '.env');
        let envContent = '';
        
        // Read existing .env if it exists
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
            
            // Remove old POSTGRES_URL
            envContent = envContent.replace(/^POSTGRES_URL=.*$/gm, '');
            envContent = envContent.replace(/^#.*PostgreSQL.*$/gmi, '');
            envContent = envContent.replace(/\n{3,}/g, '\n\n').trim();
        }
        
        // Add new connection string
        const newLine = envContent ? '\n\n' : '';
        envContent += newLine + '# PostgreSQL Database Connection (Pooled)\nPOSTGRES_URL=' + finalConnectionString + '\n';
        
        // Write to .env
        fs.writeFileSync(envPath, envContent, 'utf8');
        
        console.log('✅ .env file updated!');
        console.log('\n📋 Connection details:');
        console.log('   Type: Pooled connection');
        console.log('   Host:', finalConnectionString.match(/@([^:]+)/)?.[1] || 'N/A');
        console.log('   Port:', finalConnectionString.match(/:(\d+)/)?.[1] || 'N/A');
        console.log('');
        
        // Test the connection
        console.log('🧪 Testing connection...\n');
        
        const { Pool } = require('pg');
        const pool = new Pool({
            connectionString: finalConnectionString,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 10000
        });
        
        pool.query('SELECT NOW() as time, version() as version')
            .then(result => {
                console.log('✅ Connection successful!');
                console.log('   Server time:', result.rows[0].time);
                console.log('   PostgreSQL:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
                console.log('\n🎉 Your database is ready!');
                console.log('   You can now run: npm start\n');
                pool.end();
                rl.close();
                process.exit(0);
            })
            .catch(err => {
                console.error('❌ Connection failed!');
                console.error('   Error:', err.message);
                console.error('   Code:', err.code);
                
                if (err.code === 'ENOTFOUND') {
                    console.error('\n💡 DNS Error - Check:');
                    console.error('   1. Supabase project status');
                    console.error('   2. Verify the connection string is correct');
                } else if (err.code === '28P01' || err.message.includes('password')) {
                    console.error('\n💡 Authentication Error - Check:');
                    console.error('   1. Password is correct');
                    console.error('   2. Special characters are properly encoded');
                }
                
                pool.end();
                rl.close();
                process.exit(1);
            });
    });
});







