const dns = require('dns');
const { promisify } = require('util');
const lookup = promisify(dns.lookup);

const hostname = 'db.giwkajkdkyapkrxssuxv.supabase.co';

console.log('🔍 Diagnosing database connection...\n');
console.log(`Hostname: ${hostname}\n`);

// Test DNS resolution
lookup(hostname)
    .then(address => {
        console.log(`✅ DNS Resolution: SUCCESS`);
        console.log(`   IP Address: ${address}`);
        console.log(`\n✅ The hostname exists and can be resolved`);
        console.log(`\n💡 If you're still getting ENOTFOUND errors:`);
        console.log(`   1. Check your internet connection`);
        console.log(`   2. Try flushing DNS: ipconfig /flushdns`);
        console.log(`   3. Restart your computer`);
        console.log(`   4. Check if a firewall is blocking the connection`);
    })
    .catch(err => {
        console.log(`❌ DNS Resolution: FAILED`);
        console.log(`   Error: ${err.message}`);
        console.log(`\n💡 This means the hostname doesn't exist. Possible reasons:`);
        console.log(`   1. The Supabase project was deleted`);
        console.log(`   2. The project is paused (free tier projects pause after inactivity)`);
        console.log(`   3. The hostname is incorrect`);
        console.log(`\n🔧 Solutions:`);
        console.log(`   1. Go to https://supabase.com and check your project`);
        console.log(`   2. If paused, click "Restore" to reactivate it`);
        console.log(`   3. If deleted, create a new project`);
        console.log(`   4. Get a fresh connection string from Settings → Database`);
    });








