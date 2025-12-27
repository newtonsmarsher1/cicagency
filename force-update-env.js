// Force update .env file with connection string
const fs = require('fs');
const path = require('path');

const password = 'Mirinewton@2005';
const encodedPassword = encodeURIComponent(password);
const connectionString = `postgresql://postgres:${encodedPassword}@db.gkavyanjmbidysinsqaz.supabase.co:5432/postgres`;

console.log('\n📝 Force updating .env file...\n');
console.log('Connection string:', connectionString.replace(/:[^:@]+@/, ':****@'));
console.log('');

const envPath = path.join(__dirname, '.env');

let envContent = '';

// Read existing .env if it exists
if (fs.existsSync(envPath)) {
    console.log('📖 Reading existing .env file...');
    envContent = fs.readFileSync(envPath, 'utf8');
    console.log('   Found existing .env file');
} else {
    console.log('📄 Creating new .env file...');
}

// Remove old POSTGRES_URL lines (handle different formats)
envContent = envContent.replace(/^POSTGRES_URL=.*$/gm, '');
envContent = envContent.replace(/^#.*POSTGRES.*$/gm, '');

// Clean up extra blank lines
envContent = envContent.replace(/\n{3,}/g, '\n\n');
envContent = envContent.trim();

// Add new POSTGRES_URL
if (envContent) {
    envContent += '\n\n';
}
envContent += '# PostgreSQL Database Connection (New Supabase Project)\n';
envContent += `POSTGRES_URL=${connectionString}\n`;

// Ensure JWT_SECRET exists (if not present)
if (!envContent.includes('JWT_SECRET=')) {
    envContent += '\n# JWT Secret (generate with: node generate-jwt-secret.js)\n';
    envContent += 'JWT_SECRET=your-secret-key-here\n';
}

// Write to .env
try {
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('✅ Successfully updated .env file!');
    console.log('\n📋 Updated content:');
    console.log('   POSTGRES_URL=' + connectionString.replace(/:[^:@]+@/, ':****@'));
    console.log('');
    
    // Verify by reading it back
    const verify = fs.readFileSync(envPath, 'utf8');
    if (verify.includes(connectionString)) {
        console.log('✅ Verification: Connection string found in .env file');
    } else {
        console.log('⚠️  Warning: Could not verify connection string in file');
    }
    
    console.log('\n🧪 Testing connection...\n');
    
    // Test the connection
    require('dotenv').config();
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
                console.error('\n💡 Error code:', err.code || 'Unknown');
            }
            pool.end();
            process.exit(1);
        });
    
} catch (error) {
    console.error('❌ Failed to update .env file!');
    console.error('   Error:', error.message);
    console.error('\n💡 Try running as administrator or check file permissions');
    process.exit(1);
}







