const { pool } = require('../config/database');

/**
 * Admin: Get all manual recharge requests
 */
async function adminGetRequests(req, res) {
    try {
        const [requests] = await pool.execute(`
            SELECT r.*, u.name as user_name, u.phone as user_phone 
            FROM manual_recharge_requests r
            JOIN users u ON r.user_id = u.id
            ORDER BY r.created_at DESC
        `);

        res.json({
            success: true,
            data: requests
        });
    } catch (error) {
        console.error('Error fetching admin requests:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

/**
 * Admin: Approve manual recharge request
 */
async function adminApproveRequest(req, res) {
    try {
        const { id } = req.params;
        const { admin_notes } = req.body;

        // Get request details
        const [requests] = await pool.execute(
            'SELECT * FROM manual_recharge_requests WHERE id = ?',
            [id]
        );

        if (requests.length === 0) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        const request = requests[0];
        if (request.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Request already processed' });
        }

        // Update request status
        await pool.execute(
            'UPDATE manual_recharge_requests SET status = ?, admin_notes = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?',
            ['approved', admin_notes || 'Approved by admin', id]
        );

        // Update user wallet - Both personal_wallet (for record) and wallet_balance (for use)
        await pool.execute(
            'UPDATE users SET personal_wallet = personal_wallet + ?, wallet_balance = wallet_balance + ? WHERE id = ?',
            [request.amount, request.amount, request.user_id]
        );

        // Also add to payments table for record keeping
        await pool.execute(`
            INSERT INTO payments (user_id, amount, payment_type, status, description, created_at)
            VALUES (?, ?, 'recharge', 'completed', ?, CURRENT_TIMESTAMP)
        `, [request.user_id, request.amount, `Manual Recharge Approval: ${request.mpesa_message.substring(0, 50)}...`]);

        res.json({
            success: true,
            message: 'Request approved and user wallet updated successfully'
        });
    } catch (error) {
        console.error('Error approving request:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

/**
 * Admin: Reject manual recharge request
 */
async function adminRejectRequest(req, res) {
    try {
        const { id } = req.params;
        const { admin_notes } = req.body;

        await pool.execute(
            'UPDATE manual_recharge_requests SET status = ?, admin_notes = ? WHERE id = ?',
            ['rejected', admin_notes || 'Rejected by admin', id]
        );

        res.json({
            success: true,
            message: 'Request rejected'
        });
    } catch (error) {
        console.error('Error rejecting request:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

/**
 * Admin: Manage rotating numbers
 */
async function adminGetNumbers(req, res) {
    try {
        const [numbers] = await pool.execute('SELECT * FROM manual_recharge_numbers ORDER BY created_at DESC');
        res.json({ success: true, data: numbers });
    } catch (error) {
        console.error('Error fetching numbers:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

async function adminAddNumber(req, res) {
    try {
        const { phone_number, account_name } = req.body;
        await pool.execute(
            'INSERT INTO manual_recharge_numbers (phone_number, account_name) VALUES (?, ?)',
            [phone_number, account_name || 'CIC GROUP']
        );
        res.json({ success: true, message: 'Number added successfully' });
    } catch (error) {
        console.error('Error adding number:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

async function adminDeleteNumber(req, res) {
    try {
        const { id } = req.params;
        await pool.execute('DELETE FROM manual_recharge_numbers WHERE id = ?', [id]);
        res.json({ success: true, message: 'Number deleted' });
    } catch (error) {
        console.error('Error deleting number:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

async function adminToggleNumber(req, res) {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        await pool.execute(
            'UPDATE manual_recharge_numbers SET is_active = ? WHERE id = ?',
            [is_active, id]
        );
        res.json({ success: true, message: 'Number status updated' });
    } catch (error) {
        console.error('Error toggling number status:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

module.exports = {
    adminGetRequests,
    adminApproveRequest,
    adminRejectRequest,
    adminGetNumbers,
    adminAddNumber,
    adminDeleteNumber,
    adminToggleNumber
};
