const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const paymentRoutes = require('./routes/paymentRoutes');
const authRoutes = require('./routes/authRoutes');
const aiRoutes = require('./routes/aiRoutes');
const taskRoutes = require('./routes/taskRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const investmentRoutes = require('./routes/investmentRoutes');
const manualRechargeRoutes = require('./routes/manualRechargeRoutes');
const { verifyToken } = require('./controllers/authController');
const { MPESA_CONFIG, DEMO_MODE } = require('./config/mpesa');
const { testConnection, initializeDatabase } = require('./config/database');
const cron = require('node-cron');
const { resetAllUsersDailyTasks } = require('./controllers/taskController');

// Add process error handling for stability
process.on('uncaughtException', (error) => {
    console.error('🚨 Uncaught Exception:', error);
    console.log('🔄 Server will continue running...');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
    console.log('🔄 Server will continue running...');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    process.exit(0);
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    optionsSuccessStatus: 200
}));
app.use(express.json());

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/assets', express.static(path.join(__dirname, '../frontend/assets')));

// API routes
app.use('/api/mpesa', paymentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/manual-recharge', manualRechargeRoutes);

// Serve the main page (signup page as index)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/signup.html'));
});

// Serve login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Serve home page (unprotected; page fetches auth-protected data via API)
app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/home.html'));
});

// Serve payment page
app.get('/payment', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/payment.html'));
});

// Serve new responsive home
app.get('/home2', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/home2.html'));
});

// Serve clean working home
app.get('/home3', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/home3.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        port: PORT,
        demoMode: DEMO_MODE
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

// Initialize database on startup (only for non-serverless environments)
async function initializeApp() {
    console.log('🔗 Connecting to database...');
    const dbConnected = await testConnection();
    if (dbConnected) {
        await initializeDatabase();
    }

    // Validate environment variables
    const requiredEnvVars = [
        'MPESA_CONSUMER_KEY',
        'MPESA_CONSUMER_SECRET',
        'MPESA_BUSINESS_SHORT_CODE',
        'MPESA_PASSKEY',
        'JWT_SECRET'
    ];

    const missingVars = requiredEnvVars.filter(varName => {
        const value = process.env[varName];
        // Accept sandbox business short code (174379) and valid passkey
        if (varName === 'MPESA_BUSINESS_SHORT_CODE' && value === '174379') return false;
        if (varName === 'MPESA_PASSKEY' && value.length > 50) return false;
        return !value || value.includes('your_') || value.includes('sandbox_') || (varName !== 'MPESA_CONSUMER_SECRET' && value.length < 10);
    });

    if (missingVars.length > 0) {
        console.warn('⚠️  M-Pesa credentials need to be configured:', missingVars.join(', '));
        console.warn('📝 Using placeholder values - M-Pesa payments will not work until real credentials are added');
    } else {
        console.log('✅ All required environment variables are set');
    }

    // Schedule daily task reset at 12:00 AM Kenyan time (EAT - UTC+3)
    // 00:00 EAT = 21:00 UTC (9 PM UTC the previous day)
    // Cron pattern: minute hour day month weekday
    // "0 21 * * *" = 21:00 UTC every day = 00:00 EAT next day
    if (process.env.VERCEL !== '1' && !process.env.VERCEL_ENV) {
        cron.schedule('0 21 * * *', async () => {
            console.log('🕛 Midnight reset triggered (12:00 AM Kenyan time)');
            try {
                await resetAllUsersDailyTasks();
            } catch (error) {
                console.error('❌ Error in scheduled midnight reset:', error);
            }
        }, {
            timezone: 'UTC' // Run at 21:00 UTC which is 00:00 EAT
        });
        console.log('✅ Daily task reset scheduled for 12:00 AM Kenyan time (21:00 UTC)');
    }
}

// Only start server if not running on Vercel (serverless)
// Vercel will handle the serverless function execution
if (process.env.VERCEL !== '1' && !process.env.VERCEL_ENV) {
    app.listen(PORT, async () => {
        console.log(`🚀 CIC Server running on port ${PORT}`);
        console.log(`📱 Login page: http://localhost:${PORT}`);
        console.log(`🔧 Health check: http://localhost:${PORT}/api/health`);

        await initializeApp();
        console.log('✅ Real M-Pesa API mode enabled');
    });
} else {
    // Running on Vercel - initialize database on first request
    // This will be called when the serverless function is invoked
    initializeApp().catch(err => {
        console.error('Database initialization error:', err);
    });
}

module.exports = app;
