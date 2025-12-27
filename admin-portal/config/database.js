const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// PostgreSQL connection wrapper (same as main backend)
let sql;
const { Pool } = require('pg');

// Get connection string from environment
const connectionString = process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING;

if (!connectionString) {
    throw new Error('No database connection string found. Please set POSTGRES_URL or DATABASE_URL in your .env file');
}

// Create connection pool
const pgPool = new Pool({
    connectionString: connectionString,
    ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
        ? false
        : { rejectUnauthorized: false }
});

// Database connection wrapper for PostgreSQL
// This provides a similar interface to mysql2 for easier migration
class Database {
    constructor() {
        this.pgPool = pgPool;
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

            const result = await this.pgPool.query(pgQuery, params);

            // Return in a mysql2-like shape: first item is rows array
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

    // Get connection (for transactions)
    async getConnection() {
        return this;
    }

    // Begin transaction
    async beginTransaction() {
        return this;
    }

    // Commit transaction
    async commit() {
        return;
    }

    // Rollback transaction
    async rollback() {
        return;
    }

    // Release connection (no-op for pool)
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
        console.log('✅ Admin Portal: Database connected successfully (PostgreSQL)');
        return true;
    } catch (error) {
        console.error('❌ Admin Portal: Database connection failed:', error.message);
        if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
            console.error('⚠️  Please set POSTGRES_URL or DATABASE_URL environment variable');
        }
        return false;
    }
}

// Export pool-like interface for compatibility
const pool = db;

module.exports = {
    pool,
    testConnection
};




