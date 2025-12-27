// Quick tool to URL-encode your database password
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🔐 Password URL Encoder\n');
console.log('Enter your Supabase database password:');
console.log('(Special characters will be encoded)\n');

rl.question('Password: ', (password) => {
    const encoded = encodeURIComponent(password);
    
    console.log('\n' + '='.repeat(60));
    console.log('Original password:', password);
    console.log('URL-encoded:', encoded);
    console.log('='.repeat(60));
    
    console.log('\n📝 Use this in your connection string:');
    console.log(`postgresql://postgres:${encoded}@db.[YOUR_REF].supabase.co:5432/postgres`);
    
    console.log('\n✅ Copy the encoded password above and use it in your .env file');
    console.log('   Replace [YOUR_REF] with your actual Supabase project ref\n');
    
    rl.close();
});







