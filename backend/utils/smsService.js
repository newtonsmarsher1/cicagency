/**
 * SMS/WhatsApp Service
 * Supports multiple providers: Africa's Talking, Twilio, WhatsApp Business API
 */

const axios = require('axios');

// SMS Configuration
const SMS_CONFIG = {
    provider: process.env.SMS_PROVIDER || 'africas_talking', // 'africas_talking', 'twilio', 'whatsapp'
    
    // Africa's Talking Configuration
    africas_talking_api_key: process.env.AFRICAS_TALKING_API_KEY,
    africas_talking_username: process.env.AFRICAS_TALKING_USERNAME,
    africas_talking_sender_id: process.env.AFRICAS_TALKING_SENDER_ID || 'CIC',
    
    // Twilio Configuration
    twilio_account_sid: process.env.TWILIO_ACCOUNT_SID,
    twilio_auth_token: process.env.TWILIO_AUTH_TOKEN,
    twilio_phone_number: process.env.TWILIO_PHONE_NUMBER,
    
    // WhatsApp Business API (via Twilio or Meta)
    whatsapp_business_id: process.env.WHATSAPP_BUSINESS_ID,
    whatsapp_access_token: process.env.WHATSAPP_ACCESS_TOKEN,
    whatsapp_phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID
};

/**
 * Format phone number for SMS (ensure it's in international format)
 */
function formatPhoneNumber(phone) {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Remove leading 0 if present
    if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
    }
    
    // Add country code if not present (assuming Kenya +254)
    if (!cleaned.startsWith('254')) {
        cleaned = `254${cleaned}`;
    }
    
    return cleaned;
}

/**
 * Send SMS via Africa's Talking
 */
async function sendViaAfricasTalking(phone, message) {
    try {
        const formattedPhone = formatPhoneNumber(phone);
        
        const response = await axios.post(
            'https://api.africastalking.com/version1/messaging',
            {
                username: SMS_CONFIG.africas_talking_username,
                to: formattedPhone,
                message: message,
                from: SMS_CONFIG.africas_talking_sender_id
            },
            {
                headers: {
                    'ApiKey': SMS_CONFIG.africas_talking_api_key,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                }
            }
        );
        
        console.log('✅ SMS sent via Africa\'s Talking:', response.data);
        return { success: true, provider: 'africas_talking', data: response.data };
    } catch (error) {
        console.error('❌ Africa\'s Talking SMS error:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Send SMS via Twilio
 */
async function sendViaTwilio(phone, message) {
    try {
        const formattedPhone = `+${formatPhoneNumber(phone)}`;
        
        const response = await axios.post(
            `https://api.twilio.com/2010-04-01/Accounts/${SMS_CONFIG.twilio_account_sid}/Messages.json`,
            new URLSearchParams({
                To: formattedPhone,
                From: SMS_CONFIG.twilio_phone_number,
                Body: message
            }),
            {
                auth: {
                    username: SMS_CONFIG.twilio_account_sid,
                    password: SMS_CONFIG.twilio_auth_token
                },
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        
        console.log('✅ SMS sent via Twilio:', response.data);
        return { success: true, provider: 'twilio', data: response.data };
    } catch (error) {
        console.error('❌ Twilio SMS error:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Send WhatsApp message via WhatsApp Business API (Meta)
 */
async function sendViaWhatsApp(phone, message) {
    try {
        const formattedPhone = formatPhoneNumber(phone);
        
        const response = await axios.post(
            `https://graph.facebook.com/v18.0/${SMS_CONFIG.whatsapp_phone_number_id}/messages`,
            {
                messaging_product: 'whatsapp',
                to: formattedPhone,
                type: 'text',
                text: {
                    body: message
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${SMS_CONFIG.whatsapp_access_token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('✅ WhatsApp message sent:', response.data);
        return { success: true, provider: 'whatsapp', data: response.data };
    } catch (error) {
        console.error('❌ WhatsApp API error:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Send SMS or WhatsApp message
 * Automatically selects provider based on configuration
 */
async function sendSMS(phone, message) {
    // If no SMS provider is configured, log and return (for development)
    if (!SMS_CONFIG.provider || SMS_CONFIG.provider === 'none') {
        console.log(`📱 [SMS NOT CONFIGURED] Would send to ${phone}: ${message}`);
        return { success: false, message: 'SMS service not configured', code: null };
    }
    
    try {
        let result;
        
        switch (SMS_CONFIG.provider.toLowerCase()) {
            case 'africas_talking':
                if (!SMS_CONFIG.africas_talking_api_key || !SMS_CONFIG.africas_talking_username) {
                    throw new Error('Africa\'s Talking credentials not configured');
                }
                result = await sendViaAfricasTalking(phone, message);
                break;
                
            case 'twilio':
                if (!SMS_CONFIG.twilio_account_sid || !SMS_CONFIG.twilio_auth_token) {
                    throw new Error('Twilio credentials not configured');
                }
                result = await sendViaTwilio(phone, message);
                break;
                
            case 'whatsapp':
                if (!SMS_CONFIG.whatsapp_access_token || !SMS_CONFIG.whatsapp_phone_number_id) {
                    throw new Error('WhatsApp Business API credentials not configured');
                }
                result = await sendViaWhatsApp(phone, message);
                break;
                
            default:
                console.log(`📱 [SMS NOT CONFIGURED] Provider "${SMS_CONFIG.provider}" not supported. Would send to ${phone}: ${message}`);
                return { success: false, message: 'SMS provider not configured', code: null };
        }
        
        return result;
    } catch (error) {
        console.error('❌ Failed to send SMS/WhatsApp:', error);
        // Don't throw - allow password reset to continue even if SMS fails
        // The code will still be generated and can be retrieved via API in development
        return { 
            success: false, 
            error: error.message,
            message: 'SMS sending failed, but code was generated. Check logs for code in development mode.'
        };
    }
}

/**
 * Send password reset verification code
 */
async function sendPasswordResetCode(phone, code) {
    const message = `Your CIC password reset code is: ${code}. Valid for 10 minutes. Do not share this code with anyone.`;
    return await sendSMS(phone, message);
}

module.exports = {
    sendSMS,
    sendPasswordResetCode,
    formatPhoneNumber
};





