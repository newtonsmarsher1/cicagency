const express = require('express');
const router = express.Router();
const {
    adminGetRequests,
    adminApproveRequest,
    adminRejectRequest,
    adminGetNumbers,
    adminAddNumber,
    adminDeleteNumber,
    adminToggleNumber
} = require('../controllers/manualRechargeController');

const { requireCEO } = require('../controllers/authController');

// Admin Routes
router.get('/requests', adminGetRequests);
router.post('/approve/:id', adminApproveRequest);
router.post('/reject/:id', adminRejectRequest);

// Number Management (CEO only)
router.get('/numbers', requireCEO, adminGetNumbers);
router.post('/numbers', requireCEO, adminAddNumber);
router.delete('/numbers/:id', requireCEO, adminDeleteNumber);
router.put('/numbers/:id/toggle', requireCEO, adminToggleNumber);

module.exports = router;
