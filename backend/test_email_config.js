const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { sendEmail } = require('./utils/emailService');

async function test() {
    console.log('--- Email Configuration Test ---');
    console.log('EMAIL_PROVIDER:', process.env.EMAIL_PROVIDER || 'Not set (defaults to gmail)');
    const user = process.env.SMTP_USER || process.env.EMAIL_USER;
    const pass = process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD;

    console.log('SMTP_USER/EMAIL_USER:', user ? 'Set (***)' : 'NOT SET');
    console.log('SMTP_PASSWORD/EMAIL_PASSWORD:', pass ? 'Set (***)' : 'NOT SET');

    if (!user || !pass) {
        console.log('❌ Missing credentials. Email sending will definitely fail.');
    }

    // Try dummy send
    console.log('\n--- Attempting to send test email ---');
    try {
        const result = await sendEmail('test@example.com', 'Test Subject', 'Test Body');
        console.log('Result:', result);
    } catch (e) {
        console.error('Exception during send:', e);
    }
}

test();
