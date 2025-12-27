const express = require('express');
const router = express.Router();
const {
    getRandomNumber,
    submitRequest
} = require('../controllers/manualRechargeController');
const { verifyToken } = require('../controllers/authController');

// Public/User Routes
router.get('/random-number', getRandomNumber);
router.post('/submit-request', verifyToken, submitRequest);

module.exports = router;
