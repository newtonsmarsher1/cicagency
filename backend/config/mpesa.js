require('dotenv').config();

const MPESA_CONFIG = {
    baseUrl: process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke', // Sandbox API (use production URL in production)
    consumerKey: process.env.MPESA_CONSUMER_KEY,
    consumerSecret: process.env.MPESA_CONSUMER_SECRET,
    businessShortCode: process.env.MPESA_BUSINESS_SHORT_CODE,
    passkey: process.env.MPESA_PASSKEY,
    callbackUrl: process.env.MPESA_CALLBACK_URL || "https://cicagency.onrender.com/api/mpesa/callback",
    timeoutUrl: process.env.MPESA_TIMEOUT_URL || "https://cicagency.onrender.com/api/mpesa/timeout",
    personalPhoneNumber: process.env.PERSONAL_PHONE_NUMBER || '114710035',
    initiatorName: process.env.MPESA_INITIATOR_NAME || 'testapi',
    securityCredential: process.env.MPESA_SECURITY_CREDENTIAL || '' // Encrypted credential for B2C
};

// Demo mode disabled - using real M-Pesa API
const DEMO_MODE = false;

module.exports = {
    MPESA_CONFIG,
    DEMO_MODE
};
