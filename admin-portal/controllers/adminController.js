const { pool } = require('../config/database');

// Get dashboard statistics
async function getDashboardStats(req, res) {
    try {
        const connection = await pool.getConnection();

        // Get total users
        const [usersResult] = await connection.execute('SELECT COUNT(*) as total FROM users');
        const totalUsers = usersResult[0].total;

        // Get active users (logged in within last 30 days)
        const [activeUsersResult] = await connection.execute(
            "SELECT COUNT(*) as total FROM users WHERE last_login >= NOW() - INTERVAL '30 days'"
        );
        const activeUsers = activeUsersResult[0].total;

        // Get total payments
        const [paymentsResult] = await connection.execute(
            "SELECT COUNT(*) as total, SUM(amount) as totalAmount FROM payments WHERE status = 'success'"
        );
        const totalPayments = paymentsResult[0].total;
        const totalPaymentAmount = paymentsResult[0].totalAmount || 0;

        // Get pending payments
        const [pendingPaymentsResult] = await connection.execute(
            "SELECT COUNT(*) as total FROM payments WHERE status = 'pending'"
        );
        const pendingPayments = pendingPaymentsResult[0].total;

        // Get total withdrawals
        const [withdrawalsResult] = await connection.execute(
            "SELECT COUNT(*) as total, SUM(amount) as totalAmount FROM withdrawal_requests WHERE status = 'completed'"
        );
        const totalWithdrawals = withdrawalsResult[0].total;
        const totalWithdrawalAmount = withdrawalsResult[0].totalAmount || 0;

        // Get pending withdrawals
        const [pendingWithdrawalsResult] = await connection.execute(
            "SELECT COUNT(*) as total FROM withdrawal_requests WHERE status = 'pending'"
        );
        const pendingWithdrawals = pendingWithdrawalsResult[0].total;

        // Get total tasks completed
        const [tasksResult] = await connection.execute('SELECT COUNT(*) as total FROM user_tasks');
        const totalTasks = tasksResult[0].total;

        // Get total wallet balance
        const [walletResult] = await connection.execute('SELECT SUM(wallet_balance) as total FROM users');
        const totalWalletBalance = walletResult[0].total || 0;

        // Get total earnings
        const [earningsResult] = await connection.execute('SELECT SUM(total_earnings) as total FROM users');
        const totalEarnings = earningsResult[0].total || 0;

        // Get recent activity (last 10 activities)
        const [recentUsers] = await connection.execute(
            'SELECT id, name, phone, created_at FROM users ORDER BY created_at DESC LIMIT 10'
        );

        connection.release();

        res.json({
            success: true,
            data: {
                users: {
                    total: totalUsers,
                    active: activeUsers
                },
                payments: {
                    total: totalPayments,
                    totalAmount: parseFloat(totalPaymentAmount),
                    pending: pendingPayments
                },
                withdrawals: {
                    total: totalWithdrawals,
                    totalAmount: parseFloat(totalWithdrawalAmount),
                    pending: pendingWithdrawals
                },
                tasks: {
                    total: totalTasks
                },
                wallet: {
                    totalBalance: parseFloat(totalWalletBalance)
                },
                earnings: {
                    total: parseFloat(totalEarnings)
                },
                recentUsers: recentUsers
            }
        });
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard statistics'
        });
    }
}

// Get all users with pagination
async function getAllUsers(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';

        const connection = await pool.getConnection();

        let query = 'SELECT id, name, phone, email, wallet_balance, personal_wallet, income_wallet, total_earnings, level, is_temporary_worker, last_login, created_at FROM users';
        let countQuery = 'SELECT COUNT(*) as total FROM users';
        const params = [];

        if (search) {
            query += ' WHERE name LIKE ? OR phone LIKE ?';
            countQuery += ' WHERE name LIKE ? OR phone LIKE ?';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [users] = await connection.execute(query, params);
        const [countResult] = await connection.execute(countQuery, search ? [`%${search}%`, `%${search}%`] : []);
        const total = countResult[0].total;

        connection.release();

        res.json({
            success: true,
            data: users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users'
        });
    }
}

// Get user details
async function getUserDetails(req, res) {
    try {
        const userId = req.params.id;
        const connection = await pool.getConnection();

        const [users] = await connection.execute(
            'SELECT * FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            connection.release();
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = users[0];

        // Get user payments
        const [payments] = await connection.execute(
            'SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );

        // Get user tasks
        const [tasks] = await connection.execute(
            'SELECT * FROM user_tasks WHERE user_id = ? ORDER BY completed_at DESC',
            [userId]
        );

        // Get withdrawal requests
        const [withdrawals] = await connection.execute(
            'SELECT * FROM withdrawal_requests WHERE user_id = ? ORDER BY request_date DESC',
            [userId]
        );

        connection.release();

        res.json({
            success: true,
            data: {
                user,
                payments,
                tasks,
                withdrawals
            }
        });
    } catch (error) {
        console.error('Error getting user details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user details'
        });
    }
}

// Get all payments
async function getAllPayments(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const status = req.query.status || '';

        const connection = await pool.getConnection();

        let query = `SELECT p.*, u.name as user_name, u.phone as user_phone 
                     FROM payments p 
                     LEFT JOIN users u ON p.user_id = u.id`;
        let countQuery = 'SELECT COUNT(*) as total FROM payments';
        const params = [];
        const countParams = [];

        if (status) {
            query += ' WHERE p.status = ?';
            countQuery += ' WHERE status = ?';
            params.push(status);
            countParams.push(status);
        }

        query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [payments] = await connection.execute(query, params);
        const [countResult] = await connection.execute(countQuery, countParams);
        const total = countResult[0].total;

        connection.release();

        res.json({
            success: true,
            data: payments,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error getting payments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payments'
        });
    }
}

// Get all withdrawals
async function getAllWithdrawals(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const status = req.query.status || '';

        const connection = await pool.getConnection();

        let query = `SELECT w.*, u.name as user_name, u.phone as user_phone 
                     FROM withdrawal_requests w 
                     LEFT JOIN users u ON w.user_id = u.id`;
        let countQuery = 'SELECT COUNT(*) as total FROM withdrawal_requests';
        const params = [];
        const countParams = [];

        if (status) {
            query += ' WHERE w.status = ?';
            countQuery += ' WHERE status = ?';
            params.push(status);
            countParams.push(status);
        }

        query += ' ORDER BY w.request_date DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [withdrawals] = await connection.execute(query, params);
        const [countResult] = await connection.execute(countQuery, countParams);
        const total = countResult[0].total;

        connection.release();

        res.json({
            success: true,
            data: withdrawals,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error getting withdrawals:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch withdrawals'
        });
    }
}

// Update withdrawal status
async function updateWithdrawalStatus(req, res) {
    const connection = await pool.getConnection();

    try {
        const { id } = req.params;
        let { status, notes } = req.body;

        // Map 'approved' to 'completed' and 'rejected' to 'failed' for database
        // But allow both old and new statuses for backward compatibility
        const statusMap = {
            'approved': 'completed',
            'rejected': 'failed'
        };
        const dbStatus = statusMap[status] || status;

        if (!['pending', 'approved', 'rejected', 'completed', 'failed'].includes(status)) {
            connection.release();
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        // Get current withdrawal details
        const [withdrawals] = await connection.execute(
            'SELECT * FROM withdrawal_requests WHERE id = ?',
            [id]
        );

        if (withdrawals.length === 0) {
            connection.release();
            return res.status(404).json({
                success: false,
                message: 'Withdrawal not found'
            });
        }

        const withdrawal = withdrawals[0];
        const oldStatus = withdrawal.status;
        const amount = parseFloat(withdrawal.amount);
        const userId = withdrawal.user_id;
        const paymentMethod = (withdrawal.payment_method || withdrawal.bank_name || '').toLowerCase();

        // If status is changing to 'failed' (or 'rejected'), reverse the amount to user's wallet
        // Only reverse if the withdrawal hasn't been completed (money not yet sent)
        if ((dbStatus === 'failed' || status === 'rejected' || status === 'failed') && oldStatus !== 'failed' && oldStatus !== 'rejected') {
            // Check if amount was deducted:
            // - M-Pesa/Airtel: deducted immediately when request is created
            // - Bank transfers: deducted when approved, so if oldStatus is 'pending', it wasn't deducted yet
            const isMPesaOrAirtel = paymentMethod.includes('mpesa') || paymentMethod.includes('airtel');

            // Reverse if:
            // 1. It's M-Pesa/Airtel (always deducted on creation)
            // 2. Old status was 'completed' or 'approved' (amount was deducted when approved)
            // Don't reverse if oldStatus is 'pending' for bank transfers (not deducted yet)
            if (isMPesaOrAirtel || oldStatus === 'completed' || oldStatus === 'approved') {
                // Reverse the amount to user's wallet
                await connection.execute(
                    'UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?',
                    [amount, userId]
                );
                console.log(`✅ Reversed ${amount} KES to user ${userId} wallet for rejected/failed withdrawal ${id}`);
            }
        }

        // If status is changing to 'completed' (or 'approved') from 'pending' for bank transfer, deduct the amount
        if ((dbStatus === 'completed' || status === 'approved' || status === 'completed') && oldStatus === 'pending') {
            const isBankTransfer = paymentMethod && !paymentMethod.includes('mpesa') && !paymentMethod.includes('airtel');

            if (isBankTransfer) {
                // Deduct the amount from user's wallet
                await connection.execute(
                    'UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?',
                    [amount, userId]
                );
                console.log(`✅ Deducted ${amount} KES from user ${userId} wallet for approved bank withdrawal ${id}`);
            }
        }

        // Update withdrawal status (use 'failed' instead of 'rejected', 'completed' instead of 'approved')
        await connection.execute(
            'UPDATE withdrawal_requests SET status = ?, notes = ?, processed_date = CURRENT_TIMESTAMP WHERE id = ?',
            [dbStatus, notes || null, id]
        );

        connection.release();

        res.json({
            success: true,
            message: 'Withdrawal status updated successfully'
        });
    } catch (error) {
        connection.release();
        console.error('Error updating withdrawal status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update withdrawal status'
        });
    }
}

// Get all tasks
async function getAllTasks(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const connection = await pool.getConnection();

        const [tasks] = await connection.execute(
            `SELECT t.*, u.name as user_name, u.phone as user_phone 
             FROM user_tasks t 
             LEFT JOIN users u ON t.user_id = u.id 
             ORDER BY t.completed_at DESC 
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM user_tasks');
        const total = countResult[0].total;

        connection.release();

        res.json({
            success: true,
            data: tasks,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error getting tasks:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tasks'
        });
    }
}

// Update user (admin can update user details)
async function updateUser(req, res) {
    try {
        const { id } = req.params;
        const { wallet_balance, total_earnings, level, is_temporary_worker } = req.body;

        const connection = await pool.getConnection();

        const updates = [];
        const values = [];

        if (wallet_balance !== undefined) {
            updates.push('wallet_balance = ?');
            values.push(wallet_balance);
        }
        if (total_earnings !== undefined) {
            updates.push('total_earnings = ?');
            values.push(total_earnings);
        }
        if (level !== undefined) {
            updates.push('level = ?');
            values.push(level);
        }
        if (is_temporary_worker !== undefined) {
            updates.push('is_temporary_worker = ?');
            values.push(is_temporary_worker);
        }

        if (updates.length === 0) {
            connection.release();
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        values.push(id);

        await connection.execute(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        connection.release();

        res.json({
            success: true,
            message: 'User updated successfully'
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user'
        });
    }
}

// Update user details (name, email, phone)
async function updateUserDetails(req, res) {
    try {
        const { id } = req.params;
        const { name, email, phone } = req.body;

        const connection = await pool.getConnection();

        const updates = [];
        const values = [];

        if (name !== undefined) {
            updates.push('name = ?');
            values.push(name);
        }
        if (email !== undefined) {
            updates.push('email = ?');
            values.push(email);
        }
        if (phone !== undefined) {
            // Check if phone already exists
            const [existing] = await connection.execute(
                'SELECT id FROM users WHERE phone = ? AND id != ?',
                [phone, id]
            );
            if (existing.length > 0) {
                connection.release();
                return res.status(400).json({
                    success: false,
                    message: 'Phone number already exists'
                });
            }
            updates.push('phone = ?');
            values.push(phone);
        }

        if (updates.length === 0) {
            connection.release();
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        values.push(id);
        await connection.execute(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        connection.release();

        res.json({
            success: true,
            message: 'User details updated successfully'
        });
    } catch (error) {
        console.error('Error updating user details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user details'
        });
    }
}

// Adjust user wallet balance (add or subtract)
async function adjustUserWallet(req, res) {
    try {
        const { id } = req.params;
        const { amount, type, description } = req.body; // type: 'add' or 'subtract'

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid amount'
            });
        }

        if (!['add', 'subtract'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Type must be "add" or "subtract"'
            });
        }

        const connection = await pool.getConnection();

        // Get current balance
        const [users] = await connection.execute(
            'SELECT wallet_balance FROM users WHERE id = ?',
            [id]
        );

        if (users.length === 0) {
            connection.release();
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const currentBalance = parseFloat(users[0].wallet_balance);
        const adjustment = type === 'add' ? amount : -amount;
        const newBalance = currentBalance + adjustment;

        if (newBalance < 0) {
            connection.release();
            return res.status(400).json({
                success: false,
                message: 'Insufficient balance'
            });
        }

        // Update wallet balance
        await connection.execute(
            'UPDATE users SET wallet_balance = ? WHERE id = ?',
            [newBalance, id]
        );

        // Create payment record
        await connection.execute(
            `INSERT INTO payments (user_id, amount, payment_type, status, description, created_at) 
             VALUES (?, ?, 'bonus', 'success', ?, NOW())`,
            [id, Math.abs(adjustment), description || `Admin ${type}: ${amount}`]
        );

        connection.release();

        res.json({
            success: true,
            message: `Wallet ${type === 'add' ? 'credited' : 'debited'} successfully`,
            data: {
                previousBalance: currentBalance,
                adjustment: adjustment,
                newBalance: newBalance
            }
        });
    } catch (error) {
        console.error('Error adjusting wallet:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to adjust wallet balance'
        });
    }
}

// Reset user password
async function resetUserPassword(req, res) {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const connection = await pool.getConnection();
        await connection.execute(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, id]
        );
        connection.release();

        res.json({
            success: true,
            message: 'Password reset successfully'
        });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password'
        });
    }
}

// Delete user
async function deleteUser(req, res) {
    try {
        const { id } = req.params;
        const connection = await pool.getConnection();

        // Check if user exists
        const [users] = await connection.execute('SELECT id FROM users WHERE id = ?', [id]);
        if (users.length === 0) {
            connection.release();
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Delete user (cascade will handle related records)
        await connection.execute('DELETE FROM users WHERE id = ?', [id]);
        connection.release();

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user'
        });
    }
}

// Create manual payment
async function createPayment(req, res) {
    try {
        const { user_id, amount, payment_type, description, phone_number } = req.body;

        if (!user_id || !amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment data'
            });
        }

        const connection = await pool.getConnection();

        // Verify user exists
        const [users] = await connection.execute('SELECT id, wallet_balance FROM users WHERE id = ?', [user_id]);
        if (users.length === 0) {
            connection.release();
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Create payment record
        const [result] = await connection.execute(
            `INSERT INTO payments (user_id, amount, payment_type, status, phone_number, description, created_at) 
             VALUES (?, ?, ?, 'success', ?, ?, NOW())`,
            [user_id, amount, payment_type || 'recharge', phone_number || null, description || 'Manual payment by admin']
        );

        // Update user wallet if it's a recharge
        if (payment_type === 'recharge' || !payment_type) {
            const newBalance = parseFloat(users[0].wallet_balance) + parseFloat(amount);
            await connection.execute(
                'UPDATE users SET wallet_balance = ? WHERE id = ?',
                [newBalance, user_id]
            );
        }

        connection.release();

        res.json({
            success: true,
            message: 'Payment created successfully',
            data: { paymentId: result.insertId }
        });
    } catch (error) {
        console.error('Error creating payment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create payment'
        });
    }
}

// Update payment status
async function updatePaymentStatus(req, res) {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['pending', 'success', 'failed'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const connection = await pool.getConnection();

        // Get payment details
        const [payments] = await connection.execute(
            'SELECT * FROM payments WHERE id = ?',
            [id]
        );

        if (payments.length === 0) {
            connection.release();
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        const payment = payments[0];

        // Update status
        await connection.execute(
            'UPDATE payments SET status = ?, completed_at = NOW() WHERE id = ?',
            [status, id]
        );

        // If status changed to success and it's a recharge, update wallet
        if (status === 'success' && payment.status !== 'success' && payment.payment_type === 'recharge') {
            const [users] = await connection.execute('SELECT wallet_balance FROM users WHERE id = ?', [payment.user_id]);
            if (users.length > 0) {
                const newBalance = parseFloat(users[0].wallet_balance) + parseFloat(payment.amount);
                await connection.execute(
                    'UPDATE users SET wallet_balance = ? WHERE id = ?',
                    [newBalance, payment.user_id]
                );
            }
        }

        connection.release();

        res.json({
            success: true,
            message: 'Payment status updated successfully'
        });
    } catch (error) {
        console.error('Error updating payment status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update payment status'
        });
    }
}

// Delete payment
async function deletePayment(req, res) {
    try {
        const { id } = req.params;
        const connection = await pool.getConnection();

        await connection.execute('DELETE FROM payments WHERE id = ?', [id]);
        connection.release();

        res.json({
            success: true,
            message: 'Payment deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting payment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete payment'
        });
    }
}

// Get all invitation codes
async function getAllInvitationCodes(req, res) {
    try {
        const connection = await pool.getConnection();

        const [codes] = await connection.execute(
            `SELECT ic.*, 
                    creator.name as creator_name,
                    user.name as used_by_name
             FROM invitation_codes ic
             LEFT JOIN users creator ON ic.created_by = creator.id
             LEFT JOIN users user ON ic.used_by = user.id
             ORDER BY ic.created_at DESC`
        );

        connection.release();

        res.json({
            success: true,
            data: codes
        });
    } catch (error) {
        console.error('Error getting invitation codes:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch invitation codes'
        });
    }
}

// Create invitation code
async function createInvitationCode(req, res) {
    try {
        const { code, created_by } = req.body;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'Code is required'
            });
        }

        const connection = await pool.getConnection();

        // Check if code already exists
        const [existing] = await connection.execute(
            'SELECT id FROM invitation_codes WHERE code = ?',
            [code]
        );

        if (existing.length > 0) {
            connection.release();
            return res.status(400).json({
                success: false,
                message: 'Invitation code already exists'
            });
        }

        await connection.execute(
            'INSERT INTO invitation_codes (code, created_by, is_active, created_at) VALUES (?, ?, TRUE, NOW())',
            [code, created_by || null]
        );

        connection.release();

        res.json({
            success: true,
            message: 'Invitation code created successfully'
        });
    } catch (error) {
        console.error('Error creating invitation code:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create invitation code'
        });
    }
}

// Update invitation code status
async function updateInvitationCodeStatus(req, res) {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        const connection = await pool.getConnection();
        await connection.execute(
            'UPDATE invitation_codes SET is_active = ? WHERE id = ?',
            [is_active, id]
        );
        connection.release();

        res.json({
            success: true,
            message: 'Invitation code status updated successfully'
        });
    } catch (error) {
        console.error('Error updating invitation code:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update invitation code'
        });
    }
}

// Delete invitation code
async function deleteInvitationCode(req, res) {
    try {
        const { id } = req.params;
        const connection = await pool.getConnection();
        await connection.execute('DELETE FROM invitation_codes WHERE id = ?', [id]);
        connection.release();

        res.json({
            success: true,
            message: 'Invitation code deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting invitation code:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete invitation code'
        });
    }
}

// Get financial report
async function getFinancialReport(req, res) {
    try {
        const connection = await pool.getConnection();

        // Total revenue (successful payments)
        const [revenue] = await connection.execute(
            "SELECT SUM(amount) as total FROM payments WHERE status = 'success'"
        );

        // Total withdrawals
        const [withdrawals] = await connection.execute(
            "SELECT SUM(amount) as total FROM withdrawal_requests WHERE status = 'completed'"
        );

        // Total wallet balance
        const [wallet] = await connection.execute(
            'SELECT SUM(wallet_balance) as total FROM users'
        );

        // Total earnings
        const [earnings] = await connection.execute(
            'SELECT SUM(total_earnings) as total FROM users'
        );

        // Payments by type
        const [paymentsByType] = await connection.execute(
            `SELECT payment_type, COUNT(*) as count, SUM(amount) as total 
             FROM payments WHERE status = 'success' 
             GROUP BY payment_type`
        );

        // Monthly statistics
        const [monthlyStats] = await connection.execute(
            `SELECT 
                TO_CHAR(created_at, 'YYYY-MM') as month,
                COUNT(*) as count,
                SUM(amount) as total
             FROM payments 
             WHERE status = 'success'
             GROUP BY TO_CHAR(created_at, 'YYYY-MM')
             ORDER BY month DESC
             LIMIT 12`
        );

        connection.release();

        const totalRevenue = parseFloat(revenue[0].total || 0);
        const totalWithdrawals = parseFloat(withdrawals[0].total || 0);
        const netProfit = totalRevenue - totalWithdrawals;

        res.json({
            success: true,
            data: {
                revenue: totalRevenue,
                withdrawals: totalWithdrawals,
                netProfit: netProfit,
                totalWalletBalance: parseFloat(wallet[0].total || 0),
                totalEarnings: parseFloat(earnings[0].total || 0),
                paymentsByType: paymentsByType,
                monthlyStats: monthlyStats
            }
        });
    } catch (error) {
        console.error('Error getting financial report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch financial report'
        });
    }
}

// Get system statistics
async function getSystemStats(req, res) {
    try {
        const connection = await pool.getConnection();

        // Table sizes (PostgreSQL version)
        const [tableStats] = await connection.execute(`
            SELECT 
                relname as table_name,
                n_live_tup as table_rows,
                ROUND((pg_total_relation_size(relid) / 1024 / 1024), 2) AS size_mb
            FROM pg_stat_user_tables
            ORDER BY n_live_tup DESC
        `);

        // Recent activity
        const [recentPayments] = await connection.execute(
            "SELECT COUNT(*) as count FROM payments WHERE created_at >= NOW() - INTERVAL '24 hours'"
        );

        const [recentUsers] = await connection.execute(
            "SELECT COUNT(*) as count FROM users WHERE created_at >= NOW() - INTERVAL '24 hours'"
        );

        const [recentTasks] = await connection.execute(
            "SELECT COUNT(*) as count FROM user_tasks WHERE completed_at >= NOW() - INTERVAL '24 hours'"
        );

        connection.release();

        res.json({
            success: true,
            data: {
                tableStats: tableStats,
                recentActivity: {
                    payments: recentPayments[0].count,
                    users: recentUsers[0].count,
                    tasks: recentTasks[0].count
                }
            }
        });
    } catch (error) {
        console.error('Error getting system stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch system statistics'
        });
    }
}

module.exports = {
    getDashboardStats,
    getAllUsers,
    getUserDetails,
    getAllPayments,
    getAllWithdrawals,
    updateWithdrawalStatus,
    getAllTasks,
    updateUser,
    updateUserDetails,
    adjustUserWallet,
    resetUserPassword,
    deleteUser,
    createPayment,
    updatePaymentStatus,
    deletePayment,
    getAllInvitationCodes,
    createInvitationCode,
    updateInvitationCodeStatus,
    deleteInvitationCode,
    getFinancialReport,
    getSystemStats
};

