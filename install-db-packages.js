const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Installing database packages...\n');

try {
    console.log('Installing pg...');
    execSync('npm install pg@8.11.3 --save', { stdio: 'inherit', cwd: __dirname });
    console.log('✅ pg installed');
} catch (error) {
    console.error('❌ Failed to install pg:', error.message);
}

try {
    console.log('\nInstalling @vercel/postgres...');
    execSync('npm install @vercel/postgres@0.5.1 --save', { stdio: 'inherit', cwd: __dirname });
    console.log('✅ @vercel/postgres installed');
} catch (error) {
    console.error('❌ Failed to install @vercel/postgres:', error.message);
}

// Verify installation
console.log('\nVerifying installation...');
try {
    require.resolve('pg');
    console.log('✅ pg module found');
} catch (error) {
    console.error('❌ pg module NOT found');
}

try {
    require.resolve('@vercel/postgres');
    console.log('✅ @vercel/postgres module found');
} catch (error) {
    console.log('⚠️  @vercel/postgres module not found (this is OK for local development)');
}

console.log('\nDone!');








