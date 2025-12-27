const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const adminRoutes = require('./routes/adminRoutes');
const manualRechargeRoutes = require('./routes/manualRechargeRoutes');
const authRoutes = require('./routes/authRoutes');
const { testConnection } = require('./config/database');
const { initializeAdminUsersTable } = require('./controllers/authController');
const { verifyToken } = require('./controllers/authController');

const app = express();
const PORT = process.env.PORT || 2003;

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', verifyToken, adminRoutes); // Protect admin routes
app.use('/api/manual-recharge', verifyToken, manualRechargeRoutes); // Protect manual recharge routes

// Public pages - Login is the index page (define BEFORE static files)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/login.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/register.html'));
});

// Protected dashboard - serve HTML, authentication handled client-side
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/index.html'));
});

// Serve static files from frontend (AFTER routes to ensure routes take precedence)
app.use(express.static(path.join(__dirname, 'frontend')));
app.use('/assets', express.static(path.join(__dirname, 'frontend/assets')));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        port: PORT,
        service: 'Admin Portal'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err);
    console.error('Error stack:', err.stack);
    console.error('Request URL:', req.url);
    console.error('Request method:', req.method);

    // Don't send error details in production, but log them
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

// Start server
app.listen(PORT, async () => {
    console.log('\n========================================');
    console.log('🚀 Admin Portal Server Starting...');
    console.log('========================================\n');

    // Test database connection
    console.log('🔗 Connecting to database...');
    const dbConnected = await testConnection();

    if (dbConnected) {
        // Initialize admin users table
        console.log('👥 Initializing admin users table...');
        await initializeAdminUsersTable();

        console.log('\n========================================');
        console.log('✅ Server Started Successfully!');
        console.log('========================================');
        console.log(`\n📍 Access Points:`);
        console.log(`   🔐 Login Page:     http://localhost:${PORT}`);
        console.log(`   📊 Dashboard:      http://localhost:${PORT}/dashboard`);
        console.log(`   📝 Register:       http://localhost:${PORT}/register`);
        console.log(`   🔧 Health Check:   http://localhost:${PORT}/api/health`);
        console.log(`\n👤 Default CEO Account:`);
        console.log(`   Username: ceo`);
        console.log(`   Password: CEO@2024`);
        console.log(`\n⚠️  IMPORTANT: Change the default CEO password after first login!`);
        console.log('\n========================================\n');
    } else {
        console.log('\n❌ Database connection failed. Please check your .env file and MySQL server.');
        console.log('   Server is running but database features may not work.\n');
    }
});

module.exports = app;

