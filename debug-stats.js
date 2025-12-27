const { pool } = require('./admin-portal/config/database');

async function debugDashboardStats() {
    try {
        console.log('1. Fetching total users...');
        const [usersResult] = await pool.execute('SELECT COUNT(*) as total FROM users');
        console.log('Users Result:', usersResult);
        const totalUsers = usersResult[0].total;

        console.log('2. Fetching active users...');
        const [activeUsersResult] = await pool.execute(
            "SELECT COUNT(*) as total FROM users WHERE last_login >= NOW() - INTERVAL '30 days'"
        );
        console.log('Active Users Result:', activeUsersResult);
        const activeUsers = activeUsersResult[0].total;

        console.log('3. Fetching total payments...');
        const [paymentsResult] = await pool.execute(
            "SELECT COUNT(*) as total, SUM(amount) as totalAmount FROM payments WHERE status = 'success'"
        );
        console.log('Payments Result:', paymentsResult);
        const totalPayments = paymentsResult[0].total;
        const totalPaymentAmount = paymentsResult[0].totalAmount || 0;

        console.log('4. Fetching pending payments...');
        const [pendingPaymentsResult] = await pool.execute(
            "SELECT COUNT(*) as total FROM payments WHERE status = 'pending'"
        );
        console.log('Pending Payments Result:', pendingPaymentsResult);
        const pendingPayments = pendingPaymentsResult[0].total;

        console.log('5. Fetching total withdrawals...');
        const [withdrawalsResult] = await pool.execute(
            "SELECT COUNT(*) as total, SUM(amount) as totalAmount FROM withdrawal_requests WHERE status = 'completed'"
        );
        console.log('Withdrawals Result:', withdrawalsResult);
        const totalWithdrawals = withdrawalsResult[0].total;
        const totalWithdrawalAmount = withdrawalsResult[0].totalAmount || 0;

        console.log('6. Fetching pending withdrawals...');
        const [pendingWithdrawalsResult] = await pool.execute(
            "SELECT COUNT(*) as total FROM withdrawal_requests WHERE status = 'pending'"
        );
        console.log('Pending Withdrawals Result:', pendingWithdrawalsResult);
        const pendingWithdrawals = pendingWithdrawalsResult[0].total;

        console.log('7. Fetching total tasks...');
        const [tasksResult] = await pool.execute('SELECT COUNT(*) as total FROM user_tasks');
        console.log('Tasks Result:', tasksResult);
        const totalTasks = tasksResult[0].total;

        console.log('8. Fetching total wallet...');
        const [walletResult] = await pool.execute('SELECT SUM(wallet_balance) as total FROM users');
        console.log('Wallet Result:', walletResult);
        const totalWalletBalance = walletResult[0].total || 0;

        console.log('9. Fetching total earnings...');
        const [earningsResult] = await pool.execute('SELECT SUM(total_earnings) as total FROM users');
        console.log('Earnings Result:', earningsResult);
        const totalEarnings = earningsResult[0].total || 0;

        console.log('10. Fetching recent users...');
        const [recentUsers] = await pool.execute(
            'SELECT id, name, phone, created_at FROM users ORDER BY created_at DESC LIMIT 10'
        );
        console.log('Recent Users Result:', recentUsers);

        console.log('SUCCESS!');
    } catch (error) {
        console.error('ERROR DETECTED:');
        console.error(error);
        process.exit(1);
    }
    process.exit(0);
}

debugDashboardStats();
