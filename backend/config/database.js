require('dotenv').config();

// Database connection wrapper that works both locally (with pg) and on Vercel (with @vercel/postgres)
let sql;
let isVercel = false;

// Check if we have a POSTGRES_URL
const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING;

// Check if it's a pooled connection string (for @vercel/postgres)
// Pooled connection strings typically have "pooler" in the hostname or use port 6543
const isPooledConnection = postgresUrl && (
    postgresUrl.includes('pooler') ||
    postgresUrl.includes(':6543') ||
    process.env.POSTGRES_PRISMA_URL // Prisma URL is always pooled
);

// Try to use @vercel/postgres only for pooled connections (Vercel environment)
let vercelPostgresError = null;
if (isPooledConnection) {
    try {
        const vercelPostgres = require('@vercel/postgres');
        sql = vercelPostgres.sql;
        isVercel = true;
        console.log('✅ Using @vercel/postgres (pooled connection)');
    } catch (error) {
        vercelPostgresError = error;
        console.log('⚠️  @vercel/postgres not available, falling back to pg');
    }
} else if (postgresUrl) {
    console.log('ℹ️  Direct connection string detected, using pg driver');
}

// If @vercel/postgres didn't work or POSTGRES_URL is not set, use pg for local development
if (!sql) {
    let pgError = null;
    try {
        const { Pool } = require('pg');

        // Get connection string from environment
        const connectionString = process.env.POSTGRES_URL ||
            process.env.DATABASE_URL ||
            process.env.POSTGRES_PRISMA_URL ||
            process.env.POSTGRES_URL_NON_POOLING;

        if (!connectionString) {
            throw new Error('No database connection string found. Please set POSTGRES_URL or DATABASE_URL in your .env file');
        }

        // Create connection pool for local development
        const pool = new Pool({
            connectionString: connectionString,
            ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
                ? false
                : { rejectUnauthorized: false }
        });

        // Create a wrapper that matches @vercel/postgres interface
        sql = {
            query: async (text, params) => {
                const result = await pool.query(text, params);
                return {
                    rows: result.rows,
                    rowCount: result.rowCount,
                    fields: result.fields
                };
            }
        };

        console.log('✅ Using pg (local development)');
    } catch (err) {
        pgError = err;
        console.error('❌ Failed to load database driver');
        if (vercelPostgresError) {
            console.error('   @vercel/postgres error:', vercelPostgresError.message);
        }
        console.error('   pg error:', pgError.message);
        console.error('\n📦 To fix this:');
        if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
            console.error('   1. Set POSTGRES_URL or DATABASE_URL in your .env file');
            console.error('   2. Example: POSTGRES_URL=postgresql://user:password@localhost:5432/cic');
        }
        if (pgError.code === 'MODULE_NOT_FOUND') {
            console.error('   3. Install pg package: npm install pg');
        }
        throw new Error(`Database driver not available: ${pgError.message}`);
    }
}

// Database connection wrapper for Vercel Postgres
// This provides a similar interface to mysql2 for easier migration
class Database {
    constructor() {
        this.sql = sql;
    }

    // Execute a query (similar to pool.execute)
    async execute(query, params = []) {
        try {
            // Convert MySQL placeholders (?) to PostgreSQL placeholders ($1, $2, etc.)
            let pgQuery = query.trim();
            let paramIndex = 1;

            // Replace ? with $1, $2, etc.
            pgQuery = pgQuery.replace(/\?/g, () => `$${paramIndex++}`);

            // For INSERT statements without RETURNING, add RETURNING id
            if (pgQuery.match(/^INSERT\s+INTO/i) && !pgQuery.match(/RETURNING/i)) {
                // Extract table name and add RETURNING id
                const tableMatch = pgQuery.match(/INSERT\s+INTO\s+(\w+)/i);
                if (tableMatch) {
                    pgQuery += ' RETURNING id';
                }
            }

            const result = await this.sql.query(pgQuery, params);

            // Return in a mysql2-like shape: first item is rows array
            // (most of our code expects [rows] from mysql2/promise)
            const rows = result.rows || [];
            // Preserve insertId compatibility for inserts with RETURNING id
            rows.insertId = result.rows && result.rows.length > 0 && result.rows[0].id ? result.rows[0].id : null;
            return [rows, result.fields || []];
        } catch (error) {
            console.error('Database query error:', error);
            console.error('Query:', query);
            console.error('Params:', params);
            throw error;
        }
    }

    // Get connection (for transactions - Vercel Postgres handles this automatically)
    async getConnection() {
        return this;
    }

    // Begin transaction
    async beginTransaction() {
        // Vercel Postgres handles transactions automatically
        // For explicit transactions, we'll use sql.begin()
        return this;
    }

    // Commit transaction
    async commit() {
        // Vercel Postgres handles commits automatically
        return;
    }

    // Rollback transaction
    async rollback() {
        // Vercel Postgres handles rollbacks automatically
        return;
    }

    // Release connection (no-op for Vercel Postgres)
    release() {
        return;
    }
}

// Create database instance
const db = new Database();

// Test database connection
async function testConnection() {
    try {
        await db.execute('SELECT 1');
        console.log('✅ Database connected successfully');
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
            console.error('⚠️  Please set POSTGRES_URL or DATABASE_URL environment variable');
        }
        return false;
    }
}

// Initialize database and create tables if they don't exist
async function initializeDatabase() {
    try {
        // Create users table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                phone VARCHAR(20) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                invitation_code VARCHAR(50) DEFAULT NULL,
                wallet_balance DECIMAL(10,2) DEFAULT 0.00,
                total_earnings DECIMAL(10,2) DEFAULT 0.00,
                level INT DEFAULT 0,
                email VARCHAR(255) DEFAULT NULL,
                is_temporary_worker BOOLEAN DEFAULT FALSE,
                temp_worker_start_date DATE DEFAULT NULL,
                invited_by INT DEFAULT NULL,
                last_login TIMESTAMP NULL DEFAULT NULL,
                tasks_completed_today INT DEFAULT 0,
                last_daily_reset TIMESTAMP NULL DEFAULT NULL,
                income_wallet DECIMAL(10,2) DEFAULT 0.00,
                personal_wallet DECIMAL(10,2) DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_invited_by FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);

        // Create indexes for users
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_phone ON users(phone)`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_invitation_code ON users(invitation_code)`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_invited_by ON users(invited_by)`);

        // Create invitation_codes table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS invitation_codes (
                id SERIAL PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                created_by INT DEFAULT NULL,
                used_by INT DEFAULT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                used_at TIMESTAMP NULL DEFAULT NULL,
                CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
                CONSTRAINT fk_used_by FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);

        // Create indexes for invitation_codes
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_code ON invitation_codes(code)`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_created_by ON invitation_codes(created_by)`);

        // Create payments table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS payments (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                phone_number VARCHAR(20) DEFAULT NULL,
                transaction_id VARCHAR(100) DEFAULT NULL,
                session_id VARCHAR(100) DEFAULT NULL,
                payment_method VARCHAR(50) DEFAULT NULL,
                payment_type VARCHAR(50) DEFAULT 'recharge' CHECK (payment_type IN ('recharge', 'investment', 'withdrawal', 'bonus', 'referral')),
                status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'cancelled', 'completed')),
                description TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP NULL DEFAULT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Create indexes for payments
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_user_id ON payments(user_id)`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_transaction_id ON payments(transaction_id)`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_session_id ON payments(session_id)`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_status ON payments(status)`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_payment_type ON payments(payment_type)`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_created_at ON payments(created_at)`);

        // Create user_tasks table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS user_tasks (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL,
                task_id INT NOT NULL,
                task_name VARCHAR(255) DEFAULT NULL,
                task_type VARCHAR(100) DEFAULT 'regular',
                question TEXT DEFAULT NULL,
                user_answer TEXT DEFAULT NULL,
                correct_answer TEXT DEFAULT NULL,
                is_correct BOOLEAN DEFAULT FALSE,
                is_complete SMALLINT DEFAULT 0,
                reward_amount DECIMAL(10,2) DEFAULT 0.00,
                completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_user_id_tasks FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Create indexes for user_tasks
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_user_id_tasks ON user_tasks(user_id)`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_task_id ON user_tasks(task_id)`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_is_complete ON user_tasks(is_complete)`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_is_correct ON user_tasks(is_correct)`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_completed_at ON user_tasks(completed_at)`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_user_task_date ON user_tasks(user_id, completed_at)`);

        // Create withdrawal_requests table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS withdrawal_requests (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                bank_name VARCHAR(255) DEFAULT NULL,
                account_number VARCHAR(100) NOT NULL,
                account_name VARCHAR(255) NOT NULL,
                phone_number VARCHAR(20) DEFAULT NULL,
                payment_method VARCHAR(50) DEFAULT NULL,
                status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'failed')),
                request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                processed_date TIMESTAMP NULL DEFAULT NULL,
                admin_notes TEXT DEFAULT NULL,
                notes TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_user_id_withdrawals FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Create indexes for withdrawal_requests
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_user_id_withdrawals ON withdrawal_requests(user_id)`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_status_withdrawals ON withdrawal_requests(status)`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_request_date ON withdrawal_requests(request_date)`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_created_at_withdrawals ON withdrawal_requests(created_at)`);

        // Create payment_details table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS payment_details (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL UNIQUE,
                payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('mpesa', 'bank', 'airtel')),
                account_number VARCHAR(100) NOT NULL,
                account_name VARCHAR(255) NOT NULL,
                bank_name VARCHAR(255) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_user_id_payment_details FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Create manual_recharge_numbers table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS manual_recharge_numbers (
                id SERIAL PRIMARY KEY,
                phone_number VARCHAR(20) NOT NULL,
                account_name VARCHAR(255) DEFAULT 'CIC GROUP',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create manual_recharge_requests table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS manual_recharge_requests (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                mpesa_message TEXT NOT NULL,
                status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
                admin_notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                approved_at TIMESTAMP NULL,
                CONSTRAINT fk_user_id_manual_recharge FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Create indexes for manual_recharge_requests
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_manual_user_id ON manual_recharge_requests(user_id)`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_manual_status ON manual_recharge_requests(status)`);

        // Create indexes for payment_details

        // Create indexes for payment_details
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_user_id_payment_details ON payment_details(user_id)`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_payment_method ON payment_details(payment_method)`);

        // Create notifications table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INT DEFAULT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR(50) DEFAULT 'info',
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_user_id_notifications FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Create indexes for notifications
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_user_id_notifications ON notifications(user_id)`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_is_read ON notifications(is_read)`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_created_at_notifications ON notifications(created_at)`);

        // Create investments table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS investments (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL,
                plan_name VARCHAR(255) NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                daily_return DECIMAL(5,2) NOT NULL,
                duration INT NOT NULL,
                status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_user_id_investments FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Create indexes for investments
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_user_id_investments ON investments(user_id)`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_status_investments ON investments(status)`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_created_at_investments ON investments(created_at)`);

        // Create function to update updated_at timestamp
        await db.execute(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        `);

        // Create triggers for updated_at
        // Note: Each statement must be executed separately (pg doesn't support multiple statements in one query)
        await db.execute(`DROP TRIGGER IF EXISTS update_users_updated_at ON users`);
        await db.execute(`
            CREATE TRIGGER update_users_updated_at
                BEFORE UPDATE ON users
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column()
        `);

        await db.execute(`DROP TRIGGER IF EXISTS update_payments_updated_at ON payments`);
        await db.execute(`
            CREATE TRIGGER update_payments_updated_at
                BEFORE UPDATE ON payments
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column()
        `);

        await db.execute(`DROP TRIGGER IF EXISTS update_withdrawal_requests_updated_at ON withdrawal_requests`);
        await db.execute(`
            CREATE TRIGGER update_withdrawal_requests_updated_at
                BEFORE UPDATE ON withdrawal_requests
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column()
        `);

        await db.execute(`DROP TRIGGER IF EXISTS update_payment_details_updated_at ON payment_details`);
        await db.execute(`
            CREATE TRIGGER update_payment_details_updated_at
                BEFORE UPDATE ON payment_details
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column()
        `);

        await db.execute(`DROP TRIGGER IF EXISTS update_investments_updated_at ON investments`);
        await db.execute(`
            CREATE TRIGGER update_investments_updated_at
                BEFORE UPDATE ON investments
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column()
        `);

        await db.execute(`DROP TRIGGER IF EXISTS update_manual_recharge_requests_updated_at ON manual_recharge_requests`);
        await db.execute(`
            CREATE TRIGGER update_manual_recharge_requests_updated_at
                BEFORE UPDATE ON manual_recharge_requests
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column()
        `);

        console.log('✅ Database tables initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        console.error('Error details:', error);
        return false;
    }
}

// Export pool-like interface for compatibility
const pool = db;

module.exports = {
    pool,
    sql,
    testConnection,
    initializeDatabase
};
