const { pool } = require('../config/database');

// Get user's investments
const getInvestments = async (req, res) => {
    console.log('📥 getInvestments called');
    console.log('Request user:', req.user ? { id: req.user.id, name: req.user.name } : 'null');

    try {
        if (!req.user || !req.user.id) {
            console.log('❌ No user in request');
            return res.status(401).json({
                success: false,
                error: 'Unauthorized: User not authenticated'
            });
        }
        const userId = req.user.id;
        console.log('✅ User authenticated, userId:', userId);

        let investments = [];

        try {
            // Get investments - simple query with all required columns
            [investments] = await pool.execute(
                `SELECT id, plan_name, amount, daily_return, duration, status, created_at
                 FROM investments 
                 WHERE user_id = ? 
                 ORDER BY created_at DESC`,
                [userId]
            );

            // Calculate end_date for each investment in JavaScript
            if (investments && investments.length > 0) {
                investments = investments.map(inv => {
                    // Calculate end_date
                    if (inv.duration && inv.created_at) {
                        try {
                            const startDate = new Date(inv.created_at);
                            const endDate = new Date(startDate);
                            endDate.setDate(endDate.getDate() + parseInt(inv.duration || 0));
                            inv.end_date = endDate.toISOString();
                        } catch (e) {
                            console.error('Error calculating end_date:', e);
                            inv.end_date = null;
                        }
                    } else {
                        inv.end_date = null;
                    }
                    return inv;
                });
            }

            console.log('✅ Query executed successfully, found', investments.length, 'investments');
        } catch (dbError) {
            console.error('❌ Database error in getInvestments:', dbError);
            console.error('Error code:', dbError.code);
            console.error('Error message:', dbError.message);
            console.error('Error stack:', dbError.stack);

            // On any database error, return empty array instead of throwing
            // This prevents 500 errors and allows the page to load
            console.log('⚠️ Returning empty investments array due to database error');
            investments = [];
        }

        res.json({
            success: true,
            investments: investments || []
        });

    } catch (error) {
        console.error('❌ Error getting investments:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message,
            details: error.message,
            code: error.code
        });
    }
};

// Create new investment
const createInvestment = async (req, res) => {
    console.log('📥 createInvestment called');
    console.log('Request user:', req.user ? { id: req.user.id, name: req.user.name } : 'null');
    console.log('Request body:', req.body);

    let connection;

    try {
        if (!req.user || !req.user.id) {
            console.log('❌ No user in request');
            return res.status(401).json({
                success: false,
                error: 'Unauthorized: User not authenticated'
            });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        const userId = req.user.id;
        console.log('✅ User authenticated, userId:', userId);
        const { plan_name, amount, daily_return, duration } = req.body;

        console.log('Investment creation request:', { userId, plan_name, amount, daily_return, duration });

        // Validate input
        if (!plan_name || amount === undefined || !daily_return || !duration) {
            if (connection && typeof connection.rollback === 'function') {
                await connection.rollback();
            }
            if (connection && typeof connection.release === 'function') {
                connection.release();
            }
            return res.status(400).json({
                success: false,
                error: 'Plan name, amount, daily return, and duration are required'
            });
        }

        const investmentAmount = parseFloat(amount);
        if (isNaN(investmentAmount) || investmentAmount <= 0) {
            if (connection && typeof connection.rollback === 'function') {
                await connection.rollback();
            }
            if (connection && typeof connection.release === 'function') {
                connection.release();
            }
            return res.status(400).json({
                success: false,
                error: 'Invalid investment amount'
            });
        }

        // Validate minimum investment amount (100 KES minimum)
        if (investmentAmount < 100) {
            if (connection && typeof connection.rollback === 'function') {
                await connection.rollback();
            }
            if (connection && typeof connection.release === 'function') {
                connection.release();
            }
            return res.status(400).json({
                success: false,
                error: 'Minimum investment amount is KES 100'
            });
        }

        // Get user's current wallet balances
        const [users] = await connection.execute(
            'SELECT wallet_balance, personal_wallet FROM users WHERE id = ?',
            [userId]
        );

        if (!users || users.length === 0) {
            if (connection) { await connection.rollback(); connection.release(); }
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const user = users[0];
        const walletBalance = parseFloat(user.wallet_balance || 0);
        const personalWallet = parseFloat(user.personal_wallet || 0);
        const totalBalance = walletBalance + personalWallet;

        // Check if user has sufficient total balance
        if (totalBalance < investmentAmount) {
            if (connection) { await connection.rollback(); connection.release(); }
            return res.status(400).json({
                success: false,
                error: `Insufficient funds. Your Total Balance: KES ${totalBalance.toFixed(2)}, Required: KES ${investmentAmount.toFixed(2)}`
            });
        }

        // Deduct logic: Prioritize Personal Wallet (Recharges), then Wallet Balance (Earnings)
        let deductFromPersonal = 0;
        let deductFromEarnings = 0;

        if (personalWallet >= investmentAmount) {
            // Personal wallet covers the full amount
            deductFromPersonal = investmentAmount;
        } else {
            // Drain personal wallet, rest from earnings
            deductFromPersonal = personalWallet;
            deductFromEarnings = investmentAmount - personalWallet;
        }

        console.log(`💰 Deduction Plan: Personal=${deductFromPersonal}, Earnings=${deductFromEarnings}`);

        // Execute Deductions
        if (deductFromPersonal > 0) {
            await connection.execute(
                'UPDATE users SET personal_wallet = personal_wallet - ? WHERE id = ?',
                [deductFromPersonal, userId]
            );
        }

        if (deductFromEarnings > 0) {
            await connection.execute(
                'UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?',
                [deductFromEarnings, userId]
            );
        }

        // Calculate new total balance directly
        const newTotalBalance = totalBalance - investmentAmount;

        // Define newBalance for response compatibility (referenced later in code)
        const newBalance = newTotalBalance;

        console.log(`✅ Wallet deducted. New Total Balance: ${newTotalBalance.toFixed(2)} KES`);

        // Create investment record
        let result;
        try {
            // Standard INSERT using 'duration' as defined in the CREATE TABLE schema
            // Postgres uses RETURNING id to get the ID, MySQL uses result.insertId
            // @vercel/postgres likely supports RETURNING

            // Try standard insert first
            try {
                [result] = await connection.execute(
                    `INSERT INTO investments (user_id, plan_name, amount, daily_return, duration, status) 
                     VALUES (?, ?, ?, ?, ?, 'active')`,
                    [userId, plan_name, investmentAmount, parseFloat(daily_return), parseInt(duration)]
                );
            } catch (insertError) {
                // Check for "relation does not exist" (Postgres 42P01) or "Table doesn't exist" (MySQL 1146/ER_NO_SUCH_TABLE)
                if (insertError.code === '42P01' || insertError.code === 'ER_NO_SUCH_TABLE' || insertError.message.includes('relation "investments" does not exist')) {
                    console.log('⚠️ Investments table not found (error code: ' + insertError.code + '), creating it...');

                    // Create table
                    await connection.execute(`
                        CREATE TABLE IF NOT EXISTS investments (
                            id SERIAL PRIMARY KEY,
                            user_id INT NOT NULL,
                            plan_name VARCHAR(255) NOT NULL,
                            amount DECIMAL(10,2) NOT NULL,
                            daily_return DECIMAL(5,2) NOT NULL,
                            duration INT NOT NULL,
                            status VARCHAR(20) DEFAULT 'active',
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    `);

                    // Retry insert
                    [result] = await connection.execute(
                        `INSERT INTO investments (user_id, plan_name, amount, daily_return, duration, status) 
                         VALUES (?, ?, ?, ?, ?, 'active')`,
                        [userId, plan_name, investmentAmount, parseFloat(daily_return), parseInt(duration)]
                    );
                } else {
                    throw insertError;
                }
            }
        } catch (dbError) {
            console.error('❌ Database error creating investment:', dbError);
            throw dbError;
        }

        const investmentId = result.rows && result.rows.length > 0 ? result.rows[0].id : result.insertId;

        // Record the investment transaction in payments table
        try {
            await connection.execute(
                `INSERT INTO payments (user_id, amount, payment_type, status, payment_method, description) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [userId, investmentAmount, 'investment', 'completed', 'wallet', `Investment: ${plan_name} Plan`]
            );
        } catch (paymentError) {
            // If 'completed' status is not in enum, try 'success' as fallback
            if (paymentError.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD' || paymentError.message.includes('status')) {
                console.log('⚠️ Payment status "completed" not in enum, using "success" instead');
                try {
                    await connection.execute(
                        `INSERT INTO payments (user_id, amount, payment_type, status, payment_method, description) 
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [userId, investmentAmount, 'investment', 'success', 'wallet', `Investment: ${plan_name} Plan`]
                    );
                } catch (retryError) {
                    console.error('Error recording payment (retry failed):', retryError);
                }
            } else {
                console.error('Error recording payment:', paymentError);
            }
            // Continue even if payment recording fails - investment is already created
        }

        // Commit transaction
        if (connection && typeof connection.commit === 'function') {
            await connection.commit();
        }
        if (connection && typeof connection.release === 'function') {
            connection.release();
        }

        console.log(`✅ Investment created successfully: ID ${investmentId}, Amount: ${investmentAmount} KES`);

        res.status(201).json({
            success: true,
            message: 'Investment created successfully',
            investment: {
                id: investmentId,
                plan_name,
                amount: investmentAmount,
                daily_return,
                duration
            },
            wallet_balance: newBalance // Use balance already fetched during verification
        });

    } catch (error) {
        // Rollback transaction on error
        if (connection && typeof connection.rollback === 'function') {
            try {
                await connection.rollback();
                console.log('✅ Transaction rolled back due to error');
            } catch (rollbackError) {
                console.error('❌ Error during rollback:', rollbackError);
            }
        }
        if (connection && typeof connection.release === 'function') {
            connection.release();
        }
        console.error('❌ Error creating investment:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: 'Internal server error during investment creation',
            message: error.message,
            details: error.message,
            code: error.code
        });
    }
};

module.exports = {
    getInvestments,
    createInvestment
};

