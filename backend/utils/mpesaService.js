const axios = require('axios');
const { MPESA_CONFIG } = require('../config/mpesa');
const { generateTimestamp, generatePassword } = require('./mpesaUtils');

/**
 * Get M-Pesa access token
 * @param {number} retryCount - Current retry count
 * @returns {Promise<string>} Access token
 */
async function getAccessToken(retryCount = 0) {
    try {
        if (!MPESA_CONFIG.consumerKey || !MPESA_CONFIG.consumerSecret) {
            console.error('❌ Missing M-Pesa consumer credentials in environment variables');
            throw new Error('Missing M-Pesa consumer credentials');
        }
        const auth = Buffer.from(`${MPESA_CONFIG.consumerKey}:${MPESA_CONFIG.consumerSecret}`).toString('base64');
        
        const response = await axios.get(`${MPESA_CONFIG.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            timeout: 10000, // Reduced from 30000 to 10000 (10 seconds)
            maxRedirects: 5,
            validateStatus: function (status) {
                return status >= 200 && status < 300;
            }
        });
        
        console.log('✅ Access token obtained successfully');
        return response.data.access_token;
    } catch (error) {
        const status = error.response?.status;
        const contentType = error.response?.headers?.['content-type'];
        let bodySnippet = '';
        if (typeof error.response?.data === 'string') {
            bodySnippet = error.response.data.substring(0, 200);
        } else if (error.response?.data) {
            try { bodySnippet = JSON.stringify(error.response.data).substring(0, 200); } catch (_) {}
        }
        console.error(`❌ Error getting access token (attempt ${retryCount + 1}) [status=${status}, type=${contentType}]:`, bodySnippet || error.message);
        
        if (retryCount < 3) { // Reduced from 5 to 3 retries
            const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Reduced max delay from 30000 to 5000
            console.log(`🔄 Retrying in ${delay/1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return getAccessToken(retryCount + 1);
        }
        
        const errorMessage = status ? `OAuth failed with status ${status}` : 'OAuth failed without response';
        throw new Error(`${errorMessage}`);
    }
}

/**
 * Initiate STK Push
 * @param {string} accessToken - M-Pesa access token
 * @param {string} phoneNumber - Customer phone number
 * @param {number} amount - Payment amount
 * @returns {Promise<Object>} STK Push response
 */
async function initiateSTKPush(accessToken, phoneNumber, amount) {
    const timestamp = generateTimestamp();
    const password = generatePassword(MPESA_CONFIG.businessShortCode, MPESA_CONFIG.passkey, timestamp);
    
    const payload = {
        BusinessShortCode: MPESA_CONFIG.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: parseInt(amount),
        PartyA: `254${phoneNumber}`,
        PartyB: MPESA_CONFIG.businessShortCode,
        PhoneNumber: `254${phoneNumber}`,
        CallBackURL: MPESA_CONFIG.callbackUrl,
        TimeoutURL: MPESA_CONFIG.timeoutUrl,
        AccountReference: `Personal-${MPESA_CONFIG.personalPhoneNumber}`,
        TransactionDesc: "Personal Payment"
    };
    
    let retryCount = 0;
    const maxRetries = 3; // Reduced from 5 to 3
    
    while (retryCount < maxRetries) {
        try {
            const response = await axios.post(`${MPESA_CONFIG.baseUrl}/mpesa/stkpush/v1/processrequest`, payload, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Origin': 'https://developer.safaricom.co.ke',
                    'Referer': 'https://developer.safaricom.co.ke/',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'cross-site'
                },
                timeout: 10000, // Reduced from 30000 to 10000 (10 seconds)
                maxRedirects: 5,
                validateStatus: function (status) {
                    return status >= 200 && status < 300;
                }
            });
            
            console.log('✅ STK Push sent successfully');
            return response.data;
        } catch (error) {
            retryCount++;
            console.error(`❌ STK Push attempt ${retryCount} failed:`, error.response?.data || error.message);
            
            if (retryCount >= maxRetries) {
                throw error;
            }
            
            const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Reduced max delay from 30000 to 5000
            console.log(`🔄 Retrying STK Push in ${delay/1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

/**
 * Query STK Push status
 * @param {string} accessToken - M-Pesa access token
 * @param {string} checkoutRequestId - Checkout request ID
 * @returns {Promise<Object>} Query response
 */
async function querySTKPush(accessToken, checkoutRequestId) {
    const timestamp = generateTimestamp();
    const password = generatePassword(MPESA_CONFIG.businessShortCode, MPESA_CONFIG.passkey, timestamp);
    
    const payload = {
        BusinessShortCode: MPESA_CONFIG.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
    };
    
    const response = await axios.post(`${MPESA_CONFIG.baseUrl}/mpesa/stkpushquery/v1/query`, payload, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });
    
    return response.data;
}

/**
 * Initiate B2C (Business to Customer) Payment - Send money to customer
 * @param {string} accessToken - M-Pesa access token
 * @param {string} phoneNumber - Customer phone number (without country code)
 * @param {number} amount - Amount to send
 * @param {string} remarks - Transaction remarks
 * @returns {Promise<Object>} B2C response
 */
async function initiateB2CPayment(accessToken, phoneNumber, amount, remarks = 'Withdrawal') {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    
    // Format phone number (ensure it starts with 254)
    let formattedPhone = phoneNumber.replace(/^0/, ''); // Remove leading 0
    if (!formattedPhone.startsWith('254')) {
        formattedPhone = `254${formattedPhone}`;
    }
    
    const payload = {
        InitiatorName: MPESA_CONFIG.initiatorName || 'testapi',
        SecurityCredential: MPESA_CONFIG.securityCredential || '', // This should be encrypted
        CommandID: 'BusinessPayment',
        Amount: parseInt(amount),
        PartyA: MPESA_CONFIG.businessShortCode,
        PartyB: formattedPhone,
        Remarks: remarks,
        QueueTimeOutURL: process.env.MPESA_B2C_QUEUE_TIMEOUT_URL || MPESA_CONFIG.callbackUrl,
        ResultURL: process.env.MPESA_B2C_RESULT_URL || MPESA_CONFIG.callbackUrl,
        Occasion: 'Withdrawal'
    };
    
    try {
        const response = await axios.post(`${MPESA_CONFIG.baseUrl}/mpesa/b2c/v1/paymentrequest`, payload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
        
        console.log('✅ B2C Payment initiated successfully');
        return response.data;
    } catch (error) {
        console.error('❌ B2C Payment failed:', error.response?.data || error.message);
        throw error;
    }
}

module.exports = {
    getAccessToken,
    initiateSTKPush,
    querySTKPush,
    initiateB2CPayment
};
