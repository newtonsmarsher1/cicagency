// Comprehensive DNS and connection diagnostics
require('dotenv').config();
const dns = require('dns').promises;
const { Pool } = require('pg');

const hostname = 'db.gkavyanjmbidysinsqaz.supabase.co';
const connectionString = process.env.POSTGRES_URL;

console.log('\n🔍 Comprehensive Connection Diagnostics\n');
console.log('='.repeat(60));
console.log('1️⃣  DNS Resolution Test');
console.log('='.repeat(60));

dns.lookup(hostname)
    .then(addresses => {
        console.log('✅ DNS Resolution: SUCCESS');
        console.log('   IP Address:', addresses.address || addresses);
        console.log('');
        
        console.log('='.repeat(60));
        console.log('2️⃣  Connection String Check');
        console.log('='.repeat(60));
        if (connectionString) {
            console.log('✅ POSTGRES_URL found in .env');
            console.log('   Host:', hostname);
            console.log('   Format:', connectionString.includes('pooler') ? 'Pooled' : 'Direct');
            console.log('');
            
            console.log('='.repeat(60));
            console.log('3️⃣  Database Connection Test');
            console.log('='.repeat(60));
            
            const pool = new Pool({
                connectionString: connectionString,
                ssl: {
                    rejectUnauthorized: false
                },
                connectionTimeoutMillis: 10000
            });
            
            return pool.query('SELECT NOW() as time, version() as version')
                .then(result => {
                    console.log('✅ Database Connection: SUCCESS');
                    console.log('   Server Time:', result.rows[0].time);
                    console.log('   PostgreSQL:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
                    console.log('\n🎉 Everything is working!');
                    pool.end();
                    process.exit(0);
                })
                .catch(err => {
                    console.error('❌ Database Connection: FAILED');
                    console.error('   Error:', err.message);
                    console.error('   Code:', err.code);
                    pool.end();
                    process.exit(1);
                });
        } else {
            console.error('❌ POSTGRES_URL not found in .env');
            process.exit(1);
        }
    })
    .catch(err => {
        console.error('❌ DNS Resolution: FAILED');
        console.error('   Error:', err.message);
        console.error('   Code:', err.code);
        console.error('');
        
        console.log('='.repeat(60));
        console.log('💡 Troubleshooting Steps');
        console.log('='.repeat(60));
        console.log('');
        console.log('1. Check Supabase Project Status:');
        console.log('   https://supabase.com/dashboard/project/gkavyanjmbidysinsqaz');
        console.log('');
        console.log('2. Verify Project Reference:');
        console.log('   - Project ref should be: gkavyanjmbidysinsqaz');
        console.log('   - Check if project is paused or deleted');
        console.log('');
        console.log('3. Try Flushing DNS Cache:');
        console.log('   ipconfig /flushdns');
        console.log('');
        console.log('4. Check Network Connection:');
        console.log('   - Ensure you have internet access');
        console.log('   - Try accessing: https://gkavyanjmbidysinsqaz.supabase.co');
        console.log('');
        console.log('5. Wait for Project Provisioning:');
        console.log('   - New projects can take a few minutes to provision');
        console.log('   - Check Supabase dashboard for project status');
        console.log('');
        console.log('6. Get Fresh Connection String:');
        console.log('   - Go to Supabase Dashboard → Settings → Database');
        console.log('   - Copy the connection string from "Connection string" → "URI" tab');
        console.log('');
        
        process.exit(1);
    });







