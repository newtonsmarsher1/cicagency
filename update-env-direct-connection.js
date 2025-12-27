// Update .env to use direct connection instead of pooled
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const password = 'Mirinewton@2005';
const encodedPassword = encodeURIComponent(password);
const directConnection = `postgresql://postgres:${encodedPassword}@db.gkavyanjmbidysinsqaz.supabase.co:5432/postgres`;

console.log('\n🔄 Updating .env to use Direct Connection\n');
console.log('='.repeat(60));
console.log('Changing from pooled to direct connection format');
console.log('='.repeat(60));
console.log('');

const envPath = path.join(__dirname, '.env');

if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found!');
    process.exit(1);
}

// Read .env file
let envContent = fs.readFileSync(envPath, 'utf8');

console.log('📖 Current POSTGRES_URL:');
const currentMatch = envContent.match(/^POSTGRES_URL=(.+)$/m);
if (currentMatch) {
    console.log('   ' + currentMatch[1].replace(/:[^:@]+@/, ':****@'));
} else {
    console.log('   Not found');
}
console.log('');

// Replace POSTGRES_URL line
envContent = envContent.replace(
    /^POSTGRES_URL=.*$/m,
    `POSTGRES_URL=${directConnection}`
);

// Update comment if it exists
envContent = envContent.replace(
    /^# PostgreSQL Database Connection \(.*\)$/m,
    '# PostgreSQL Database Connection (Direct Connection)'
);

// Write back to file
fs.writeFileSync(envPath, envContent, 'utf8');

console.log('✅ Updated .env file');
console.log('\n📋 New POSTGRES_URL:');
console.log('   ' + directConnection.replace(/:[^:@]+@/, ':****@'));
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
        console.log('   Your .env file has been updated.');
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
            console.log('   1. Password is correct: Mirinewton@2005');
            console.log('   2. Password is URL-encoded: Mirinewton%402005');
        } else if (err.message.includes('Tenant') || err.message.includes('user not found')) {
            console.log('💡 Tenant Error - Possible solutions:');
            console.log('   1. Verify project reference: gkavyanjmbidysinsqaz');
            console.log('   2. Check if project is active in Supabase dashboard');
            console.log('   3. Get fresh connection string from Supabase');
        }
        
        console.log('\n⚠️  Note: .env file was updated, but connection test failed.');
        console.log('   You may need to verify the connection string manually.\n');
        
        pool.end();
        process.exit(1);
    });







