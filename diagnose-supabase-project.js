// Comprehensive Supabase project diagnosis
require('dotenv').config();
const dns = require('dns').promises;
const https = require('https');

const projectRef = 'gkavyanjmbidysinsqaz';
const supabaseUrl = `https://${projectRef}.supabase.co`;
const dbHost = `db.${projectRef}.supabase.co`;

console.log('\n🔍 Supabase Project Diagnosis\n');
console.log('='.repeat(60));
console.log('Project Reference:', projectRef);
console.log('Supabase URL:', supabaseUrl);
console.log('Database Host:', dbHost);
console.log('='.repeat(60));
console.log('');

// Test 1: DNS Resolution
console.log('1️⃣  Testing DNS Resolution...');
dns.lookup(dbHost)
    .then(addresses => {
        console.log('✅ DNS Resolution: SUCCESS');
        console.log('   IP Address:', addresses.address || addresses);
        console.log('');
        
        // Test 2: HTTPS Connection to Supabase
        console.log('2️⃣  Testing Supabase Dashboard Access...');
        return new Promise((resolve, reject) => {
            const req = https.get(supabaseUrl, { timeout: 5000 }, (res) => {
                console.log('✅ Supabase Dashboard: ACCESSIBLE');
                console.log('   Status Code:', res.statusCode);
                console.log('');
                resolve();
            });
            
            req.on('error', (err) => {
                if (err.code === 'ENOTFOUND') {
                    console.log('❌ Supabase Dashboard: NOT FOUND');
                    console.log('   This usually means the project is paused or deleted');
                } else {
                    console.log('⚠️  Supabase Dashboard: ERROR');
                    console.log('   Error:', err.message);
                }
                console.log('');
                resolve(); // Continue with other tests
            });
            
            req.on('timeout', () => {
                req.destroy();
                console.log('⚠️  Supabase Dashboard: TIMEOUT');
                console.log('');
                resolve();
            });
        });
    })
    .then(() => {
        // Test 3: Database Connection
        console.log('3️⃣  Testing Database Connection...');
        const { Pool } = require('pg');
        const connectionString = process.env.POSTGRES_URL;
        
        if (!connectionString) {
            console.log('❌ POSTGRES_URL not found in .env');
            return;
        }
        
        const pool = new Pool({
            connectionString: connectionString,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 10000
        });
        
        return pool.query('SELECT NOW() as time')
            .then(result => {
                console.log('✅ Database Connection: SUCCESS');
                console.log('   Server time:', result.rows[0].time);
                console.log('\n🎉 Everything is working!');
                pool.end();
                process.exit(0);
            })
            .catch(err => {
                console.log('❌ Database Connection: FAILED');
                console.log('   Error:', err.message);
                console.log('   Code:', err.code);
                pool.end();
                
                // Final recommendations
                console.log('\n' + '='.repeat(60));
                console.log('💡 Recommendations');
                console.log('='.repeat(60));
                console.log('');
                console.log('1. Check Supabase Project Status:');
                console.log('   https://supabase.com/dashboard/project/' + projectRef);
                console.log('');
                console.log('2. Verify Project is Active:');
                console.log('   - Project should show as "Active" (not "Paused")');
                console.log('   - If paused, click "Restore" or "Resume"');
                console.log('');
                console.log('3. Get Fresh Connection String:');
                console.log('   - Go to Settings → Database → Connection string');
                console.log('   - Copy the connection string from "URI" tab');
                console.log('   - Update your .env file');
                console.log('');
                console.log('4. If Project Doesn\'t Exist:');
                console.log('   - Create a new Supabase project');
                console.log('   - Get the new connection string');
                console.log('   - Update your .env file');
                console.log('');
                
                process.exit(1);
            });
    })
    .catch(err => {
        console.log('❌ DNS Resolution: FAILED');
        console.log('   Error:', err.message);
        console.log('   Code:', err.code);
        console.log('');
        
        console.log('='.repeat(60));
        console.log('💡 This means the project hostname cannot be resolved');
        console.log('='.repeat(60));
        console.log('');
        console.log('Most likely causes:');
        console.log('1. ❌ Project is PAUSED or DELETED');
        console.log('2. ❌ Project reference is WRONG');
        console.log('3. ❌ Project hasn\'t finished PROVISIONING');
        console.log('4. ⚠️  Network/DNS issues');
        console.log('');
        console.log('Next steps:');
        console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef);
        console.log('2. Check if project exists and is active');
        console.log('3. If paused, restore it');
        console.log('4. If deleted, create a new project');
        console.log('5. Get fresh connection string from Settings → Database');
        console.log('');
        
        process.exit(1);
    });







