#!/usr/bin/env node

/**
 * Quick Email Configuration Checker
 * Run this to verify your email settings are correct
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('\n🔍 EMAIL CONFIGURATION CHECK\n');
console.log('='.repeat(50));

// Check EMAIL_PROVIDER
const provider = process.env.EMAIL_PROVIDER || 'gmail';
console.log(`\n📧 Email Provider: ${provider}`);

// Check SMTP credentials
const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
const smtpPassword = process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD;

console.log(`\n🔐 Credentials:`);
console.log(`   SMTP_USER: ${smtpUser ? '✅ Set (' + smtpUser + ')' : '❌ NOT SET'}`);
console.log(`   SMTP_PASSWORD: ${smtpPassword ? '✅ Set (***' + smtpPassword.slice(-4) + ')' : '❌ NOT SET'}`);

// Check SMTP settings
const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = process.env.SMTP_PORT || '587';
console.log(`\n⚙️  SMTP Settings:`);
console.log(`   Host: ${smtpHost}`);
console.log(`   Port: ${smtpPort}`);

// Overall status
console.log('\n' + '='.repeat(50));
if (smtpUser && smtpPassword) {
    console.log('\n✅ Email configuration looks good!');
    console.log('\n📝 Next steps:');
    console.log('   1. Test email sending: node backend/test_email_config.js');
    console.log('   2. Try forgot password from the frontend');
} else {
    console.log('\n❌ Email configuration incomplete!');
    console.log('\n📝 To fix:');
    console.log('   1. Open your .env file');
    console.log('   2. Add these variables:');
    console.log('      SMTP_USER=your-email@gmail.com');
    console.log('      SMTP_PASSWORD=your-gmail-app-password');
    console.log('\n📖 See SETUP_GUIDE.md for detailed instructions');
}

console.log('\n' + '='.repeat(50) + '\n');
