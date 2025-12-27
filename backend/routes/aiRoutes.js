const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { verifyToken } = require('../controllers/authController');

// AI Chatbot routes
router.post('/chat', verifyToken, aiController.getAIResponse);

module.exports = router;
