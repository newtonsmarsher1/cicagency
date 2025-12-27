// Direct .env update script
const fs = require('fs');
const path = require('path');

const password = 'Mirinewton@2005';
const encodedPassword = encodeURIComponent(password);
const connectionString = `postgresql://postgres:${encodedPassword}@db.gkavyanjmbidysinsqaz.supabase.co:5432/postgres`;

const envPath = path.join(__dirname, '.env');

console.log('\n🔧 Updating .env file...\n');

// Read existing content
let existingContent = '';
if (fs.existsSync(envPath)) {
    existingContent = fs.readFileSync(envPath, 'utf8');
    console.log('✓ Found existing .env file');
} else {
    console.log('✓ Creating new .env file');
}

// Remove old POSTGRES_URL
existingContent = existingContent.replace(/^POSTGRES_URL=.*$/gm, '');
existingContent = existingContent.replace(/^#.*PostgreSQL.*$/gmi, '');
existingContent = existingContent.replace(/\n{3,}/g, '\n\n').trim();

// Add new connection string
const newContent = existingContent + 
    (existingContent ? '\n\n' : '') +
    '# PostgreSQL Database Connection (New Supabase Project)\n' +
    `POSTGRES_URL=${connectionString}\n`;

// Write file
try {
    fs.writeFileSync(envPath, newContent, 'utf8');
    console.log('✅ .env file updated successfully!\n');
    
    // Verify
    const verifyContent = fs.readFileSync(envPath, 'utf8');
    if (verifyContent.includes('gkavyanjmbidysinsqaz')) {
        console.log('✅ Verification: Connection string found in file');
        console.log('   Host: db.gkavyanjmbidysinsqaz.supabase.co');
        console.log('   Password: [ENCODED]\n');
    } else {
        console.log('⚠️  Warning: Could not verify update');
    }
    
    // Show what was written (masked)
    const lines = verifyContent.split('\n');
    const postgresLine = lines.find(line => line.startsWith('POSTGRES_URL='));
    if (postgresLine) {
        console.log('📋 POSTGRES_URL:', postgresLine.replace(/:[^:@]+@/, ':****@'));
    }
    
    console.log('\n🧪 Testing connection...\n');
    
    // Test connection
    const { Pool } = require('pg');
    const pool = new Pool({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });
    
    pool.query('SELECT NOW() as time')
        .then(result => {
            console.log('✅ Database connection successful!');
            console.log('   Server time:', result.rows[0].time);
            console.log('\n🎉 Ready to start your server!');
            console.log('   Run: npm start\n');
            pool.end();
            process.exit(0);
        })
        .catch(err => {
            console.error('❌ Connection test failed:');
            console.error('   ', err.message);
            if (err.code === 'ENOTFOUND') {
                console.error('\n💡 DNS error - check Supabase project status');
            }
            pool.end();
            process.exit(1);
        });
    
} catch (error) {
    console.error('❌ Failed to update .env file!');
    console.error('   Error:', error.message);
    console.error('\n💡 Check file permissions or try running as administrator');
    process.exit(1);
}







