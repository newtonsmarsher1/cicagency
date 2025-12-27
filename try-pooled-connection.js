// Try using pooled connection string instead of direct
require('dotenv').config();
const { Pool } = require('pg');

console.log('\n🔍 Testing Pooled Connection String\n');

// Pooled connection string format
// Format: postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
// You need to get this from Supabase Dashboard → Settings → Database → Connection string → Session mode

const password = 'Mirinewton@2005';
const encodedPassword = encodeURIComponent(password);
const projectRef = 'gkavyanjmbidysinsqaz';

// Try pooled connection (you need to get the actual region from Supabase dashboard)
// Common regions: us-east-1, us-west-1, eu-west-1, ap-southeast-1
const regions = ['us-east-1', 'us-west-1', 'eu-west-1', 'ap-southeast-1', 'ap-south-1'];

console.log('⚠️  To use pooled connection, you need to:');
console.log('   1. Go to Supabase Dashboard → Settings → Database');
console.log('   2. Click "Connection string" → "Session mode" tab');
console.log('   3. Copy the connection string (it will have "pooler" in hostname)');
console.log('   4. Update your .env file with that connection string\n');

console.log('📋 Current connection string format:');
console.log('   Direct: postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres');
console.log('   Pooled: postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres\n');

console.log('💡 Pooled connections are often more reliable!\n');

// Test current connection
const currentConnection = process.env.POSTGRES_URL;
if (currentConnection) {
    console.log('🧪 Testing current connection...\n');
    
    const pool = new Pool({
        connectionString: currentConnection,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000
    });
    
    pool.query('SELECT NOW() as time')
        .then(result => {
            console.log('✅ Current connection works!');
            console.log('   Server time:', result.rows[0].time);
            pool.end();
            process.exit(0);
        })
        .catch(err => {
            console.error('❌ Current connection failed:', err.message);
            console.error('   Code:', err.code);
            
            if (err.code === 'ENOTFOUND') {
                console.log('\n💡 DNS Error - Try these solutions:');
                console.log('   1. Check Supabase project status');
                console.log('   2. Get pooled connection string from dashboard');
                console.log('   3. Flush DNS: ipconfig /flushdns');
            }
            
            pool.end();
            process.exit(1);
        });
} else {
    console.error('❌ POSTGRES_URL not found in .env');
    process.exit(1);
}







