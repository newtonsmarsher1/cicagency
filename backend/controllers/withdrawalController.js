const { getAccessToken, initiateB2CPayment } = require('../utils/mpesaService');
const { validatePhoneNumber, formatPhoneNumber } = require('../utils/mpesaUtils');
const { MPESA_CONFIG, DEMO_MODE } = require('../config/mpesa');
const { pool } = require('../config/database');
const { verifyToken } = require('./authController');
const { isRestrictedDate, getKenyanDate, getCurrentKenyanHour } = require('../utils/dateRestrictions');

/**
 * Process withdrawal request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function processWithdrawal(req, res) {
    try {
        const userId = req.user.id;
        const { method, account_number, amount, bank_name } = req.body;

        // Validate input
        if (!method || !account_number || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Method, account number, and amount are required'
            });
        }

        // Check if today is a restricted date (Sunday, public holiday, or auditing day)
        const restriction = isRestrictedDate();
        if (restriction.isRestricted) {
            return res.status(403).json({
                success: false,
                error: restriction.reason,
                restricted: true
            });
        }

        // 🕒 Check withdrawal time window (7:00 AM to 5:00 PM Kenyan Time)
        const hour = getCurrentKenyanHour();

        if (hour < 7 || hour >= 17) {
            return res.status(403).json({
                success: false,
                error: 'Withdrawals are only allowed between 7:00 AM and 5:00 PM Kenyan Time'
            });
        }

        // Check if user has already made a withdrawal today
        // PostgreSQL compatible date check for Kenyan time (EAT - UTC+3)
        const today = getKenyanDate();
        const [todayWithdrawals] = await pool.execute(
            `SELECT COUNT(*) as count FROM withdrawal_requests 
             WHERE user_id = ? 
             AND (request_date AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Nairobi')::date = ?::date`,
            [userId, today]
        );

        if (todayWithdrawals[0].count > 0) {
            return res.status(400).json({
                success: false,
                error: 'You can only make one withdrawal request per day'
            });
        }

        // Minimum withdrawal is 300 KES
        const minWithdrawal = 300;
        if (amount < minWithdrawal) {
            return res.status(400).json({
                success: false,
                error: `Minimum withdrawal is KES ${minWithdrawal}`
            });
        }

        // Get user's current balance
        const [users] = await pool.execute(
            'SELECT wallet_balance, phone FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const user = users[0];
        const walletBalance = parseFloat(user.wallet_balance);

        // Check if user has sufficient balance
        if (walletBalance < amount) {
            return res.status(400).json({
                success: false,
                error: 'Insufficient balance'
            });
        }

        // For M-Pesa withdrawals, use the account_number as phone number
        let phoneNumber = account_number;

        // Validate phone number for M-Pesa
        if (method === 'mpesa' || method === 'airtel') {
            if (!validatePhoneNumber(phoneNumber)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid phone number format. Please use format: 0712345678'
                });
            }
            phoneNumber = formatPhoneNumber(phoneNumber);
        }

        // Save withdrawal request to database first
        const [withdrawalResult] = await pool.execute(`
            INSERT INTO withdrawal_requests (user_id, amount, bank_name, account_number, status, request_date)
            VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
        `, [userId, amount, bank_name || method, account_number]);

        const withdrawalId = withdrawalResult.rows && withdrawalResult.rows.length > 0 ? withdrawalResult.rows[0].id : withdrawalResult.insertId;

        // If M-Pesa or Airtel Money, process immediately via B2C API
        if (method === 'mpesa' || method === 'airtel') {
            try {
                // Deduct amount from wallet immediately
                await pool.execute(`
                    UPDATE users 
                    SET wallet_balance = wallet_balance - ?
                    WHERE id = ?
                `, [amount, userId]);

                // Update withdrawal status to processing
                await pool.execute(`
                    UPDATE withdrawal_requests 
                    SET status = 'processing'
                    WHERE id = ?
                `, [withdrawalId]);

                if (DEMO_MODE) {
                    // Demo mode - simulate successful withdrawal
                    console.log('🎭 Demo mode: Simulating M-Pesa withdrawal');

                    setTimeout(async () => {
                        await pool.execute(`
                            UPDATE withdrawal_requests 
                            SET status = 'completed', processed_date = NOW()
                            WHERE id = ?
                        `, [withdrawalId]);

                        // Save payment record
                        await pool.execute(`
                            INSERT INTO payments (user_id, amount, payment_type, status, transaction_id, phone_number, description, created_at)
                            VALUES (?, ?, 'withdrawal', 'completed', ?, ?, 'M-Pesa Withdrawal', CURRENT_TIMESTAMP)
                        `, [userId, amount, 'DEMO-' + withdrawalId, phoneNumber]);
                    }, 2000);

                    return res.json({
                        success: true,
                        message: 'Withdrawal processed successfully (Demo Mode)',
                        withdrawalId: withdrawalId,
                        transactionId: 'DEMO-' + withdrawalId
                    });
                }

                // Real M-Pesa B2C API
                const accessToken = await getAccessToken();
                const b2cResponse = await initiateB2CPayment(
                    accessToken,
                    phoneNumber,
                    amount,
                    'CIC Withdrawal'
                );

                if (b2cResponse.ResponseCode === '0') {
                    // Update withdrawal with transaction details
                    await pool.execute(`
                        UPDATE withdrawal_requests 
                        SET status = 'processing',
                            notes = ?
                        WHERE id = ?
                    `, [JSON.stringify(b2cResponse), withdrawalId]);

                    // Save payment record
                    await pool.execute(`
                        INSERT INTO payments (user_id, amount, payment_type, status, transaction_id, phone_number, description, created_at)
                        VALUES (?, ?, 'withdrawal', 'processing', ?, ?, 'M-Pesa Withdrawal', CURRENT_TIMESTAMP)
                    `, [userId, amount, b2cResponse.ConversationID || b2cResponse.OriginatorConversationID, phoneNumber]);

                    return res.json({
                        success: true,
                        message: 'Withdrawal request processed. Money will be sent to your M-Pesa account shortly.',
                        withdrawalId: withdrawalId,
                        conversationId: b2cResponse.ConversationID || b2cResponse.OriginatorConversationID
                    });
                } else {
                    // B2C failed - refund the wallet
                    await pool.execute(`
                        UPDATE users 
                        SET wallet_balance = wallet_balance + ?
                        WHERE id = ?
                    `, [amount, userId]);

                    await pool.execute(`
                        UPDATE withdrawal_requests 
                        SET status = 'rejected',
                            notes = ?
                        WHERE id = ?
                    `, [b2cResponse.ResponseDescription || 'M-Pesa API error', withdrawalId]);

                    return res.status(400).json({
                        success: false,
                        error: b2cResponse.ResponseDescription || 'Failed to process withdrawal via M-Pesa'
                    });
                }
            } catch (error) {
                console.error('❌ M-Pesa withdrawal error:', error);

                // Refund the wallet on error
                await pool.execute(`
                    UPDATE users 
                    SET wallet_balance = wallet_balance + ?
                    WHERE id = ?
                `, [amount, userId]);

                await pool.execute(`
                    UPDATE withdrawal_requests 
                    SET status = 'rejected',
                        notes = ?
                    WHERE id = ?
                `, [error.message || 'M-Pesa API error', withdrawalId]);

                return res.status(500).json({
                    success: false,
                    error: 'Failed to process withdrawal. Please try again later.'
                });
            }
        } else {
            // Bank transfer - manual processing
            return res.json({
                success: true,
                message: 'Withdrawal request submitted. Processing time: 24-48 hours.',
                withdrawalId: withdrawalId
            });
        }

    } catch (error) {
        console.error('❌ Withdrawal error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

/**
 * Get user's withdrawal history
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getWithdrawals(req, res) {
    try {
        const userId = req.user.id;

        const [withdrawals] = await pool.execute(`
            SELECT id, amount, bank_name, account_number, status, request_date, processed_date, notes
            FROM withdrawal_requests
            WHERE user_id = ?
            ORDER BY request_date DESC
            LIMIT 50
        `, [userId]);

        // Format the withdrawals for frontend
        const formattedWithdrawals = withdrawals.map(w => ({
            id: w.id,
            amount: parseFloat(w.amount),
            method: w.bank_name,
            account_number: w.account_number,
            status: w.status,
            created_at: w.request_date,
            request_date: w.request_date,
            processed_date: w.processed_date,
            notes: w.notes
        }));

        return res.json({
            success: true,
            withdrawals: formattedWithdrawals
        });
    } catch (error) {
        console.error('❌ Get withdrawals error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

module.exports = {
    processWithdrawal,
    getWithdrawals
};

