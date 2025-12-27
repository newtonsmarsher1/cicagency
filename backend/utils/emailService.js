const nodemailer = require('nodemailer');

// Email configuration from environment variables
const EMAIL_CONFIG = {
    provider: process.env.EMAIL_PROVIDER || 'gmail', // 'gmail', 'smtp', 'sendgrid', 'none'
    
    // Gmail/SMTP Configuration
    smtp_host: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtp_port: parseInt(process.env.SMTP_PORT) || 587,
    smtp_user: process.env.SMTP_USER || process.env.EMAIL_USER,
    smtp_password: (process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD)?.toString().replace(/\s/g, '') || null, // Remove spaces from App Password
    smtp_from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@cicagency.com',
    
    // SendGrid Configuration (Alternative)
    sendgrid_api_key: process.env.SENDGRID_API_KEY,
    
    // Development mode
    dev_mode: process.env.NODE_ENV === 'development'
};

/**
 * Create email transporter based on provider
 */
function createTransporter() {
    // If no email provider is configured, return null
    if (!EMAIL_CONFIG.provider || EMAIL_CONFIG.provider === 'none') {
        return null;
    }
    
    switch (EMAIL_CONFIG.provider.toLowerCase()) {
        case 'gmail':
        case 'smtp':
            if (!EMAIL_CONFIG.smtp_user || !EMAIL_CONFIG.smtp_password) {
                console.warn('⚠️ Email credentials not configured. Email sending will be disabled.');
                return null;
            }
            
            return nodemailer.createTransport({
                host: EMAIL_CONFIG.smtp_host,
                port: EMAIL_CONFIG.smtp_port,
                secure: EMAIL_CONFIG.smtp_port === 465, // true for 465, false for other ports
                auth: {
                    user: EMAIL_CONFIG.smtp_user,
                    pass: EMAIL_CONFIG.smtp_password
                }
            });
            
        case 'sendgrid':
            if (!EMAIL_CONFIG.sendgrid_api_key) {
                console.warn('⚠️ SendGrid API key not configured. Email sending will be disabled.');
                return null;
            }
            
            // SendGrid uses SMTP with API key as password
            return nodemailer.createTransport({
                host: 'smtp.sendgrid.net',
                port: 587,
                secure: false,
                auth: {
                    user: 'apikey',
                    pass: EMAIL_CONFIG.sendgrid_api_key
                }
            });
            
        default:
            console.warn(`⚠️ Email provider "${EMAIL_CONFIG.provider}" not supported.`);
            return null;
    }
}

/**
 * Send email
 */
async function sendEmail(to, subject, html, text = null) {
    // If no email provider is configured, log and return (for development)
    if (!EMAIL_CONFIG.provider || EMAIL_CONFIG.provider === 'none') {
        console.log(`📧 [EMAIL NOT CONFIGURED] Would send to ${to}:`);
        console.log(`   Subject: ${subject}`);
        console.log(`   Body: ${text || html}`);
        return { 
            success: false, 
            message: 'Email service not configured. Please configure EMAIL_PROVIDER in environment variables.',
            provider: null 
        };
    }
    
    // Check if credentials are provided
    if (EMAIL_CONFIG.provider.toLowerCase() === 'gmail' || EMAIL_CONFIG.provider.toLowerCase() === 'smtp') {
        if (!EMAIL_CONFIG.smtp_user || !EMAIL_CONFIG.smtp_password) {
            console.error('❌ Email credentials missing. SMTP_USER and SMTP_PASSWORD must be set.');
            return {
                success: false,
                message: 'Email credentials not configured. Please set SMTP_USER and SMTP_PASSWORD in environment variables.',
                provider: null
            };
        }
    }
    
    const transporter = createTransporter();
    if (!transporter) {
        console.error('❌ Failed to create email transporter. Check your email configuration.');
        return { 
            success: false, 
            message: 'Email transporter not available. Check email configuration.',
            provider: null 
        };
    }
    
    try {
        const mailOptions = {
            from: EMAIL_CONFIG.smtp_from,
            to: to,
            subject: subject,
            html: html,
            text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text version
        };
        
        const info = await transporter.sendMail(mailOptions);
        
        console.log(`✅ Email sent successfully to ${to}`);
        return { 
            success: true, 
            provider: EMAIL_CONFIG.provider,
            messageId: info.messageId 
        };
    } catch (error) {
        console.error('❌ Email sending error:', error);
        return { 
            success: false, 
            error: error.message,
            provider: EMAIL_CONFIG.provider 
        };
    }
}

/**
 * Send password reset verification code via email
 */
async function sendPasswordResetCode(email, code, userName = 'User') {
    const subject = 'CIC Password Reset Verification Code';
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .container {
                    background: #f9f9f9;
                    border-radius: 10px;
                    padding: 30px;
                    border: 2px solid #00ff88;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                }
                .logo {
                    font-size: 32px;
                    font-weight: bold;
                    color: #00ff88;
                    margin-bottom: 10px;
                }
                .code-box {
                    background: white;
                    border: 3px solid #00ff88;
                    border-radius: 10px;
                    padding: 20px;
                    text-align: center;
                    margin: 30px 0;
                }
                .code {
                    font-size: 36px;
                    font-weight: bold;
                    color: #00ff88;
                    letter-spacing: 8px;
                    font-family: 'Courier New', monospace;
                }
                .warning {
                    background: #fff3cd;
                    border-left: 4px solid #ffc107;
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 5px;
                }
                .footer {
                    text-align: center;
                    margin-top: 30px;
                    color: #666;
                    font-size: 12px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">CIC</div>
                    <h2>Password Reset Request</h2>
                </div>
                
                <p>Hello ${userName},</p>
                
                <p>You have requested to reset your password for your CIC account. Use the verification code below to proceed:</p>
                
                <div class="code-box">
                    <div class="code">${code}</div>
                </div>
                
                <p>This code will expire in <strong>10 minutes</strong>.</p>
                
                <div class="warning">
                    <strong>⚠️ Security Notice:</strong> If you did not request this password reset, please ignore this email. Do not share this code with anyone.
                </div>
                
                <p>If you have any questions, please contact our support team.</p>
                
                <div class="footer">
                    <p>© ${new Date().getFullYear()} CIC Agency. All rights reserved.</p>
                    <p>This is an automated message. Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    const text = `
CIC Password Reset Verification Code

Hello ${userName},

You have requested to reset your password for your CIC account.

Your verification code is: ${code}

This code will expire in 10 minutes.

⚠️ Security Notice: If you did not request this password reset, please ignore this email. Do not share this code with anyone.

If you have any questions, please contact our support team.

© ${new Date().getFullYear()} CIC Agency. All rights reserved.
This is an automated message. Please do not reply to this email.
    `;
    
    return await sendEmail(email, subject, html, text);
}

module.exports = {
    sendEmail,
    sendPasswordResetCode
};

