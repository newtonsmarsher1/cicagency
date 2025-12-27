const express = require('express');
const router = express.Router();
const {
    register,
    login,
    verifyToken,
    requireCEO,
    getPendingApprovals,
    approveAdmin,
    getProfile,
    updateProfile,
    getAllAdmins,
    updateAdminStatus,
    resetAdminPassword
} = require('../controllers/authController');

// Test endpoint to check database and table status
router.get('/test-db', async (req, res) => {
    try {
        const { pool } = require('../config/database');
        const connection = await pool.getConnection();

        // Check if admin_users table exists
        let tableExists = false;
        try {
            await connection.execute('SELECT 1 FROM admin_users LIMIT 1');
            tableExists = true;
        } catch (e) {
            tableExists = false;
        }

        // Count users if table exists
        let userCount = 0;
        if (tableExists) {
            const [result] = await connection.execute('SELECT COUNT(*) as count FROM admin_users');
            userCount = result[0].count;
        }

        connection.release();

        res.json({
            success: true,
            database: 'connected',
            tableExists: tableExists,
            userCount: userCount,
            message: tableExists ? 'Admin users table exists' : 'Admin users table does not exist',
            action: tableExists ? 'Table is ready' : 'Visit /api/auth/create-table to create it'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Database test failed'
        });
    }
});

// Manual table creation endpoint
router.get('/create-table', async (req, res) => {
    try {
        const { initializeAdminUsersTable } = require('../controllers/authController');
        const result = await initializeAdminUsersTable();

        if (result) {
            res.json({
                success: true,
                message: 'Admin users table created successfully! Default CEO account created.',
                credentials: {
                    username: 'ceo',
                    password: 'CEO@2024'
                }
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to create table. Check server logs for details.'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Table creation failed'
        });
    }
});

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);

// CEO only routes
router.get('/pending-approvals', verifyToken, requireCEO, getPendingApprovals);
router.post('/approve/:id', verifyToken, requireCEO, approveAdmin);
router.get('/admins', verifyToken, requireCEO, getAllAdmins);
router.put('/admins/:id/status', verifyToken, requireCEO, updateAdminStatus);
router.post('/admins/:id/reset-password', verifyToken, requireCEO, resetAdminPassword);

module.exports = router;

