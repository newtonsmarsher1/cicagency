const { pool, testConnection } = require('./config/database');
require('dotenv').config();

const COLUMN_QUERY = `
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ?
    ORDER BY ordinal_position
`;

async function printTableColumns(tableName) {
    const [columns] = await pool.execute(COLUMN_QUERY, [tableName]);
    console.log(`📋 ${tableName} table columns:`);
    columns.forEach(col => {
        const defaultText = col.column_default ? `DEFAULT ${col.column_default}` : '';
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${defaultText}`);
    });
    console.log('');
}

async function checkDatabaseSchema() {
    try {
        console.log('🔗 Testing database connection...');
        const ok = await testConnection();
        if (!ok) {
            console.error('❌ Cannot check schema because connection failed');
            process.exit(1);
        }

        await printTableColumns('user_tasks');
        await printTableColumns('users');
        await printTableColumns('payments');

        console.log('✅ Schema check completed');
    } catch (error) {
        console.error('❌ Error checking database schema:', error);
    }
}

// Run schema check
checkDatabaseSchema();







