const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/adminController');

// Dashboard
router.get('/dashboard/stats', getDashboardStats);

// Users
router.get('/users', getAllUsers);
router.get('/users/:id', getUserDetails);
router.put('/users/:id', updateUser);
router.put('/users/:id/details', updateUserDetails);
router.post('/users/:id/wallet/adjust', adjustUserWallet);
router.post('/users/:id/password/reset', resetUserPassword);
router.delete('/users/:id', deleteUser);

// Payments
router.get('/payments', getAllPayments);
router.post('/payments', createPayment);
router.put('/payments/:id/status', updatePaymentStatus);
router.delete('/payments/:id', deletePayment);

// Withdrawals
router.get('/withdrawals', getAllWithdrawals);
router.put('/withdrawals/:id/status', updateWithdrawalStatus);

// Tasks
router.get('/tasks', getAllTasks);

// Invitation Codes
router.get('/invitation-codes', getAllInvitationCodes);
router.post('/invitation-codes', createInvitationCode);
router.put('/invitation-codes/:id/status', updateInvitationCodeStatus);
router.delete('/invitation-codes/:id', deleteInvitationCode);

// Reports
router.get('/reports/financial', getFinancialReport);
router.get('/reports/system', getSystemStats);

module.exports = router;

