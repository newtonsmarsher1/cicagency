const crypto = require('crypto');

// Generate a secure random JWT secret
const jwtSecret = crypto.randomBytes(64).toString('hex');

console.log('\n🔐 Generated JWT Secret:');
console.log('='.repeat(80));
console.log(jwtSecret);
console.log('='.repeat(80));
console.log('\n📝 Add this to your .env file:');
console.log(`JWT_SECRET=${jwtSecret}`);
console.log('\n✅ This secret is used to sign and verify JWT tokens for user authentication.');
console.log('⚠️  Keep this secret secure and never commit it to version control!\n');

// Optionally, try to update .env file automatically
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env');

if (fs.existsSync(envPath)) {
    let content = fs.readFileSync(envPath, 'utf8');
    
    // Remove existing JWT_SECRET if it exists
    content = content.replace(/^JWT_SECRET=.*$/gm, '');
    
    // Add new JWT_SECRET
    content = content.trimEnd() + `\n\n# JWT Secret for authentication\nJWT_SECRET=${jwtSecret}\n`;
    
    fs.writeFileSync(envPath, content);
    console.log('✅ Automatically updated .env file with JWT_SECRET');
} else {
    console.log('\n💡 To create/update .env file manually, add:');
    console.log(`JWT_SECRET=${jwtSecret}`);
}








