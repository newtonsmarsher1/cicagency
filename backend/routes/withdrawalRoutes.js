const express = require('express');
const router = express.Router();
const { processWithdrawal, getWithdrawals } = require('../controllers/withdrawalController');
const { verifyToken } = require('../controllers/authController');

// All routes are protected
router.use(verifyToken);

// Process new withdrawal request
router.post('/request', processWithdrawal);

// Get withdrawal history
router.get('/history', getWithdrawals);

module.exports = router;
