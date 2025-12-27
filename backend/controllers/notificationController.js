const { pool } = require('../config/database');

// Fetch user notifications from notifications table and also include payment/task notifications
async function getUserNotifications(req, res) {
    try {
        const userId = req.user.id;
        const notifications = [];

        // Get notifications from notifications table
        try {
            const [dbNotifications] = await pool.execute(
                `SELECT id, title, message, type, is_read, created_at 
                 FROM notifications 
                 WHERE user_id = ? OR user_id IS NULL
                 ORDER BY created_at DESC 
                 LIMIT 50`,
                [userId]
            );

            for (const n of dbNotifications) {
                notifications.push({
                    id: n.id,
                    type: n.type || 'info',
                    title: n.title,
                    message: n.message,
                    is_read: n.is_read,
                    created_at: n.created_at
                });
            }
        } catch (error) {
            console.log('Notifications table may not exist, skipping:', error.message);
        }

        // Recent payments as notifications
        try {
            const [payments] = await pool.execute(
                `SELECT id, amount, status, transaction_id AS receipt, created_at 
                 FROM payments 
                 WHERE user_id = ? 
                 ORDER BY created_at DESC 
                 LIMIT 20`,
                [userId]
            );

            for (const p of payments) {
                notifications.push({
                    type: 'payment',
                    title: 'Payment confirmed',
                    message: `KES ${Number(p.amount).toFixed(2)} credited to your wallet`,
                    meta: { receipt: p.receipt, status: p.status },
                    created_at: p.created_at
                });
            }
        } catch (error) {
            console.log('Error loading payment notifications:', error.message);
        }

        // Recent task completions as notifications
        try {
            const [tasks] = await pool.execute(
                `SELECT id, task_id, is_complete, reward_amount, completed_at 
                 FROM user_tasks 
                 WHERE user_id = ? AND is_complete = 1 
                 ORDER BY completed_at DESC 
                 LIMIT 20`,
                [userId]
            );

            for (const t of tasks) {
                notifications.push({
                    type: 'task',
                    title: 'Task reward received',
                    message: `Earned KES ${Number(t.reward_amount || 0).toFixed(2)} for task #${t.task_id}`,
                    meta: { taskId: t.task_id },
                    created_at: t.completed_at
                });
            }
        } catch (error) {
            console.log('Error loading task notifications:', error.message);
        }

        // Sort mixed notifications by time desc and cap to 50
        notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.json({ success: true, data: notifications.slice(0, 50) });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

// Delete a notification
async function deleteNotification(req, res) {
    try {
        const userId = req.user.id;
        const { notificationId } = req.params;

        if (!notificationId) {
            return res.status(400).json({
                success: false,
                message: 'Notification ID is required'
            });
        }

        // Delete notification from database (only if it belongs to the user)
        const [result] = await pool.execute(
            'DELETE FROM notifications WHERE id = ? AND (user_id = ? OR user_id IS NULL)',
            [notificationId, userId]
        );

        if (result.affectedRows > 0 || (result.rows && result.rows.length > 0)) {
            res.json({
                success: true,
                message: 'Notification deleted successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Notification not found or you do not have permission to delete it'
            });
        }
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

module.exports = { getUserNotifications, deleteNotification };





