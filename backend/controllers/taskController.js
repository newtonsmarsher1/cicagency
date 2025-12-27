const { pool } = require('../config/database');
const { verifyToken } = require('./authController');
const { isRestrictedDate, getKenyanDate } = require('../utils/dateRestrictions');

// Record task attempt and update user earnings
const recordTaskAttempt = async (req, res) => {
    try {
        const { task_id, task_name, question, user_answer, correct_answer, is_correct, reward_amount } = req.body;
        const userId = req.user.id;

        console.log('📝 recordTaskAttempt called with:', {
            task_id, task_name, question, user_answer, correct_answer, is_correct, reward_amount, userId
        });

        // Check if temporary worker needs to upgrade (7 days expired)
        const [userCheck] = await pool.execute(
            `SELECT is_temporary_worker, temp_worker_start_date FROM users WHERE id = ?`,
            [userId]
        );

        if (userCheck[0]?.is_temporary_worker && userCheck[0]?.temp_worker_start_date) {
            const startDate = new Date(userCheck[0].temp_worker_start_date);
            const now = new Date();
            const expirationDate = new Date(startDate);
            expirationDate.setDate(expirationDate.getDate() + 7); // 7 days from start

            if (now >= expirationDate) {
                return res.status(403).json({
                    success: false,
                    requiresUpgrade: true,
                    message: 'Your temporary worker trial period has expired. Please upgrade to continue completing tasks.',
                    daysRemaining: 0
                });
            }
        }

        // Check if today is a restricted date (Sunday, public holiday, or auditing day)
        const restriction = isRestrictedDate();
        if (restriction.isRestricted) {
            return res.status(403).json({
                success: false,
                message: restriction.reason,
                restricted: true,
                holidayName: restriction.holidayName
            });
        }

        // Validate input
        if (!task_id || !task_name || !question || user_answer === undefined || correct_answer === undefined || is_correct === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Get user level to validate reward amount
            const [userLevelData] = await connection.execute(
                'SELECT level FROM users WHERE id = ?',
                [userId]
            );
            const userLevel = userLevelData[0]?.level || 0;

            // Level-based rewards (must exactly match frontend/level.html)
            const levelRewards = {
                0: 7.00, 1: 18.00, 2: 27.00, 3: 53.00, 4: 76.00,
                5: 265.00, 6: 238.00, 7: 300.00, 8: 430.00, 9: 560.00
            };
            const correctRewardAmount = levelRewards[userLevel] || 7.00;

            // Validate and override reward_amount from frontend with server-calculated value
            // This prevents reward manipulation
            const validatedRewardAmount = parseFloat(reward_amount) || 0;
            if (Math.abs(validatedRewardAmount - correctRewardAmount) > 0.01) {
                console.warn(`⚠️ Reward amount mismatch for user ${userId} (level ${userLevel}). Frontend sent: ${validatedRewardAmount}, Server expects: ${correctRewardAmount}. Using server value.`);
            }
            const finalRewardAmount = is_correct ? correctRewardAmount : 0;

            // Check if user has already completed this task today
            const today = getKenyanDate();
            // PostgreSQL compatible date check for Kenyan time (EAT - UTC+3)
            const [existingTasks] = await connection.execute(
                `SELECT id FROM user_tasks 
                 WHERE user_id = ? AND task_id = ? AND (completed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Nairobi')::date = ?::date`,
                [userId, task_id, today]
            );

            if (existingTasks.length > 0) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({
                    success: false,
                    message: 'Task already completed today'
                });
            }

            // Record the task attempt
            // Try to insert with additional fields, fallback to basic insert if columns don't exist
            let taskResult;
            try {
                // Try to insert with task details (if columns exist)
                [taskResult] = await connection.execute(
                    `INSERT INTO user_tasks (user_id, task_id, task_type, is_complete, is_correct, reward_amount, completed_at, task_name, question, user_answer, correct_answer) 
                     VALUES (?, ?, 'regular', 1, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?)`,
                    [userId, task_id, !!is_correct, finalRewardAmount, task_name || null, question || null, user_answer || null, correct_answer || null]
                );
            } catch (error) {
                // If columns don't exist, use basic insert
                // ER_BAD_FIELD_ERROR is for MySQL, 42703 is for PostgreSQL (undefined column)
                if (error.code === 'ER_BAD_FIELD_ERROR' || error.code === '42703') {
                    console.log('⚠️ Task detail columns not found, using basic insert');
                    [taskResult] = await connection.execute(
                        `INSERT INTO user_tasks (user_id, task_id, task_type, is_complete, is_correct, reward_amount, completed_at) 
                         VALUES (?, ?, 'regular', 1, ?, ?, CURRENT_TIMESTAMP)`,
                        [userId, task_id, !!is_correct, finalRewardAmount]
                    );
                } else {
                    throw error;
                }
            }

            // If task was completed correctly, update user's wallet and earnings
            if (is_correct && finalRewardAmount > 0) {
                console.log(`💰 Updating income_wallet for user ${userId} (level ${userLevel}) with reward ${finalRewardAmount}`);
                // Update user's income_wallet and total earnings
                try {
                    const [updateResult] = await connection.execute(
                        `UPDATE users 
                         SET income_wallet = income_wallet + ?, 
                             wallet_balance = wallet_balance + ?,
                             total_earnings = total_earnings + ?,
                             tasks_completed_today = tasks_completed_today + 1
                         WHERE id = ?`,
                        [finalRewardAmount, finalRewardAmount, finalRewardAmount, userId]
                    );
                    console.log(`💰 Wallet update result:`, updateResult);
                    const [verifyResult] = await connection.execute(
                        'SELECT wallet_balance, total_earnings FROM users WHERE id = ?',
                        [userId]
                    );
                    console.log(`💰 Wallet verification:`, verifyResult[0]);
                } catch (updateError) {
                    // Fallback if income_wallet or other columns are missing
                    if (updateError.code === 'ER_BAD_FIELD_ERROR' || updateError.code === '42703') {
                        console.log('⚠️ income_wallet or related columns missing, falling back to basic wallet update');
                        await connection.execute(
                            `UPDATE users 
                             SET wallet_balance = wallet_balance + ?,
                                 total_earnings = total_earnings + ?,
                                 tasks_completed_today = tasks_completed_today + 1
                             WHERE id = ?`,
                            [finalRewardAmount, finalRewardAmount, userId]
                        );
                    } else {
                        throw updateError;
                    }
                }
                console.log(`✅ Task completed successfully: User ${userId} (level ${userLevel}) earned KES ${finalRewardAmount} from task ${task_id}`);
            } else {
                // Still increment task count but no reward
                await connection.execute(
                    `UPDATE users 
                     SET tasks_completed_today = tasks_completed_today + 1
                     WHERE id = ?`,
                    [userId]
                );
                console.log(`❌ Task completed incorrectly: User ${userId} completed task ${task_id} but earned no reward`);
            }

            await connection.commit();
            connection.release();

            res.json({
                success: true,
                message: is_correct ? 'Task completed successfully!' : 'Task completed but no reward earned',
                data: {
                    task_id,
                    is_correct,
                    reward_amount: finalRewardAmount,
                    earned: is_correct,
                    user_level: userLevel
                }
            });

        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }

    } catch (error) {
        console.error('Error recording task attempt:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get user's task statistics
const getUserTaskStats = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get today's date in Kenyan time (EAT - UTC+3)
        const now = new Date();
        const kenyanTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
        const today = kenyanTime.toISOString().split('T')[0];

        // Get user's current wallet balance and tasks_completed_today (primary source - resets at midnight)
        const [userData] = await pool.execute(
            `SELECT wallet_balance, total_earnings, level, tasks_completed_today
             FROM users 
             WHERE id = ?`,
            [userId]
        );

        // Use tasks_completed_today from users table as primary source (resets to 0 at midnight)
        const completedToday = parseInt(userData[0]?.tasks_completed_today || 0);

        // Get today's earnings from completed tasks (for today's date in Kenyan time)
        const [todayEarnings] = await pool.execute(
            `SELECT SUM(CASE WHEN is_correct = TRUE THEN reward_amount ELSE 0 END) as today_earnings
                 FROM user_tasks 
                 WHERE user_id = ? AND (completed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Nairobi')::date = ?::date`,
            [userId, today]
        );

        // Get total completed tasks
        const [stats] = await pool.execute(
            `SELECT COUNT(*) as total_completed, SUM(CASE WHEN is_correct = TRUE THEN reward_amount ELSE 0 END) as total_earnings
                 FROM user_tasks 
                 WHERE user_id = ?`,
            [userId]
        );

        res.json({
            success: true,
            data: {
                completed_today: completedToday, // Use from users table (resets at midnight)
                today_earnings: todayEarnings[0]?.today_earnings || 0,
                total_completed: stats[0]?.total_completed || 0,
                total_earnings: stats[0]?.total_earnings || 0,
                wallet_balance: userData[0]?.wallet_balance || 0,
                level: userData[0]?.level || 0,
                tasks_completed_today: completedToday
            }
        });

    } catch (error) {
        console.error('Error getting user task stats:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get user's task history
const getUserTaskHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 50, offset = 0 } = req.query;

        // Try to select with task details, fallback to basic select if columns don't exist
        let tasks;
        try {
            [tasks] = await pool.execute(
                `SELECT 
                    task_id, 
                    COALESCE(task_name, CONCAT('Task ', task_id)) as task_name, 
                    COALESCE(question, 'Task completed') as question, 
                    COALESCE(user_answer, 'N/A') as user_answer, 
                    COALESCE(correct_answer, 'N/A') as correct_answer, 
                    is_complete as is_correct, 
                    reward_amount, 
                    completed_at
                 FROM user_tasks 
                 WHERE user_id = ? 
                 ORDER BY completed_at DESC 
                 LIMIT ? OFFSET ?`,
                [userId, parseInt(limit), parseInt(offset)]
            );
        } catch (error) {
            // If columns don't exist, use basic select
            if (error.code === 'ER_BAD_FIELD_ERROR') {
                console.log('⚠️ Task detail columns not found, using basic select');
                [tasks] = await pool.execute(
                    `SELECT 
                        task_id, 
                        CONCAT('Task ', task_id) as task_name, 
                        'Task completed' as question, 
                        'N/A' as user_answer, 
                        'N/A' as correct_answer, 
                        is_complete as is_correct, 
                        reward_amount, 
                        completed_at
                     FROM user_tasks 
                     WHERE user_id = ? 
                     ORDER BY completed_at DESC 
                     LIMIT ? OFFSET ?`,
                    [userId, parseInt(limit), parseInt(offset)]
                );
            } else {
                throw error;
            }
        }

        // Return in format expected by frontend
        res.json({
            success: true,
            data: tasks,
            records: tasks // Also include as 'records' for compatibility
        });

    } catch (error) {
        console.error('Error getting user task history:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Reset daily task counts (called at midnight)
const resetDailyTaskCounts = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get today's date
        const today = getKenyanDate();

        // Try to check if we've already reset today (gracefully handle missing column)
        let lastReset = null;
        try {
            const [checkReset] = await pool.execute(
                `SELECT last_daily_reset FROM users WHERE id = ?`,
                [userId]
            );

            // Use JS to get Kenyan date from last_daily_reset
            if (checkReset[0]?.last_daily_reset) {
                const lastResetDate = new Date(checkReset[0].last_daily_reset);
                lastReset = new Intl.DateTimeFormat('en-CA', {
                    timeZone: 'Africa/Nairobi',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }).format(lastResetDate);
            }
        } catch (error) {
            // Column might not exist, that's okay - we'll reset anyway
            console.log('⚠️ last_daily_reset column may not exist, proceeding with reset');
        }

        // If already reset today, don't reset again
        if (lastReset === today) {
            return res.json({
                success: true,
                message: 'Daily tasks already reset today',
                alreadyReset: true
            });
        }

        // Reset tasks_completed_today for the user
        // Try to update last_daily_reset if column exists, otherwise just reset tasks_completed_today
        try {
            await pool.execute(
                `UPDATE users 
                 SET tasks_completed_today = 0,
                     last_daily_reset = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [userId]
            );
        } catch (error) {
            // If last_daily_reset column doesn't exist, just reset tasks_completed_today
            // ER_BAD_FIELD_ERROR is for MySQL, 42703 is for PostgreSQL
            if (error.code === 'ER_BAD_FIELD_ERROR' || error.code === '42703') {
                await pool.execute(
                    `UPDATE users 
                     SET tasks_completed_today = 0
                     WHERE id = ?`,
                    [userId]
                );
                console.log('⚠️ last_daily_reset column not found, added tasks_completed_today reset only');
            } else {
                throw error;
            }
        }

        // Note: We don't delete user_tasks records as they are historical records
        // The frontend filters by date, so old tasks won't show as completed for new day
        // This preserves task history while allowing tasks to be available again the next day

        console.log(`✅ Daily task counts reset for user ${userId} at ${today}`);

        res.json({
            success: true,
            message: 'Daily task counts reset successfully',
            resetAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error resetting daily task counts:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get available tasks with questions
const getTasks = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get user info to determine reward level
        const [userData] = await pool.execute(
            `SELECT level, tasks_completed_today, is_temporary_worker, temp_worker_start_date FROM users WHERE id = ?`,
            [userId]
        );

        const userLevel = userData[0]?.level || 0;
        const tasksCompletedToday = userData[0]?.tasks_completed_today || 0;

        // Check if temporary worker needs to upgrade (7 days expired)
        if (userData[0]?.is_temporary_worker && userData[0]?.temp_worker_start_date) {
            const startDate = new Date(userData[0].temp_worker_start_date);
            const now = new Date();
            const expirationDate = new Date(startDate);
            expirationDate.setDate(expirationDate.getDate() + 7); // 7 days from start

            if (now >= expirationDate) {
                return res.status(403).json({
                    success: false,
                    requiresUpgrade: true,
                    message: 'Your temporary worker trial period has expired. Please upgrade to continue accessing tasks.',
                    daysRemaining: 0
                });
            }
        }

        // Check if today is a restricted date (Sunday, public holiday, or auditing day)
        const restriction = isRestrictedDate();
        if (restriction.isRestricted) {
            return res.status(403).json({
                success: false,
                restricted: true,
                message: restriction.reason,
                error: restriction.reason,
                holidayName: restriction.holidayName
            });
        }

        // Level-based rewards (must exactly match frontend/level.html)
        const levelRewards = {
            0: 7.00, 1: 18.00, 2: 27.00, 3: 53.00, 4: 76.00,
            5: 265.00, 6: 238.00, 7: 300.00, 8: 430.00, 9: 560.00
        };
        const levelReward = levelRewards[userLevel] || 7.00;

        // Level-based daily task limits
        const levelDailyTasks = {
            0: 5,   // Temporary Worker
            1: 5,   // Level J1
            2: 10,  // Level J2
            3: 15,  // Level J3
            4: 20,  // Level J4
            5: 20,  // Level J5
            6: 25,  // Level J6
            7: 30,  // Level J7
            8: 35,  // Level J8
            9: 40   // Level J9
        };
        const maxTasksForLevel = levelDailyTasks[userLevel] || 5;

        // Get today's date in Kenyan time (EAT - UTC+3)
        const today = getKenyanDate();

        // Get today's completed task IDs
        // PostgreSQL compatible date check for Kenyan time (EAT - UTC+3)
        const [completedTasks] = await pool.execute(
            `SELECT DISTINCT task_id FROM user_tasks 
             WHERE user_id = ? AND (completed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Nairobi')::date = ?::date`,
            [userId, today]
        );

        const completedTaskIds = completedTasks.map(t => t.task_id);

        // Sample tasks with questions (matching frontend)
        const sampleTasks = [
            {
                id: 1,
                name: "Task 1",
                icon: "https://cdn-icons-png.flaticon.com/512/3046/3046120.png",
                question: "What is the capital city of Kenya?",
                choices: ["Mombasa", "Nairobi", "Kisumu", "Nakuru"],
                correct_answer: 1,
                reward: levelReward,
                earning: levelReward,
                status: completedTaskIds.includes(1) ? 'completed' : 'ongoing',
                completedToday: completedTaskIds.includes(1)
            },
            {
                id: 2,
                name: "Task 2",
                icon: "https://cdn-icons-png.flaticon.com/512/174/174855.png",
                question: "How many continents are there in the world?",
                choices: ["5", "6", "7", "8"],
                correct_answer: 2,
                reward: levelReward,
                earning: levelReward,
                status: completedTaskIds.includes(2) ? 'completed' : 'ongoing',
                completedToday: completedTaskIds.includes(2)
            },
            {
                id: 3,
                name: "Task 3",
                icon: "https://cdn-icons-png.flaticon.com/512/1384/1384023.png",
                question: "What is the largest ocean on Earth?",
                choices: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"],
                correct_answer: 3,
                reward: levelReward,
                earning: levelReward,
                status: completedTaskIds.includes(3) ? 'completed' : 'ongoing',
                completedToday: completedTaskIds.includes(3)
            },
            {
                id: 4,
                name: "Task 4",
                icon: "https://cdn-icons-png.flaticon.com/512/174/174872.png",
                question: "How many days are in a leap year?",
                choices: ["364", "365", "366", "367"],
                correct_answer: 2,
                reward: levelReward,
                earning: levelReward,
                status: completedTaskIds.includes(4) ? 'completed' : 'ongoing',
                completedToday: completedTaskIds.includes(4)
            },
            {
                id: 5,
                name: "Task 5",
                icon: "https://cdn-icons-png.flaticon.com/512/174/174872.png",
                question: "What is 15 + 27?",
                choices: ["40", "41", "42", "43"],
                correct_answer: 2,
                reward: levelReward,
                earning: levelReward,
                status: completedTaskIds.includes(5) ? 'completed' : 'ongoing',
                completedToday: completedTaskIds.includes(5)
            },
            {
                id: 6,
                name: "Task 6",
                icon: "https://cdn-icons-png.flaticon.com/512/1384/1384023.png",
                question: "Which planet is known as the Red Planet?",
                choices: ["Venus", "Mars", "Jupiter", "Saturn"],
                correct_answer: 1,
                reward: levelReward,
                earning: levelReward,
                status: completedTaskIds.includes(6) ? 'completed' : 'ongoing',
                completedToday: completedTaskIds.includes(6)
            },
            {
                id: 7,
                name: "Task 7",
                icon: "https://cdn-icons-png.flaticon.com/512/174/174848.png",
                question: "What is the currency of Kenya?",
                choices: ["Dollar", "Shilling", "Pound", "Rand"],
                correct_answer: 1,
                reward: levelReward,
                earning: levelReward,
                status: completedTaskIds.includes(7) ? 'completed' : 'ongoing',
                completedToday: completedTaskIds.includes(7)
            },
            {
                id: 8,
                name: "Task 8",
                icon: "https://cdn-icons-png.flaticon.com/512/174/174876.png",
                question: "How many hours are in a day?",
                choices: ["12", "20", "24", "36"],
                correct_answer: 2,
                reward: levelReward,
                earning: levelReward,
                status: completedTaskIds.includes(8) ? 'completed' : 'ongoing',
                completedToday: completedTaskIds.includes(8)
            },
            {
                id: 9,
                name: "Task 9",
                icon: "https://cdn-icons-png.flaticon.com/512/174/174863.png",
                question: "What is the smallest prime number?",
                choices: ["0", "1", "2", "3"],
                correct_answer: 2,
                reward: levelReward,
                earning: levelReward,
                status: completedTaskIds.includes(9) ? 'completed' : 'ongoing',
                completedToday: completedTaskIds.includes(9)
            },
            {
                id: 10,
                name: "Task 10",
                icon: "https://cdn-icons-png.flaticon.com/512/174/174857.png",
                question: "What is 12 × 8?",
                choices: ["84", "92", "96", "100"],
                correct_answer: 2,
                reward: levelReward,
                earning: levelReward,
                status: completedTaskIds.includes(10) ? 'completed' : 'ongoing',
                completedToday: completedTaskIds.includes(10)
            },
            {
                id: 11,
                name: "Task 11",
                icon: "https://cdn-icons-png.flaticon.com/512/174/174864.png",
                question: "Which country is known as the Land of the Rising Sun?",
                choices: ["China", "Japan", "Korea", "Thailand"],
                correct_answer: 1,
                reward: levelReward,
                earning: levelReward,
                status: completedTaskIds.includes(11) ? 'completed' : 'ongoing',
                completedToday: completedTaskIds.includes(11)
            },
            {
                id: 12,
                name: "Task 12",
                icon: "https://cdn-icons-png.flaticon.com/512/174/174865.png",
                question: "How many sides does a hexagon have?",
                choices: ["4", "5", "6", "7"],
                correct_answer: 2,
                reward: levelReward,
                earning: levelReward,
                status: completedTaskIds.includes(12) ? 'completed' : 'ongoing',
                completedToday: completedTaskIds.includes(12)
            },
            {
                id: 13,
                name: "Task 13",
                icon: "https://cdn-icons-png.flaticon.com/512/174/174856.png",
                question: "What is the largest mammal in the world?",
                choices: ["Elephant", "Blue Whale", "Giraffe", "Polar Bear"],
                correct_answer: 1,
                reward: levelReward,
                earning: levelReward,
                status: completedTaskIds.includes(13) ? 'completed' : 'ongoing',
                completedToday: completedTaskIds.includes(13)
            },
            {
                id: 14,
                name: "Task 14",
                icon: "https://cdn-icons-png.flaticon.com/512/174/174861.png",
                question: "How many colors are in a rainbow?",
                choices: ["5", "6", "7", "8"],
                correct_answer: 2,
                reward: levelReward,
                earning: levelReward,
                status: completedTaskIds.includes(14) ? 'completed' : 'ongoing',
                completedToday: completedTaskIds.includes(14)
            },
            {
                id: 15,
                name: "Task 15",
                icon: "https://cdn-icons-png.flaticon.com/512/5968/5968819.png",
                question: "What is 100 ÷ 4?",
                choices: ["20", "25", "30", "35"],
                correct_answer: 1,
                reward: levelReward,
                earning: levelReward,
                status: completedTaskIds.includes(15) ? 'completed' : 'ongoing',
                completedToday: completedTaskIds.includes(15)
            },
            {
                id: 16,
                name: "Task 16",
                icon: "https://cdn-icons-png.flaticon.com/512/5968/5968926.png",
                question: "Which language is most spoken in the world?",
                choices: ["English", "Mandarin Chinese", "Spanish", "Hindi"],
                correct_answer: 1,
                reward: levelReward,
                earning: levelReward,
                status: completedTaskIds.includes(16) ? 'completed' : 'ongoing',
                completedToday: completedTaskIds.includes(16)
            },
            {
                id: 17,
                name: "Task 17",
                icon: "https://cdn-icons-png.flaticon.com/512/5968/5968350.png",
                question: "What is the square root of 64?",
                choices: ["6", "7", "8", "9"],
                correct_answer: 2,
                reward: levelReward,
                earning: levelReward,
                status: completedTaskIds.includes(17) ? 'completed' : 'ongoing',
                completedToday: completedTaskIds.includes(17)
            },
            {
                id: 18,
                name: "Task 18",
                icon: "https://cdn-icons-png.flaticon.com/512/2111/2111320.png",
                question: "How many minutes are in an hour?",
                choices: ["50", "55", "60", "65"],
                correct_answer: 2,
                reward: levelReward,
                earning: levelReward,
                status: completedTaskIds.includes(18) ? 'completed' : 'ongoing',
                completedToday: completedTaskIds.includes(18)
            },
            {
                id: 19,
                name: "Task 19",
                icon: "https://cdn-icons-png.flaticon.com/512/5968/5968827.png",
                question: "What is the freezing point of water in Celsius?",
                choices: ["-5°C", "0°C", "5°C", "10°C"],
                correct_answer: 1,
                reward: levelReward,
                earning: levelReward,
                status: completedTaskIds.includes(19) ? 'completed' : 'ongoing',
                completedToday: completedTaskIds.includes(19)
            },
            {
                id: 20,
                name: "Task 20",
                icon: "https://cdn-icons-png.flaticon.com/512/2111/2111340.png",
                question: "How many months have 31 days?",
                choices: ["5", "6", "7", "8"],
                correct_answer: 2,
                reward: levelReward,
                earning: levelReward,
                status: completedTaskIds.includes(20) ? 'completed' : 'ongoing',
                completedToday: completedTaskIds.includes(20)
            },
            {
                id: 21,
                name: "Task 21",
                icon: "https://cdn-icons-png.flaticon.com/512/174/174861.png",
                question: "What is 50% of 200?",
                choices: ["50", "75", "100", "125"],
                correct_answer: 2,
                reward: levelReward,
                earning: levelReward,
                status: completedTaskIds.includes(21) ? 'completed' : 'ongoing',
                completedToday: completedTaskIds.includes(21)
            },
            {
                id: 22,
                name: "Task 22",
                icon: "https://cdn-icons-png.flaticon.com/512/2991/2991148.png",
                question: "Which animal is known as the King of the Jungle?",
                choices: ["Tiger", "Lion", "Elephant", "Leopard"],
                correct_answer: 1,
                reward: levelReward,
                earning: levelReward,
                status: completedTaskIds.includes(22) ? 'completed' : 'ongoing',
                completedToday: completedTaskIds.includes(22)
            },
            {
                id: 23,
                name: "Task 23",
                icon: "https://cdn-icons-png.flaticon.com/512/552/552489.png",
                question: "How many legs does a spider have?",
                choices: ["4", "6", "8", "10"],
                correct_answer: 2,
                reward: levelReward,
                earning: levelReward,
                status: completedTaskIds.includes(23) ? 'completed' : 'ongoing',
                completedToday: completedTaskIds.includes(23)
            },
            {
                id: 24,
                name: "Task 24",
                icon: "https://cdn-icons-png.flaticon.com/512/5968/5968885.png",
                question: "What is the capital of France?",
                choices: ["London", "Berlin", "Paris", "Madrid"],
                correct_answer: 2,
                reward: levelReward,
                earning: levelReward,
                status: completedTaskIds.includes(24) ? 'completed' : 'ongoing',
                completedToday: completedTaskIds.includes(24)
            },
            {
                id: 25,
                name: "Task 25",
                icon: "https://cdn-icons-png.flaticon.com/512/2991/2991112.png",
                question: "How many seconds are in one minute?",
                choices: ["30", "45", "60", "90"],
                correct_answer: 2,
                reward: levelReward,
                earning: levelReward,
                status: completedTaskIds.includes(25) ? 'completed' : 'ongoing',
                completedToday: completedTaskIds.includes(25)
            }
        ];

        // Get user stats for response
        // Use tasks_completed_today from users table (resets at midnight Kenyan time)
        const [userStats] = await pool.execute(
            `SELECT wallet_balance, total_earnings, tasks_completed_today FROM users WHERE id = ?`,
            [userId]
        );

        // Get today's earnings from completed tasks
        const [result] = await pool.execute(
            `SELECT SUM(CASE WHEN is_correct = TRUE THEN reward_amount ELSE 0 END) as today_earnings
                 FROM user_tasks 
                 WHERE user_id = ? AND (completed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Nairobi')::date = ?::date`,
            [userId, today]
        );

        // Use tasks_completed_today from users table (resets to 0 at midnight)
        const completedToday = parseInt(userStats[0]?.tasks_completed_today || 0);

        // Limit tasks to user's level daily task limit
        const limitedTasks = sampleTasks.slice(0, maxTasksForLevel);

        res.json({
            success: true,
            tasks: limitedTasks,
            completedToday: completedToday, // Use from users table (resets at midnight)
            maxTasksPerDay: maxTasksForLevel,
            userLevel: userLevel,
            totalEarnings: userStats[0]?.total_earnings || 0,
            todayEarnings: todayTasks[0]?.today_earnings || 0
        });

    } catch (error) {
        console.error('Error getting tasks:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Reset daily task counts for ALL users (called by cron at midnight Kenyan time)
const resetAllUsersDailyTasks = async () => {
    try {
        console.log('🔄 Starting midnight reset for all users...');

        // Get current date in Kenyan time (EAT - UTC+3)
        const today = getKenyanDate();

        console.log(`📅 Resetting daily tasks for date: ${today} (Kenyan time)`);

        // First, count how many users need reset
        const [countResult] = await pool.execute(
            `SELECT COUNT(*) as count FROM users WHERE tasks_completed_today > 0`
        );
        const userCount = parseInt(countResult[0]?.count || countResult.count || 0);

        // Reset tasks_completed_today for all users
        // Try to update last_daily_reset if column exists, otherwise just reset tasks_completed_today
        try {
            await pool.execute(
                `UPDATE users 
                 SET tasks_completed_today = 0,
                     last_daily_reset = CURRENT_TIMESTAMP
                 WHERE tasks_completed_today > 0 OR last_daily_reset IS NULL OR (last_daily_reset AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Nairobi')::date < ?::date`,
                [today]
            );
            console.log(`✅ Reset daily task counts for ${userCount} users`);
        } catch (error) {
            // If last_daily_reset column doesn't exist (PostgreSQL error code 42703 or MySQL ER_BAD_FIELD_ERROR), just reset tasks_completed_today
            if (error.code === 'ER_BAD_FIELD_ERROR' || error.code === '42703' || error.message?.includes('column "last_daily_reset" does not exist')) {
                await pool.execute(
                    `UPDATE users 
                     SET tasks_completed_today = 0
                     WHERE tasks_completed_today > 0`,
                    []
                );
                console.log(`✅ Reset tasks_completed_today for ${userCount} users (last_daily_reset column not found)`);
            } else {
                throw error;
            }
        }

        console.log(`✅ Midnight reset completed successfully at ${new Date().toISOString()}`);
        return { success: true, resetAt: new Date().toISOString(), date: today, usersReset: userCount };

    } catch (error) {
        console.error('❌ Error resetting all users daily tasks:', error);
        throw error;
    }
};

module.exports = {
    recordTaskAttempt,
    getUserTaskStats,
    getUserTaskHistory,
    resetDailyTaskCounts,
    getTasks,
    getTaskQuestion,
    resetAllUsersDailyTasks
};

/**
 * Get single task question
 */
async function getTaskQuestion(req, res) {
    try {
        const taskId = parseInt(req.params.id);
        const userLevel = req.user.level || 0;

        // Level-based rewards
        const levelRewards = {
            0: 7.00, 1: 18.00, 2: 27.00, 3: 53.00, 4: 76.00,
            5: 265.00, 6: 238.00, 7: 300.00, 8: 430.00, 9: 560.00
        };
        const levelReward = levelRewards[userLevel] || 7.00;

        // Sample tasks (matching getTasks and frontend)
        const sampleTasks = [
            { id: 1, name: "Task 1", icon: "https://cdn-icons-png.flaticon.com/512/3046/3046120.png", question: "What is the capital city of Kenya?", choices: ["Mombasa", "Nairobi", "Kisumu", "Nakuru"], correct_answer: 1 },
            { id: 2, name: "Task 2", icon: "https://cdn-icons-png.flaticon.com/512/281/281764.png", question: "Which mountain is the highest in Africa?", choices: ["Mount Kenya", "Mount Kilimanjaro", "Mount Elgon", "Mount Stanley"], correct_answer: 1 },
            { id: 3, name: "Task 3", icon: "https://cdn-icons-png.flaticon.com/512/281/281769.png", question: "Which ocean borders Kenya to the East?", choices: ["Atlantic Ocean", "Pacific Ocean", "Indian Ocean", "Arctic Ocean"], correct_answer: 2 },
            { id: 4, name: "Task 4", icon: "https://cdn-icons-png.flaticon.com/512/300/300221.png", question: "What is the official language of Kenya?", choices: ["English", "Swahili", "Both English and Swahili", "French"], correct_answer: 2 },
            { id: 5, name: "Task 5", icon: "https://cdn-icons-png.flaticon.com/512/2111/2111463.png", question: "Which of these is a famous national park in Kenya?", choices: ["Kruger National Park", "Serengeti National Park", "Maasai Mara National Reserve", "Yellowstone National Park"], correct_answer: 2 }
        ];

        // Find task in sample tasks
        let task = sampleTasks.find(t => t.id === taskId);

        // If not found in primary sample tasks, generate a dynamic one for ID > 5
        if (!task) {
            const mathOps = ['+', '-', '*'];
            const op = mathOps[taskId % mathOps.length];
            const num1 = (taskId % 20) + 5;
            const num2 = (taskId % 15) + 3;
            let result;
            if (op === '+') result = num1 + num2;
            else if (op === '-') result = num1 - num2;
            else result = num1 * num2;

            const choices = [result, result + 2, result - 2, result + 5].sort(() => Math.random() - 0.5);
            const correctIndex = choices.indexOf(result);

            task = {
                id: taskId,
                name: `Task ${taskId}`,
                question: `What is ${num1} ${op} ${num2}?`,
                choices: choices,
                correct_answer: correctIndex
            };
        }

        res.json({
            success: true,
            ...task,
            reward: levelReward,
            earning: levelReward
        });

    } catch (error) {
        console.error('Error fetching task question:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}
