const express = require('express');
const router = express.Router();
const { verifyToken } = require('../controllers/authController');
const { getInvestments, createInvestment } = require('../controllers/investmentController');

// All investment routes require authentication
router.get('/', verifyToken, getInvestments);
router.post('/create', verifyToken, createInvestment);

module.exports = router;



