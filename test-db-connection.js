const { Pool } = require('pg');

// Test database connection
async function testConnection() {
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    
    if (!connectionString) {
        console.error('❌ No POSTGRES_URL found in environment variables');
        return;
    }
    
    console.log('🔍 Testing database connection...');
    console.log('Connection string:', connectionString.replace(/:[^:@]+@/, ':****@')); // Hide password
    
    // Parse the connection string to extract hostname
    const urlMatch = connectionString.match(/@([^:]+):(\d+)\//);
    if (urlMatch) {
        const hostname = urlMatch[1];
        const port = urlMatch[2];
        console.log(`\nHostname: ${hostname}`);
        console.log(`Port: ${port}`);
        
        // Test DNS resolution
        const dns = require('dns');
        dns.lookup(hostname, (err, address) => {
            if (err) {
                console.error(`\n❌ DNS lookup failed for ${hostname}:`);
                console.error(`   Error: ${err.message}`);
                console.error(`\n💡 Possible solutions:`);
                console.error(`   1. Check if your Supabase project still exists`);
                console.error(`   2. Get a fresh connection string from Supabase dashboard`);
                console.error(`   3. Check your internet connection`);
                console.error(`   4. Try using a different DNS server`);
            } else {
                console.log(`✅ DNS resolved: ${hostname} -> ${address}`);
                console.log(`\nAttempting database connection...`);
                
                // Try to connect
                const pool = new Pool({
                    connectionString: connectionString,
                    ssl: { rejectUnauthorized: false }
                });
                
                pool.query('SELECT 1', (err, result) => {
                    if (err) {
                        console.error(`\n❌ Database connection failed:`);
                        console.error(`   ${err.message}`);
                    } else {
                        console.log(`\n✅ Database connection successful!`);
                    }
                    pool.end();
                });
            }
        });
    } else {
        console.error('❌ Invalid connection string format');
    }
}

require('dotenv').config();
testConnection();








