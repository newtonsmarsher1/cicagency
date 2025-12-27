require('dotenv').config();
const { Pool } = require('pg');

async function testConnection() {
    const connectionString = process.env.POSTGRES_URL;
    
    if (!connectionString) {
        console.error('❌ POSTGRES_URL not found in .env file');
        return;
    }
    
    console.log('🔍 Testing database connection...\n');
    console.log('Connection string:', connectionString.replace(/:[^:@]+@/, ':****@'));
    
    const pool = new Pool({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
        console.log('\n✅ Database connection successful!');
        console.log('   Current time:', result.rows[0].current_time);
        console.log('   PostgreSQL version:', result.rows[0].pg_version.split(',')[0]);
        console.log('\n✅ Your database is ready to use!');
        console.log('   You can now run: npm start');
    } catch (error) {
        console.error('\n❌ Database connection failed:');
        console.error('   Error:', error.message);
        
        if (error.code === 'ENOTFOUND') {
            console.error('\n💡 Hostname not found. Possible reasons:');
            console.error('   1. Supabase project is paused - reactivate it in dashboard');
            console.error('   2. Project was deleted - create a new one');
            console.error('   3. Hostname is incorrect - get fresh connection string');
        } else if (error.code === '28P01') {
            console.error('\n💡 Authentication failed. Check:');
            console.error('   1. Password is correct');
            console.error('   2. Password is URL-encoded (@ = %40)');
        }
    } finally {
        await pool.end();
    }
}

testConnection();








