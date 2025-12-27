const crypto = require('crypto');

/**
 * Generate M-Pesa timestamp
 * @returns {string} Formatted timestamp
 */
function generateTimestamp() {
    return new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
}

/**
 * Generate M-Pesa password
 * @param {string} businessShortCode - Business short code
 * @param {string} passkey - M-Pesa passkey
 * @param {string} [timestamp] - Optional timestamp to use; if omitted, a new one is generated
 * @returns {string} Base64 encoded password
 */
function generatePassword(businessShortCode, passkey, timestamp) {
    const ts = timestamp || generateTimestamp();
    const password = Buffer.from(`${businessShortCode}${passkey}${ts}`).toString('base64');
    return password;
}

/**
 * Generate session ID
 * @returns {string} UUID
 */
function generateSessionId() {
    return crypto.randomUUID();
}

/**
 * Validate phone number format
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} True if valid
 */
function validatePhoneNumber(phoneNumber) {
    if (!phoneNumber) return false;
    
    const cleaned = phoneNumber.replace(/[^0-9]/g, '');
    
    // Accept 9 digits (7xxx, 1xxx) or 10 digits (07xxx, 01xxx)
    if (cleaned.length === 9) {
        return cleaned.startsWith('7') || cleaned.startsWith('1');
    } else if (cleaned.length === 10) {
        return cleaned.startsWith('07') || cleaned.startsWith('01');
    } else if (cleaned.length === 12) {
        return cleaned.startsWith('2547') || cleaned.startsWith('2541');
    } else if (cleaned.length === 13) {
        return cleaned.startsWith('+2547') || cleaned.startsWith('+2541');
    }
    
    return false;
}

/**
 * Format phone number for M-Pesa API
 * @param {string} phoneNumber - Raw phone number
 * @returns {string|null} Formatted phone number or null if invalid
 */
function formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return null;
    
    let cleaned = phoneNumber.replace(/[^0-9]/g, '');
    
    if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
    } else if (cleaned.startsWith('254')) {
        cleaned = cleaned.substring(3);
    } else if (cleaned.startsWith('+254')) {
        cleaned = cleaned.substring(4);
    }
    
    if (cleaned.length === 9 && (cleaned.startsWith('7') || cleaned.startsWith('1'))) {
        return cleaned;
    }
    
    return null;
}

module.exports = {
    generateTimestamp,
    generatePassword,
    generateSessionId,
    validatePhoneNumber,
    formatPhoneNumber
};
