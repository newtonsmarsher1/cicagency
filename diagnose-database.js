require('dotenv').config();
const dns = require('dns');
const { promisify } = require('util');
const lookup = promisify(dns.lookup);

console.log('🔍 Database Connection Diagnostic Tool\n');
console.log('='.repeat(60));

// 1. Check environment variables
console.log('\n1️⃣ Checking Environment Variables:');
const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (postgresUrl) {
    // Hide password in output
    const safeUrl = postgresUrl.replace(/:[^:@]+@/, ':****@');
    console.log('   ✅ POSTGRES_URL found');
    console.log('   Connection string:', safeUrl);
    
    // Parse connection string
    const urlMatch = postgresUrl.match(/@([^:]+):(\d+)\/(.+)/);
    if (urlMatch) {
        const hostname = urlMatch[1];
        const port = urlMatch[2];
        const database = urlMatch[3];
        
        console.log('\n2️⃣ Parsing Connection String:');
        console.log('   Hostname:', hostname);
        console.log('   Port:', port);
        console.log('   Database:', database);
        
        // 3. Test DNS resolution
        console.log('\n3️⃣ Testing DNS Resolution:');
        lookup(hostname, { all: true })
            .then(addresses => {
                console.log('   ✅ DNS Resolution: SUCCESS');
                addresses.forEach((addr, i) => {
                    console.log(`   Address ${i + 1}:`, addr.address, `(family: ${addr.family})`);
                });
                
                // 4. Test TCP connection
                console.log('\n4️⃣ Testing TCP Connection:');
                const net = require('net');
                const socket = new net.Socket();
                
                socket.setTimeout(5000);
                
                socket.on('connect', () => {
                    console.log('   ✅ TCP Connection: SUCCESS');
                    console.log('   Port', port, 'is reachable');
                    socket.destroy();
                    testDatabaseConnection();
                });
                
                socket.on('timeout', () => {
                    console.log('   ❌ TCP Connection: TIMEOUT');
                    console.log('   Port', port, 'is not reachable or firewall is blocking');
                    socket.destroy();
                    testDatabaseConnection();
                });
                
                socket.on('error', (err) => {
                    console.log('   ❌ TCP Connection: FAILED');
                    console.log('   Error:', err.message);
                    testDatabaseConnection();
                });
                
                // Try connecting
                socket.connect(parseInt(port), hostname);
            })
            .catch(err => {
                console.log('   ❌ DNS Resolution: FAILED');
                console.log('   Error:', err.message);
                console.log('\n💡 Possible causes:');
                console.log('   1. Supabase project is PAUSED - go to dashboard and restore it');
                console.log('   2. Project was DELETED - create a new one');
                console.log('   3. Hostname is INCORRECT - check your project ref in Supabase');
                console.log('   4. Network/DNS issue - try different network or flush DNS');
            });
    } else {
        console.log('   ❌ Invalid connection string format');
        console.log('   Expected: postgresql://user:password@host:port/database');
    }
} else {
    console.log('   ❌ POSTGRES_URL not found in .env file');
    console.log('   Please add: POSTGRES_URL=postgresql://postgres:password@host:5432/postgres');
}

// 5. Test actual database connection
async function testDatabaseConnection() {
    console.log('\n5️⃣ Testing Database Connection:');
    try {
        const { Pool } = require('pg');
        const pool = new Pool({
            connectionString: postgresUrl,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 10000
        });
        
        const result = await pool.query('SELECT version(), current_database(), current_user');
        console.log('   ✅ Database Connection: SUCCESS');
        console.log('   PostgreSQL Version:', result.rows[0].version.split(',')[0]);
        console.log('   Current Database:', result.rows[0].current_database);
        console.log('   Current User:', result.rows[0].current_user);
        
        await pool.end();
        
        console.log('\n✅ All checks passed! Your database is ready to use.');
    } catch (error) {
        console.log('   ❌ Database Connection: FAILED');
        console.log('   Error:', error.message);
        console.log('   Code:', error.code);
        
        if (error.code === 'ENOTFOUND') {
            console.log('\n💡 ENOTFOUND Error Solutions:');
            console.log('   1. Check Supabase dashboard - is project ACTIVE (not paused)?');
            console.log('   2. Verify project ref matches: db.[ref].supabase.co');
            console.log('   3. Try: ipconfig /flushdns (Windows)');
            console.log('   4. Restart your computer');
            console.log('   5. Try different network (mobile hotspot)');
        } else if (error.code === '28P01') {
            console.log('\n💡 Authentication Error Solutions:');
            console.log('   1. Check password is correct');
            console.log('   2. Ensure password is URL-encoded (@ = %40, ! = %21)');
            console.log('   3. Reset password in Supabase dashboard');
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
            console.log('\n💡 Connection Timeout/Refused Solutions:');
            console.log('   1. Check firewall settings');
            console.log('   2. Verify port 5432 is not blocked');
            console.log('   3. Check if Supabase project is active');
        }
    }
}







