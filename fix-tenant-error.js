// Fix "Tenant or user not found" error
require('dotenv').config();
const { Pool } = require('pg');

console.log('\n🔍 Diagnosing "Tenant or user not found" Error\n');
console.log('='.repeat(60));

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
    console.error('❌ POSTGRES_URL not found in .env');
    process.exit(1);
}

console.log('Current connection string format:');
const masked = connectionString.replace(/:[^:@]+@/, ':****@');
console.log('  ', masked);
console.log('');

// Parse the connection string
const match = connectionString.match(/postgresql:\/\/([^:]+):([^@]+)@([^\/]+)\/(.+)/);
if (match) {
    const [, user, password, host, database] = match;
    console.log('Parsed components:');
    console.log('  User:', user);
    console.log('  Host:', host);
    console.log('  Database:', database);
    console.log('');
    
    // Check user format
    if (user.includes('.')) {
        const [userPart, projectRef] = user.split('.');
        console.log('User format: postgres.[PROJECT_REF]');
        console.log('  User part:', userPart);
        console.log('  Project ref:', projectRef);
        console.log('');
        
        if (projectRef !== 'gkavyanjmbidysinsqaz') {
            console.log('⚠️  Warning: Project reference mismatch!');
            console.log('   Expected: gkavyanjmbidysinsqaz');
            console.log('   Found:', projectRef);
        }
    }
}

console.log('='.repeat(60));
console.log('💡 Possible Issues:');
console.log('='.repeat(60));
console.log('');
console.log('1. Wrong Project Reference');
console.log('   - Verify project ref in Supabase dashboard');
console.log('   - Should match: gkavyanjmbidysinsqaz');
console.log('');
console.log('2. Wrong User Format');
console.log('   - Pooled: postgres.[PROJECT_REF]');
console.log('   - Direct: postgres');
console.log('');
console.log('3. Wrong Password');
console.log('   - Verify password is correct');
console.log('   - Check if password needs URL encoding');
console.log('');
console.log('4. Wrong Connection String Type');
console.log('   - Try direct connection instead of pooled');
console.log('   - Or vice versa');
console.log('');

// Try direct connection format
console.log('='.repeat(60));
console.log('🔄 Alternative: Try Direct Connection');
console.log('='.repeat(60));
console.log('');

const directConnection = 'postgresql://postgres:Mirinewton%402005@db.gkavyanjmbidysinsqaz.supabase.co:5432/postgres';
console.log('Direct connection format:');
console.log('  postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres');
console.log('');

console.log('Testing direct connection...\n');

const directPool = new Pool({
    connectionString: directConnection,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
});

directPool.query('SELECT NOW() as time')
    .then(result => {
        console.log('✅ Direct connection works!');
        console.log('   Server time:', result.rows[0].time);
        console.log('');
        console.log('💡 Solution: Use direct connection string');
        console.log('   Update .env with:');
        console.log('   POSTGRES_URL=' + directConnection);
        console.log('');
        directPool.end();
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Direct connection also failed');
        console.error('   Error:', err.message);
        console.error('   Code:', err.code);
        console.log('');
        console.log('💡 Next steps:');
        console.log('   1. Verify project reference in Supabase dashboard');
        console.log('   2. Check password is correct');
        console.log('   3. Get fresh connection string from Supabase');
        console.log('   4. Try both pooled and direct connection strings');
        directPool.end();
        process.exit(1);
    });







