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

// Admin Routes for Manual Recharge
router.get('/requests', adminGetRequests);
router.post('/approve/:id', adminApproveRequest);
router.post('/reject/:id', adminRejectRequest);

// Admin Routes for Managing Numbers
router.get('/numbers', adminGetNumbers);
router.post('/numbers', adminAddNumber);
router.delete('/numbers/:id', adminDeleteNumber);
router.patch('/numbers/:id/toggle', adminToggleNumber);

module.exports = router;
