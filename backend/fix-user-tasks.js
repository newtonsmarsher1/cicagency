const { pool, testConnection } = require('./config/database');
require('dotenv').config();

async function fixUserTasksTable() {
    try {
        const ok = await testConnection();
        if (!ok) {
            console.error('❌ Database connection failed');
            process.exit(1);
        }

        console.log('🗑️ Dropping user_tasks table...');
        await pool.execute('DROP TABLE IF EXISTS user_tasks CASCADE');
        console.log('✅ user_tasks table dropped');

        console.log('📝 Creating new user_tasks table (PostgreSQL)...');
        await pool.execute(`
            CREATE TABLE user_tasks (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL,
                task_id INT NOT NULL,
                task_type VARCHAR(100) DEFAULT 'regular',
                is_complete SMALLINT DEFAULT 0,
                reward_amount DECIMAL(10,2) DEFAULT 0.00,
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.execute(`CREATE INDEX IF NOT EXISTS idx_user_id ON user_tasks(user_id)`);
        await pool.execute(`CREATE INDEX IF NOT EXISTS idx_task_id ON user_tasks(task_id)`);
        await pool.execute(`CREATE INDEX IF NOT EXISTS idx_completed_at ON user_tasks(completed_at)`);

        console.log('✅ user_tasks table created successfully');
        console.log('🎉 Database fix completed successfully!');

    } catch (error) {
        console.error('❌ Database fix failed:', error);
    }
}

// Run fix
fixUserTasksTable();







