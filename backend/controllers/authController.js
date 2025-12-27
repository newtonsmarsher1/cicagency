const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { isRestrictedDate } = require('../utils/dateRestrictions');

// Generate unique 6-character alphanumeric invitation code
async function generateInvitationCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 100;

    while (!isUnique && attempts < maxAttempts) {
        code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        // Check if code already exists
        const [existing] = await pool.execute(
            'SELECT id FROM users WHERE invitation_code = ?',
            [code]
        );

        if (existing.length === 0) {
            isUnique = true;
        }
        attempts++;
    }

    if (!isUnique) {
        throw new Error('Failed to generate unique invitation code');
    }

    return code;
}

// Generate JWT token
const generateToken = (userId, phone) => {
    return jwt.sign(
        { userId, phone },
        process.env.JWT_SECRET || 'cic_super_secret_jwt_key_2024',
        { expiresIn: '7d' }
    );
};

// User registration
const register = async (req, res) => {
    try {
        const { name, phone, password, invitationCode } = req.body;

        // Validate input
        if (!name || !phone || !password) {
            return res.status(400).json({
                success: false,
                error: 'Name, phone, and password are required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters long'
            });
        }

        // Check if user already exists
        const [existingUsers] = await pool.execute(
            'SELECT id FROM users WHERE phone = ?',
            [phone]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'User with this phone number already exists'
            });
        }

        // Validate invitation code and find inviter
        let inviterId = null;
        let code_id = null;
        let isReusableCode = false; // Track if code is from users table (reusable)

        // Clean and normalize invitation code
        const cleanInvitationCode = invitationCode ? invitationCode.trim().toUpperCase() : null;

        console.log('🔍 Registration - Invitation code received:', cleanInvitationCode || 'none');

        if (cleanInvitationCode) {
            // First check if code exists in users table (what people actually share - reusable)
            // Use UPPER() for case-insensitive matching
            const [usersWithCode] = await pool.execute(
                'SELECT id, name, invitation_code FROM users WHERE UPPER(invitation_code) = ?',
                [cleanInvitationCode]
            );

            console.log('🔍 Found users with code:', usersWithCode.length);

            if (usersWithCode.length > 0) {
                // Code found in users table - use that user as inviter
                // These codes are REUSABLE (can be used by multiple people)
                inviterId = usersWithCode[0].id;
                isReusableCode = true;
                console.log(`✅ Found inviter: User ID ${inviterId} (${usersWithCode[0].name})`);

                // Don't need to check invitation_codes table for reusable codes
                // The inviterId from users table is sufficient
            } else {
                // Check invitation_codes table as fallback (single-use codes)
                const [invitationCodes] = await pool.execute(
                    'SELECT id, created_by FROM invitation_codes WHERE UPPER(code) = ? AND is_active = TRUE AND used_by IS NULL',
                    [cleanInvitationCode]
                );

                console.log('🔍 Found codes in invitation_codes table:', invitationCodes.length);

                if (invitationCodes.length === 0) {
                    console.log('❌ Invalid invitation code:', cleanInvitationCode);
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid invitation code'
                    });
                }

                inviterId = invitationCodes[0].created_by;
                code_id = invitationCodes[0].id;

                // If created_by is null, code is invalid
                if (!inviterId) {
                    console.log('❌ Invitation code has no creator:', cleanInvitationCode);
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid invitation code'
                    });
                }
                console.log(`✅ Found inviter from invitation_codes: User ID ${inviterId}`);
                // isReusableCode stays false - these are single-use codes
            }
        } else {
            console.log('ℹ️ No invitation code provided - user registering without referrer');
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Start transaction
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Generate unique invitation code for the new user
            const userInvitationCode = await generateInvitationCode();

            // Insert user with their own invitation code
            const [result] = await connection.execute(
                'INSERT INTO users (name, phone, password, invitation_code, invited_by) VALUES (?, ?, ?, ?, ?) RETURNING id',
                [name, phone, hashedPassword, userInvitationCode, inviterId || null]
            );

            const userId = result.rows && result.rows.length > 0 ? result.rows[0].id : result.insertId;

            console.log(`✅ User registered: ID ${userId}, Name: ${name}, Invited by: ${inviterId || 'none'}`);

            if (inviterId) {
                console.log(`👥 Team relationship created: User ${userId} invited by User ${inviterId}`);
            }

            // Mark invitation code as used ONLY if it's a single-use code from invitation_codes table
            // Codes from users.invitation_code are reusable and should NOT be marked as used
            if (invitationCode && code_id && !isReusableCode) {
                await connection.execute(
                    'UPDATE invitation_codes SET used_by = ?, used_at = CURRENT_TIMESTAMP, is_active = FALSE WHERE id = ?',
                    [userId, code_id]
                );
            }

            // Commit transaction
            await connection.commit();

            // Generate token
            const token = generateToken(userId, phone);

            // Return success response
            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                token,
                user: {
                    id: userId,
                    name,
                    phone,
                    invitation_code: userInvitationCode
                }
            });

        } catch (error) {
            // Rollback transaction
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during registration'
        });
    }
};

// User login
const login = async (req, res) => {
    try {
        const { phone, password } = req.body;

        // Validate input
        if (!phone || !password) {
            return res.status(400).json({
                success: false,
                error: 'Phone and password are required'
            });
        }

        // Find user by phone
        const [users] = await pool.execute(
            'SELECT id, name, phone, password FROM users WHERE phone = ?',
            [phone]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Invalid phone number or password'
            });
        }

        const user = users[0];

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid phone number or password'
            });
        }

        // Generate token
        const token = generateToken(user.id, user.phone);

        // Return success response
        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                phone: user.phone
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during login'
        });
    }
};

// Validate invitation code
const validateInvitationCode = async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({
                success: false,
                error: 'Invitation code is required'
            });
        }

        // Clean and normalize code (case-insensitive)
        const cleanCode = code.trim().toUpperCase();
        console.log('🔍 Validating invitation code:', cleanCode);

        // First check if code exists in users table (what people actually share)
        const [usersWithCode] = await pool.execute(
            'SELECT id, name FROM users WHERE UPPER(invitation_code) = ?',
            [cleanCode]
        );

        if (usersWithCode.length > 0) {
            console.log(`✅ Valid code found: User ID ${usersWithCode[0].id} (${usersWithCode[0].name})`);
            // Valid code found in users table
            return res.status(200).json({
                success: true,
                valid: true,
                message: 'Valid invitation code'
            });
        }

        // Check invitation_codes table as fallback
        const [invitationCodes] = await pool.execute(
            'SELECT id, created_by FROM invitation_codes WHERE UPPER(code) = ? AND is_active = TRUE',
            [cleanCode]
        );

        if (invitationCodes.length === 0 || !invitationCodes[0].created_by) {
            console.log('❌ Invalid invitation code:', cleanCode);
            return res.status(400).json({
                success: false,
                valid: false,
                error: 'Invalid invitation code'
            });
        }

        console.log(`✅ Valid code found in invitation_codes: ID ${invitationCodes[0].id}`);
        res.status(200).json({
            success: true,
            valid: true,
            message: 'Valid invitation code'
        });

    } catch (error) {
        console.error('Invitation validation error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during invitation validation'
        });
    }
};

// Verify token middleware
const verifyToken = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Access denied. No token provided.'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cic_super_secret_jwt_key_2024');

        // Verify user still exists
        const [users] = await pool.execute(
            'SELECT id, name, phone FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Invalid token. User not found.'
            });
        }

        req.user = users[0];
        next();

    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({
            success: false,
            error: 'Invalid token'
        });
    }
};

// Get user profile
const getUserProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const [users] = await pool.execute(
            'SELECT id, name, phone, invitation_code, created_at FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            user: users[0]
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

const getUserStats = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get user basic info including tasks_completed_today
        const [users] = await pool.execute(
            'SELECT id, name, phone, email, invitation_code, created_at, level, wallet_balance, total_earnings, personal_wallet, income_wallet, is_temporary_worker, temp_worker_start_date, tasks_completed_today FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        let user = users[0];

        // Ensure user has invitation code
        if (!user.invitation_code) {
            const invitationCode = await generateInvitationCode();
            await pool.execute(
                'UPDATE users SET invitation_code = ? WHERE id = ?',
                [invitationCode, userId]
            );
            user.invitation_code = invitationCode;
        }

        // Add new wallets to payload
        const personal_wallet = parseFloat(user.personal_wallet || 0);
        const income_wallet = parseFloat(user.income_wallet || 0);

        // Get today's date in Kenyan time (EAT - UTC+3)
        const now = new Date();
        const kenyanTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
        const today = kenyanTime.toISOString().split('T')[0];

        // Get earnings from payments table (exclude wallet deductions like level upgrades)
        // Only count payments that are actual earnings (recharges from external sources, bonuses, referrals)
        // Exclude payments where payment_method = 'wallet' as those are internal deductions
        const [todayPayments] = await pool.execute(
            `SELECT COALESCE(SUM(amount), 0) as today_payment 
             FROM payments 
             WHERE user_id = ? 
             AND DATE(created_at) = ? 
             AND (payment_method != 'wallet' OR payment_method IS NULL)`,
            [userId, today]
        );

        // Get earnings from completed tasks today (where is_complete = 1 and reward_amount > 0)
        const [todayTaskEarnings] = await pool.execute(
            `SELECT COALESCE(SUM(CASE WHEN is_complete = 1 AND reward_amount > 0 THEN reward_amount ELSE 0 END), 0) as today_task_earning 
             FROM user_tasks 
             WHERE user_id = ? AND DATE(completed_at) = ?`,
            [userId, today]
        );

        // Combine both payment and task earnings
        const todayEarning = (parseFloat(todayPayments[0].today_payment) || 0) + (parseFloat(todayTaskEarnings[0].today_task_earning) || 0);

        // Get yesterday's earnings
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const [yesterdayEarnings] = await pool.execute(
            'SELECT COALESCE(SUM(amount), 0) as yesterday_earning FROM payments WHERE user_id = ? AND DATE(created_at) = ?',
            [userId, yesterdayStr]
        );

        // Get this week's earnings
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const [weekEarnings] = await pool.execute(
            'SELECT COALESCE(SUM(amount), 0) as this_week_earning FROM payments WHERE user_id = ? AND created_at >= ?',
            [userId, startOfWeek.toISOString().split('T')[0]]
        );

        // Get this month's earnings
        const startOfMonth = new Date();
        startOfMonth.setMonth(startOfMonth.getMonth(), 1);
        const [monthEarnings] = await pool.execute(
            'SELECT COALESCE(SUM(amount), 0) as this_month_earning FROM payments WHERE user_id = ? AND created_at >= ?',
            [userId, startOfMonth.toISOString().split('T')[0]]
        );

        // Get referral earnings
        const [referralEarnings] = await pool.execute(
            'SELECT COALESCE(SUM(amount), 0) as referral_today FROM payments WHERE user_id IN (SELECT id FROM users WHERE invited_by = ?) AND DATE(created_at) = ?',
            [userId, today]
        );

        // Get total referral earnings
        const [totalReferralEarnings] = await pool.execute(
            'SELECT COALESCE(SUM(amount), 0) as total_referral_earnings FROM payments WHERE user_id IN (SELECT id FROM users WHERE invited_by = ?)',
            [userId]
        );

        // Get team size
        const [teamSize] = await pool.execute(
            'SELECT COUNT(*) as team_size FROM users WHERE invited_by = ?',
            [userId]
        );

        // Use dynamically calculated count from user_tasks table instead of users table column
        // This is more reliable and prevents issues if the users table column is not updated correctly
        const [completedTasksCount] = await pool.execute(
            'SELECT COUNT(*) as count FROM user_tasks WHERE user_id = ? AND is_complete = 1 AND DATE(completed_at) = ?',
            [userId, today]
        );

        const tasksCompletedToday = completedTasksCount[0].count;

        // Get total recharge amount (from payments table)
        const [rechargeAmount] = await pool.execute(
            `SELECT COALESCE(SUM(amount), 0) AS total_recharge 
             FROM payments 
             WHERE user_id = ? AND status = 'success'`,
            [userId]
        );

        // Get recent payments
        const [recentPayments] = await pool.execute(
            'SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 5',
            [userId]
        );

        res.status(200).json({
            success: true,
            ...user,
            today_earning: todayEarning,
            yesterday_earning: yesterdayEarnings[0].yesterday_earning,
            this_week_earning: weekEarnings[0].this_week_earning,
            this_month_earning: monthEarnings[0].this_month_earning,
            referral_today: referralEarnings[0].referral_today,
            total_referral_earnings: totalReferralEarnings[0].total_referral_earnings,
            team_size: teamSize[0].team_size,
            tasks_completed_today: tasksCompletedToday,
            total_recharge_amount: rechargeAmount[0].total_recharge,
            recentPayments: recentPayments,
            totalEarnings: user.total_earnings || 0,
            personal_wallet,
            income_wallet
        });

    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Upgrade user level
const upgradeLevel = async (req, res) => {
    try {
        const userId = req.user.id;
        const { level, rechargeAmount } = req.body;

        console.log('Upgrade level request:', { userId, level, rechargeAmount, body: req.body });

        if (!level || !rechargeAmount) {
            return res.status(400).json({
                success: false,
                error: 'Level and recharge amount are required'
            });
        }

        // Validate level is within valid range
        if (level < 1 || level > 9) {
            return res.status(400).json({
                success: false,
                error: 'Invalid level. Level must be between 1 and 9'
            });
        }

        // Recharge requirements for levels based on your latest table
        const levelRechargeRequired = {
            1: 2800,      // Level J1
            2: 8200,      // Level J2
            3: 23500,     // Level J3
            4: 65800,     // Level J4
            5: 178000,    // Level J5
            6: 483000,    // Level J6
            7: 1085000,   // Level J7
            8: 2258000,   // Level J8
            9: 4280000    // Level J9
        };

        // Validate that the recharge amount matches the expected amount for this level
        // Ensure level is a number for proper lookup
        const levelNum = parseInt(level);
        const expectedAmount = levelRechargeRequired[levelNum];
        const receivedAmount = parseFloat(rechargeAmount);

        console.log('Amount validation:', { level, levelNum, expectedAmount, receivedAmount, rechargeAmount, difference: Math.abs(receivedAmount - expectedAmount) });

        if (!expectedAmount) {
            console.error('Invalid level:', level, 'as number:', levelNum);
            return res.status(400).json({
                success: false,
                error: `Invalid level: J${level}`
            });
        }

        if (isNaN(receivedAmount)) {
            console.error('Invalid amount format:', rechargeAmount);
            return res.status(400).json({
                success: false,
                error: `Invalid recharge amount format: ${rechargeAmount}`
            });
        }

        if (Math.abs(receivedAmount - expectedAmount) > 0.01) {
            console.error('Amount mismatch:', { expectedAmount, receivedAmount, difference: Math.abs(receivedAmount - expectedAmount) });
            return res.status(400).json({
                success: false,
                error: `Invalid recharge amount for Level J${level}. Expected amount: ${expectedAmount}, received: ${rechargeAmount}`
            });
        }

        console.log('Amount validation passed');

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Get current user data
            const [users] = await connection.execute(
                'SELECT wallet_balance, level FROM users WHERE id = ?',
                [userId]
            );

            if (users.length === 0) {
                await connection.rollback();
                connection.release();
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            const user = users[0];

            // Check if user has enough balance
            if (user.wallet_balance < rechargeAmount) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({
                    success: false,
                    error: 'Insufficient wallet balance'
                });
            }

            // Check if level is valid and higher than current
            if (levelNum <= user.level) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({
                    success: false,
                    error: 'Cannot downgrade or stay at same level'
                });
            }

            // Lock direct upgrade from level 7 to 8
            if (user.level === 7 && levelNum === 8) {
                await connection.rollback();
                connection.release();
                return res.status(403).json({
                    success: false,
                    error: 'Upgrade from Level 7 to Level 8 is not allowed.'
                });
            }

            // Deduct recharge amount from wallet and update level
            await connection.execute(
                'UPDATE users SET wallet_balance = wallet_balance - ?, level = ? WHERE id = ?',
                [rechargeAmount, levelNum, userId]
            );

            // Record the level upgrade transaction
            try {
                await connection.execute(
                    'INSERT INTO payments (user_id, amount, payment_type, status, payment_method, description) VALUES (?, ?, ?, ?, ?, ?)',
                    [userId, rechargeAmount, 'recharge', 'completed', 'wallet', `Level upgrade to J${levelNum}`]
                );
            } catch (paymentError) {
                console.error('❌ Error recording payment:', paymentError);
                console.error('Payment error code:', paymentError.code);
                console.error('Payment error message:', paymentError.message);
                // If 'completed' status is not in enum, try 'success' as fallback
                if (paymentError.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD' || paymentError.message.includes('status')) {
                    console.log('⚠️ Payment status "completed" not in enum, using "success" instead');
                    await connection.execute(
                        'INSERT INTO payments (user_id, amount, payment_type, status, payment_method, description) VALUES (?, ?, ?, ?, ?, ?)',
                        [userId, rechargeAmount, 'recharge', 'success', 'wallet', `Level upgrade to J${levelNum}`]
                    );
                } else {
                    throw paymentError;
                }
            }

            // Award referral bonus to inviter if they meet requirements
            const [userInfo] = await connection.execute(
                'SELECT invited_by FROM users WHERE id = ?',
                [userId]
            );

            if (userInfo.length > 0 && userInfo[0].invited_by) {
                const inviterId = userInfo[0].invited_by;

                // Get inviter's level
                const [inviterData] = await connection.execute(
                    'SELECT level, wallet_balance, total_earnings FROM users WHERE id = ?',
                    [inviterId]
                );

                if (inviterData.length > 0 && inviterData[0].level >= 1) {
                    // Referral award amounts based on new level
                    // Referral award amounts based on new level
                    const referralAwards = {
                        1: 252,     // When referred user reaches level 1
                        2: 607,     // When referred user reaches level 2
                        3: 1900,    // When referred user reaches level 3
                        4: 5000,    // When referred user reaches level 4
                        5: 15000,   // When referred user reaches level 5
                        6: 40000    // When referred user reaches level 6
                    };

                    const awardAmount = referralAwards[levelNum];

                    if (awardAmount) {
                        // Check if this award was already given (prevent duplicates)
                        const [existingAward] = await connection.execute(
                            'SELECT id FROM payments WHERE user_id = ? AND description LIKE ? AND payment_type = ?',
                            [inviterId, `%User ${userId} reached Level ${levelNum}%`, 'referral']
                        );

                        if (existingAward.length === 0) {
                            // Award the inviter
                            await connection.execute(
                                'UPDATE users SET wallet_balance = wallet_balance + ?, total_earnings = total_earnings + ? WHERE id = ?',
                                [awardAmount, awardAmount, inviterId]
                            );

                            // Record the referral award payment
                            try {
                                await connection.execute(
                                    'INSERT INTO payments (user_id, amount, payment_type, status, payment_method, description) VALUES (?, ?, ?, ?, ?, ?)',
                                    [inviterId, awardAmount, 'referral', 'completed', 'referral', `Referral bonus: User ${userId} reached Level ${levelNum}`]
                                );
                            } catch (referralPaymentError) {
                                console.error('❌ Error recording referral payment:', referralPaymentError);
                                // If 'completed' status is not in enum, try 'success' as fallback
                                if (referralPaymentError.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD' || referralPaymentError.message.includes('status')) {
                                    console.log('⚠️ Payment status "completed" not in enum, using "success" instead');
                                    await connection.execute(
                                        'INSERT INTO payments (user_id, amount, payment_type, status, payment_method, description) VALUES (?, ?, ?, ?, ?, ?)',
                                        [inviterId, awardAmount, 'referral', 'success', 'referral', `Referral bonus: User ${userId} reached Level ${levelNum}`]
                                    );
                                } else {
                                    // Don't throw - referral bonus is optional, continue with level upgrade
                                    console.error('⚠️ Could not record referral payment, but continuing with level upgrade');
                                }
                            }

                            console.log(`✅ Awarded ${awardAmount} to inviter ${inviterId} for user ${userId} reaching level ${levelNum}`);
                        } else {
                            console.log(`⚠️ Award already given to inviter ${inviterId} for user ${userId} reaching level ${levelNum}`);
                        }
                    }
                } else {
                    console.log(`⚠️ Inviter ${inviterId} is level ${inviterData[0]?.level || 0}, not eligible for referral bonus`);
                }
            }

            await connection.commit();
            connection.release();

            res.status(200).json({
                success: true,
                message: `Successfully upgraded to Level J${levelNum}`,
                data: {
                    newLevel: levelNum,
                    amountDeducted: rechargeAmount
                }
            });

        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }

    } catch (error) {
        console.error('❌ Level upgrade error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Request body:', req.body);
        console.error('User ID:', req.user?.id);
        res.status(500).json({
            success: false,
            error: 'Internal server error during level upgrade',
            message: error.message,
            details: error.message,
            code: error.code
        });
    }
};

// Save payment details
const savePaymentDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const { method, account_number, account_name, bank_name, email } = req.body;

        if (!method || !account_number || !account_name) {
            return res.status(400).json({
                success: false,
                error: 'Method, account number, and account name are required'
            });
        }

        if (method === 'bank' && !bank_name) {
            return res.status(400).json({
                success: false,
                error: 'Bank name is required for bank transfers'
            });
        }

        // Validate email format if provided
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        // Insert or update payment details
        await pool.execute(`
            INSERT INTO payment_details (user_id, payment_method, account_number, account_name, bank_name, email)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT (user_id)
            DO UPDATE SET
                payment_method = EXCLUDED.payment_method,
                account_number = EXCLUDED.account_number,
                account_name = EXCLUDED.account_name,
                bank_name = EXCLUDED.bank_name,
                email = EXCLUDED.email,
                updated_at = CURRENT_TIMESTAMP
        `, [userId, method, account_number, account_name, bank_name || null, email || null]);

        res.json({
            success: true,
            message: 'Payment details saved successfully'
        });
    } catch (error) {
        console.error('Error saving payment details:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Get payment details
const getPaymentDetails = async (req, res) => {
    try {
        const userId = req.user.id;

        const [details] = await pool.execute(`
            SELECT payment_method as method, account_number, account_name, bank_name, email
            FROM payment_details
            WHERE user_id = ?
        `, [userId]);

        if (details.length === 0) {
            return res.json({
                success: true,
                details: null
            });
        }

        res.json({
            success: true,
            details: details[0]
        });
    } catch (error) {
        console.error('Error getting payment details:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Ensure user has invitation code (for existing users)
const ensureInvitationCode = async (req, res) => {
    try {
        const userId = req.user.id;

        // Check if user already has invitation code
        const [users] = await pool.execute(
            'SELECT invitation_code FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        let invitationCode = users[0].invitation_code;

        // Generate code if user doesn't have one
        if (!invitationCode) {
            invitationCode = await generateInvitationCode();
            await pool.execute(
                'UPDATE users SET invitation_code = ? WHERE id = ?',
                [invitationCode, userId]
            );
        }

        res.json({
            success: true,
            invitation_code: invitationCode
        });
    } catch (error) {
        console.error('Error ensuring invitation code:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Get direct team members
const getTeamMembers = async (req, res) => {
    try {
        const userId = req.user.id;

        console.log(`🔍 Fetching team members for user ID: ${userId}`);

        // First check if user exists and has invitation code
        const [userInfo] = await pool.execute(
            'SELECT id, name, invitation_code FROM users WHERE id = ?',
            [userId]
        );

        if (userInfo.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        console.log(`👤 User: ${userInfo[0].name}, Invitation Code: ${userInfo[0].invitation_code || 'NONE'}`);

        // Get team members
        const [teamMembers] = await pool.execute(
            'SELECT id, name, phone, email, invitation_code, created_at FROM users WHERE invited_by = ? ORDER BY created_at DESC',
            [userId]
        );

        console.log(`👥 Found ${teamMembers.length} team members for user ${userId}`);

        res.json({
            success: true,
            team: teamMembers,
            team_size: teamMembers.length,
            your_invitation_code: userInfo[0].invitation_code
        });
    } catch (error) {
        console.error('Error fetching team members:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while fetching team members'
        });
    }
};

// In-memory store for password reset codes (in production, use Redis or database)
const passwordResetCodes = new Map(); // email -> { code, expiresAt, userId }

// Generate 6-digit verification code
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Request password reset - send verification code to email
const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email address is required'
            });
        }

        // Validate email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        // Check if email exists in payment_details (must match bound email)
        const [paymentDetails] = await pool.execute(
            'SELECT user_id, email FROM payment_details WHERE LOWER(email) = LOWER(?)',
            [email]
        );

        if (paymentDetails.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'This Gmail is not registered in your payment details. Please use the email address you bound in your payment details, or update your payment details with the correct email address. OR contact support team.'
            });
        }

        const paymentDetail = paymentDetails[0];
        if (!paymentDetail.email) {
            return res.status(400).json({
                success: false,
                error: 'No Gmail address found in your payment details. Please add your email address in the Bind Payment Details page first.'
            });
        }

        // Get user details
        const [users] = await pool.execute(
            'SELECT id, name FROM users WHERE id = ?',
            [paymentDetail.user_id]
        );

        if (users.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'User not found'
            });
        }

        const user = users[0];
        const verificationCode = generateVerificationCode();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

        // Store verification code
        passwordResetCodes.set(email.toLowerCase(), {
            code: verificationCode,
            expiresAt: expiresAt,
            userId: user.id
        });

        // Send email with verification code
        const { sendPasswordResetCode } = require('../utils/emailService');

        let emailSent = false;
        try {
            const emailResult = await sendPasswordResetCode(email, verificationCode, user.name || 'User');

            if (emailResult.success) {
                console.log(`✅ Verification code sent via email to ${email}`);
                emailSent = true;
            } else {
                console.error(`❌ Email sending failed:`);
                console.error(`   Error: ${emailResult.message || emailResult.error}`);
                console.error(`   Provider: ${emailResult.provider || 'unknown'}`);
                console.error(`   Email Config Check:`);
                console.error(`     - EMAIL_PROVIDER: ${process.env.EMAIL_PROVIDER || 'not set'}`);
                console.error(`     - SMTP_USER: ${process.env.SMTP_USER ? 'set' : 'NOT SET'}`);
                console.error(`     - SMTP_PASSWORD: ${process.env.SMTP_PASSWORD ? 'set' : 'NOT SET'}`);
                // Log code for development/debugging
                console.log(`📧 Password reset code for ${email}: ${verificationCode}`);
            }
        } catch (emailError) {
            console.error('❌ Error sending email:', emailError);
            // Log code for development/debugging if email fails
            console.log(`📧 Password reset code for ${email}: ${verificationCode}`);
        }

        // Always return success (for security - don't reveal if email was sent)
        // But log code in development mode
        res.status(200).json({
            success: true,
            message: emailSent
                ? 'Verification code sent to your email address'
                : 'If an account exists with this email, a verification code has been sent.',
            // Only return code in development mode for testing
            code: process.env.NODE_ENV === 'development' ? verificationCode : undefined
        });

    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Verify password reset code
const verifyPasswordResetCode = async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({
                success: false,
                error: 'Email address and verification code are required'
            });
        }

        const resetData = passwordResetCodes.get(email.toLowerCase());

        if (!resetData) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired verification code'
            });
        }

        if (Date.now() > resetData.expiresAt) {
            passwordResetCodes.delete(email.toLowerCase());
            return res.status(400).json({
                success: false,
                error: 'Verification code has expired. Please request a new one.'
            });
        }

        if (resetData.code !== code) {
            return res.status(400).json({
                success: false,
                error: 'Invalid verification code'
            });
        }

        // Code is valid - return success (code will be used in next step)
        res.status(200).json({
            success: true,
            message: 'Verification code is valid',
            verified: true
        });

    } catch (error) {
        console.error('Verify password reset code error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Reset password with verified code
const resetPassword = async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;

        if (!email || !code || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Email address, verification code, and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters long'
            });
        }

        const resetData = passwordResetCodes.get(email.toLowerCase());

        if (!resetData) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired verification code'
            });
        }

        if (Date.now() > resetData.expiresAt) {
            passwordResetCodes.delete(email.toLowerCase());
            return res.status(400).json({
                success: false,
                error: 'Verification code has expired. Please request a new one.'
            });
        }

        if (resetData.code !== code) {
            return res.status(400).json({
                success: false,
                error: 'Invalid verification code'
            });
        }

        // Code is valid - reset password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const connection = await pool.getConnection();
        await connection.execute(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, resetData.userId]
        );
        connection.release();

        // Delete used code
        passwordResetCodes.delete(email.toLowerCase());

        res.status(200).json({
            success: true,
            message: 'Password reset successfully. You can now login with your new password.'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Check if today is a restricted date
const checkRestriction = async (req, res) => {
    try {
        const restriction = isRestrictedDate();
        res.json({
            success: true,
            ...restriction
        });
    } catch (error) {
        console.error('Check restriction error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

module.exports = {
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
};
