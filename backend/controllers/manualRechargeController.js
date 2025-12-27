const { pool } = require('../config/database');

/**
 * Get a random active recharge number
 */
async function getRandomNumber(req, res) {
    try {
        const [numbers] = await pool.execute(
            'SELECT phone_number, account_name FROM manual_recharge_numbers WHERE is_active = TRUE ORDER BY RANDOM() LIMIT 1'
        );

        if (numbers.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No active recharge numbers available'
            });
        }

        res.json({
            success: true,
            data: numbers[0]
        });
    } catch (error) {
        console.error('Error fetching random number:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

/**
 * Submit manual recharge request
 */
async function submitRequest(req, res) {
    try {
        const { amount, mpesa_message } = req.body;
        const userId = req.user.id;

        if (!amount || !mpesa_message) {
            return res.status(400).json({
                success: false,
                message: 'Amount and M-Pesa message are required'
            });
        }

        await pool.execute(
            'INSERT INTO manual_recharge_requests (user_id, amount, mpesa_message, status) VALUES (?, ?, ?, ?)',
            [userId, amount, mpesa_message, 'pending']
        );

        res.json({
            success: true,
            message: 'Recharge request submitted successfully. Waiting for admin approval.'
        });
    } catch (error) {
        console.error('Error submitting recharge request:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

module.exports = {
    getRandomNumber,
    submitRequest
};
