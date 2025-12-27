const express = require('express');
const { recordTaskAttempt, getUserTaskStats, getUserTaskHistory, resetDailyTaskCounts, getTasks } = require('../controllers/taskController');
const { verifyToken } = require('../controllers/authController');

const router = express.Router();

// Get available tasks (protected)
router.get('/', verifyToken, getTasks);

// Record task attempt (protected)
router.post('/record-attempt', verifyToken, recordTaskAttempt);

// Get user task statistics (protected)
router.get('/stats', verifyToken, getUserTaskStats);

// Get user task history (protected)
router.get('/history', verifyToken, getUserTaskHistory);

// Reset daily task counts (protected) - called at midnight
router.post('/reset-daily', verifyToken, resetDailyTaskCounts);

module.exports = router;







