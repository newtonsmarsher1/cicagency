const express = require('express');
const router = express.Router();
const { verifyToken } = require('../controllers/authController');
const { initiatePayment, checkPaymentStatus, handleCallback, handleTimeout } = require('../controllers/paymentController');
const { processWithdrawal, getWithdrawals } = require('../controllers/withdrawalController');

// STK Push routes
router.post('/stk-push', initiatePayment);
router.get('/payment-status/:sessionId', checkPaymentStatus);

// M-Pesa callback routes
router.post('/callback', handleCallback);
router.post('/timeout', handleTimeout);

// Withdrawal routes (require authentication)
router.post('/withdraw', verifyToken, processWithdrawal);
router.get('/withdrawals', verifyToken, getWithdrawals);

module.exports = router;
