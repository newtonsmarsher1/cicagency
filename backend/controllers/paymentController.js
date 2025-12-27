const { getAccessToken, initiateSTKPush, querySTKPush } = require('../utils/mpesaService');
const { generateSessionId, validatePhoneNumber, formatPhoneNumber } = require('../utils/mpesaUtils');
const { MPESA_CONFIG, DEMO_MODE } = require('../config/mpesa');
const { pool } = require('../config/database');

// In-memory storage for payment sessions (use database in production)
const paymentSessions = new Map();

/**
 * Save successful payment to database
 * @param {Object} paymentData - Payment data to save
 */
async function savePaymentToDatabase(paymentData) {
    try {
        const { amount, phoneNumber, transactionId, sessionId } = paymentData;

        // Get user ID from phone number
        const [users] = await pool.execute(
            'SELECT id FROM users WHERE phone = ?',
            [phoneNumber]
        );

        if (users.length === 0) {
            console.log('⚠️ User not found for phone:', phoneNumber);
            return;
        }

        const userId = users[0].id;

        // Save payment to database
        await pool.execute(`
            INSERT INTO payments (user_id, amount, payment_type, status, transaction_id, phone_number, description, created_at)
            VALUES (?, ?, 'recharge', 'completed', ?, ?, 'M-Pesa Recharge', CURRENT_TIMESTAMP)
        `, [userId, amount, transactionId, phoneNumber]);

        // Update user's wallet - Both personal_wallet (for record) and wallet_balance (for use)
        await pool.execute(`
            UPDATE users 
            SET personal_wallet = personal_wallet + ?,
                wallet_balance = wallet_balance + ?
            WHERE id = ?
        `, [amount, amount, userId]);

        console.log(`✅ Payment saved to database: User ${userId}, Amount: KES ${amount}`);

    } catch (error) {
        console.error('❌ Error saving payment to database:', error);
    }
}

/**
 * Initiate STK Push payment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function initiatePayment(req, res) {
    try {
        const { amount, phoneNumber } = req.body;

        // Validate input
        if (!amount || !phoneNumber) {
            return res.status(400).json({
                success: false,
                message: 'Amount and phone number are required'
            });
        }

        if (amount < 1) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be at least KES 1'
            });
        }

        if (!validatePhoneNumber(phoneNumber)) {
            return res.status(400).json({
                success: false,
                message: 'Phone number must be 9 digits starting with 0, 1, or 7'
            });
        }

        const sessionId = generateSessionId();

        // Check if demo mode is enabled
        if (DEMO_MODE) {
            console.log('🎭 Demo mode: Simulating STK Push');

            // Simulate successful STK Push
            paymentSessions.set(sessionId, {
                checkoutRequestId: 'DEMO-' + sessionId,
                amount: amount,
                phoneNumber: phoneNumber,
                status: 'pending',
                timestamp: new Date().toISOString()
            });

            return res.json({
                success: true,
                message: 'STK Push sent successfully (Demo Mode)',
                sessionId: sessionId,
                checkoutRequestId: 'DEMO-' + sessionId
            });
        }

        // Real M-Pesa API
        const accessToken = await getAccessToken();
        const formattedPhone = formatPhoneNumber(phoneNumber);

        if (!formattedPhone) {
            return res.status(400).json({
                success: false,
                message: 'Invalid phone number format'
            });
        }

        const stkResponse = await initiateSTKPush(accessToken, formattedPhone, amount);

        if (stkResponse.ResponseCode === '0') {
            paymentSessions.set(sessionId, {
                checkoutRequestId: stkResponse.CheckoutRequestID,
                amount: amount,
                phoneNumber: phoneNumber,
                status: 'pending',
                timestamp: new Date().toISOString()
            });

            return res.json({
                success: true,
                message: 'STK Push sent successfully',
                sessionId: sessionId,
                checkoutRequestId: stkResponse.CheckoutRequestID
            });
        } else {
            return res.status(400).json({
                success: false,
                message: stkResponse.ResponseDescription || 'STK Push failed'
            });
        }

    } catch (error) {
        console.error('Payment initiation error:', error.response?.data || error.message);

        // Check for missing M-Pesa credentials
        if (error.message.includes('Missing M-Pesa consumer credentials')) {
            return res.status(500).json({
                success: false,
                message: 'M-Pesa API credentials not configured. Please contact administrator.'
            });
        }

        // More specific error handling
        if (error.message.includes('access token')) {
            return res.status(503).json({
                success: false,
                message: 'M-Pesa service temporarily unavailable. Please try again.'
            });
        } else if (error.message.includes('timeout')) {
            return res.status(408).json({
                success: false,
                message: 'Request timeout. Please try again.'
            });
        } else {
            const status = error.response?.status;
            const errMsg = status ? `OAuth/STK error (status ${status})` : 'Payment service error. Please try again.';
            const httpStatus = status && status >= 400 && status < 600 ? status : 500;
            return res.status(httpStatus).json({ success: false, message: errMsg });
        }
    }
}

/**
 * Check payment status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function checkPaymentStatus(req, res) {
    try {
        const { sessionId } = req.params;
        const session = paymentSessions.get(sessionId);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Payment session not found'
            });
        }

        if (session.status !== 'pending') {
            return res.json({
                success: true,
                status: session.status,
                data: session
            });
        }

        // Check if demo mode is enabled
        if (DEMO_MODE) {
            console.log('🎭 Demo mode: Simulating payment success');

            // Simulate successful payment after 5 seconds
            setTimeout(() => {
                session.status = 'success';
                session.transactionId = 'DEMO-' + Math.random().toString(36).substr(2, 9).toUpperCase();
                session.completedAt = new Date().toISOString();

                // Save successful payment to database
                savePaymentToDatabase({
                    amount: session.amount,
                    phoneNumber: session.phoneNumber,
                    transactionId: session.transactionId,
                    sessionId: sessionId
                });

                paymentSessions.set(sessionId, session);
            }, 5000);

            return res.json({
                success: true,
                status: 'pending',
                data: {
                    ...session,
                    message: 'Demo mode: Payment processing...'
                }
            });
        }

        // Real M-Pesa API - Status checking
        try {
            const accessToken = await getAccessToken();
            const queryResponse = await querySTKPush(accessToken, session.checkoutRequestId);

            console.log('🔍 Payment status query response:', queryResponse);

            if (queryResponse.ResultCode === '0') {
                session.status = 'success';
                session.transactionId = queryResponse.MpesaReceiptNumber;
                session.completedAt = new Date().toISOString();

                // Save successful payment to database
                await savePaymentToDatabase({
                    amount: session.amount,
                    phoneNumber: session.phoneNumber,
                    transactionId: session.transactionId,
                    sessionId: sessionId
                });

                paymentSessions.set(sessionId, session);

                console.log(`✅ Payment successful: ${session.transactionId}`);

                return res.json({
                    success: true,
                    status: 'success',
                    data: session
                });
            } else if (queryResponse.ResultCode === '1032') {
                session.status = 'cancelled';
                session.completedAt = new Date().toISOString();

                paymentSessions.set(sessionId, session);

                return res.json({
                    success: true,
                    status: 'cancelled',
                    data: session
                });
            } else {
                // Still pending or other status
                return res.json({
                    success: true,
                    status: 'pending',
                    data: {
                        ...session,
                        message: `Status: ${queryResponse.ResultDesc || 'Processing...'}`
                    }
                });
            }
        } catch (queryError) {
            console.error('❌ Payment status query error:', queryError.message);

            // If query fails, assume still pending
            return res.json({
                success: true,
                status: 'pending',
                data: {
                    ...session,
                    message: 'Checking payment status...'
                }
            });
        }

    } catch (error) {
        console.error('Payment status check error:', error.response?.data || error.message);

        // More specific error handling for status checks
        if (error.message.includes('access token')) {
            return res.status(503).json({
                success: false,
                message: 'M-Pesa service temporarily unavailable. Please try again.'
            });
        } else if (error.message.includes('timeout')) {
            return res.status(408).json({
                success: false,
                message: 'Request timeout. Please try again.'
            });
        } else {
            return res.status(500).json({
                success: false,
                message: 'Payment status check failed. Please try again.'
            });
        }
    }
}

/**
 * Handle M-Pesa callback
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleCallback(req, res) {
    try {
        const { Body } = req.body;
        const { stkCallback } = Body;

        console.log('M-Pesa Callback received:', stkCallback);

        // Find session by CheckoutRequestID
        let sessionId = null;
        for (const [id, session] of paymentSessions.entries()) {
            if (session.checkoutRequestId === stkCallback.CheckoutRequestID) {
                sessionId = id;
                break;
            }
        }

        if (sessionId) {
            const session = paymentSessions.get(sessionId);

            if (stkCallback.ResultCode === 0) {
                session.status = 'success';
                session.transactionId = stkCallback.CallbackMetadata?.Item?.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
                session.completedAt = new Date().toISOString();

                // Save successful payment to database
                await savePaymentToDatabase({
                    amount: session.amount,
                    phoneNumber: session.phoneNumber,
                    transactionId: session.transactionId,
                    sessionId: sessionId
                });
            } else {
                session.status = 'failed';
                session.errorMessage = stkCallback.ResultDesc;
                session.completedAt = new Date().toISOString();
            }

            paymentSessions.set(sessionId, session);
        }

        return res.json({ success: true });
    } catch (error) {
        console.error('Callback error:', error);
        return res.status(500).json({ success: false });
    }
}

/**
 * Handle M-Pesa timeout
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function handleTimeout(req, res) {
    try {
        const { Body } = req.body;
        const { stkCallback } = Body;

        console.log('M-Pesa Timeout received:', stkCallback);

        // Find session by CheckoutRequestID
        let sessionId = null;
        for (const [id, session] of paymentSessions.entries()) {
            if (session.checkoutRequestId === stkCallback.CheckoutRequestID) {
                sessionId = id;
                break;
            }
        }

        if (sessionId) {
            const session = paymentSessions.get(sessionId);
            session.status = 'timeout';
            session.completedAt = new Date().toISOString();
            paymentSessions.set(sessionId, session);
        }

        return res.json({ success: true });
    } catch (error) {
        console.error('Timeout error:', error);
        return res.status(500).json({ success: false });
    }
}

module.exports = {
    initiatePayment,
    checkPaymentStatus,
    handleCallback,
    handleTimeout
};
