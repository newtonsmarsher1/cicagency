const express = require('express');
const router = express.Router();
const { getUserNotifications, deleteNotification } = require('../controllers/notificationController');
const { verifyToken } = require('../controllers/authController');

// Get notifications for the authenticated user
router.get('/', verifyToken, getUserNotifications);

// Delete a notification
router.delete('/:notificationId', verifyToken, deleteNotification);

module.exports = router;






















