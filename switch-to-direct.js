// Switch to direct connection format
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const password = 'Mirinewton@2005';
const encodedPassword = encodeURIComponent(password);
const directConnection = `postgresql://postgres:${encodedPassword}@db.gkavyanjmbidysinsqaz.supabase.co:5432/postgres`;

console.log('\n🔄 Switching to Direct Connection Format\n');
console.log('='.repeat(60));
console.log('Pooled connection gave "Tenant or user not found" error');
console.log('Trying direct connection format instead...');
console.log('='.repeat(60));
console.log('');

const envPath = path.join(__dirname, '.env');

// Read existing .env
let envContent = '';
if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    console.log('✓ Found existing .env file');
} else {
    console.log('✓ Creating new .env file');
}

// Remove old POSTGRES_URL
envContent = envContent.replace(/^POSTGRES_URL=.*$/gm, '');
envContent = envContent.replace(/^#.*PostgreSQL.*$/gmi, '');
envContent = envContent.replace(/\n{3,}/g, '\n\n').trim();

// Add direct connection string
const newLine = envContent ? '\n\n' : '';
envContent += newLine + '# PostgreSQL Database Connection (Direct)\nPOSTGRES_URL=' + directConnection + '\n';

// Write to .env
fs.writeFileSync(envPath, envContent, 'utf8');

console.log('✅ Updated .env with direct connection string');
console.log('\n📋 Connection details:');
console.log('   Type: Direct connection');
console.log('   Host: db.gkavyanjmbidysinsqaz.supabase.co');
console.log('   Port: 5432');
console.log('   User: postgres');
console.log('');

console.log('🧪 Testing connection...\n');

// Test the connection
const pool = new Pool({
    connectionString: directConnection,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
});

pool.query('SELECT NOW() as time, version() as version')
    .then(result => {
        console.log('✅ Connection successful!');
        console.log('   Server time:', result.rows[0].time);
        console.log('   PostgreSQL:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
        console.log('\n🎉 Direct connection works!');
        console.log('   You can now run: npm start\n');
        pool.end();
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Connection failed!');
        console.error('   Error:', err.message);
        console.error('   Code:', err.code);
        console.log('');
        
        if (err.code === 'ENOTFOUND') {
            console.log('💡 DNS Error - Check:');
            console.log('   1. Supabase project status');
            console.log('   2. Project might be paused');
        } else if (err.code === '28P01' || err.message.includes('password')) {
            console.log('💡 Authentication Error - Check:');
            console.log('   1. Password is correct');
            console.log('   2. Password is URL-encoded');
        } else if (err.message.includes('Tenant') || err.message.includes('user not found')) {
            console.log('💡 Tenant Error - Possible solutions:');
            console.log('   1. Verify project reference: gkavyanjmbidysinsqaz');
            console.log('   2. Check if project is active in Supabase dashboard');
            console.log('   3. Get fresh connection string from Supabase');
            console.log('   4. Try creating a new Supabase project');
        }
        
        pool.end();
        process.exit(1);
    });







