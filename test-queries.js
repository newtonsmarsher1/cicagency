const { pool } = require('./admin-portal/config/database');

async function test() {
    console.log('--- Starting Query Tests ---');
    const queries = [
        'SELECT COUNT(*) as total FROM users',
        "SELECT COUNT(*) as total FROM users WHERE last_login >= NOW() - INTERVAL '30 days'",
        "SELECT COUNT(*) as total, SUM(amount) as totalAmount FROM payments WHERE status = 'success'",
        "SELECT COUNT(*) as total FROM payments WHERE status = 'pending'",
        "SELECT COUNT(*) as total, SUM(amount) as totalAmount FROM withdrawal_requests WHERE status = 'completed'",
        "SELECT COUNT(*) as total FROM withdrawal_requests WHERE status = 'pending'",
        'SELECT COUNT(*) as total FROM user_tasks',
        'SELECT SUM(wallet_balance) as total FROM users',
        'SELECT SUM(total_earnings) as total FROM users',
        'SELECT id, name, phone, created_at FROM users ORDER BY created_at DESC LIMIT 10'
    ];

    for (const q of queries) {
        try {
            console.log(`Testing: ${q}`);
            const [rows] = await pool.execute(q);
            console.log(`PASS: Found ${rows.length} rows`);
            if (rows.length > 0) {
                console.log(`Sample data: ${JSON.stringify(rows[0])}`);
            }
        } catch (e) {
            console.error(`FAIL: ${q}`);
            console.error(`Error: ${e.message}`);
        }
        console.log('---');
    }
    process.exit(0);
}

test();
