const express = require('express');
const router = express.Router();
const {
    register,
    login,
    validateInvitationCode,
    verifyToken,
    getUserProfile,
    getUserStats,
    upgradeLevel,
    savePaymentDetails,
    getPaymentDetails,
    ensureInvitationCode,
    getTeamMembers,
    requestPasswordReset,
    verifyPasswordResetCode,
    resetPassword,
    checkRestriction
} = require('../controllers/authController');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/invitation/validate', validateInvitationCode);
router.post('/forgot-password', requestPasswordReset);
router.post('/verify-reset-code', verifyPasswordResetCode);
router.post('/reset-password', resetPassword);

// Protected routes (require authentication)
router.get('/profile', verifyToken, getUserProfile);
router.get('/stats', verifyToken, getUserStats);
router.get('/team', verifyToken, getTeamMembers);
router.post('/upgrade-level', verifyToken, upgradeLevel);
router.post('/payment-details', verifyToken, savePaymentDetails);
router.get('/payment-details', verifyToken, getPaymentDetails);
router.get('/ensure-invitation-code', verifyToken, ensureInvitationCode);
router.get('/check-restriction', checkRestriction);

module.exports = router;
