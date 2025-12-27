const { pool } = require('./admin-portal/config/database');

async function checkSchema() {
    try {
        const [columns] = await pool.execute(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users'
            ORDER BY column_name
        `);
        console.log(JSON.stringify(columns.map(c => c.column_name), null, 2));
        process.exit(0);
    } catch (error) {
        console.error('Error checking schema:', error);
        process.exit(1);
    }
}

checkSchema();
