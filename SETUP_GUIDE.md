# CIC GROUP - Setup Guide

## 🔧 Configuration Issues Fixed

### 1. ✅ Forgot Password Email Not Sending
**Problem**: The `nodemailer` package was not installed in the backend.

**Solution**: 
- Installed `nodemailer` package
- Email service is already configured in `backend/utils/emailService.js`

### 2. ✅ Admin Portal Database Connection
**Problem**: Admin portal was using MySQL while the main backend uses PostgreSQL (Neon).

**Solution**:
- Updated admin portal to use PostgreSQL (`pg` package)
- Both backend and admin portal now connect to the same Neon database
- Created a compatibility wrapper to maintain existing code structure

---

## 📋 Environment Variables Setup

You need to configure your `.env` file with the following variables:

### Required Variables:

```env
# Database Configuration (Neon PostgreSQL)
POSTGRES_URL=postgresql://username:password@host/database
# OR
DATABASE_URL=postgresql://username:password@host/database

# JWT Secret (change this to a random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Email Configuration (for forgot password feature)
EMAIL_PROVIDER=gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password
EMAIL_FROM=noreply@cicagency.com

# Server Configuration
PORT=2002
NODE_ENV=development
```

---

## 📧 Gmail App Password Setup

To enable forgot password emails, you need to set up a Gmail App Password:

### Steps:

1. **Go to your Google Account**: https://myaccount.google.com/
2. **Enable 2-Step Verification** (if not already enabled):
   - Go to Security → 2-Step Verification
   - Follow the setup process

3. **Create an App Password**:
   - Go to Security → 2-Step Verification → App passwords
   - Select "Mail" and "Other (Custom name)"
   - Name it "CIC Agency"
   - Click "Generate"
   - Copy the 16-character password (it will look like: `xxxx xxxx xxxx xxxx`)

4. **Add to .env file**:
   ```env
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=xxxxxxxxxxxx  # Remove spaces from the app password
   ```

---

## 🗄️ Neon Database Setup

### Get Your Connection String:

1. **Log in to Neon Console**: https://console.neon.tech/
2. **Select your project**
3. **Go to Dashboard → Connection Details**
4. **Copy the connection string** (it will look like):
   ```
   postgresql://username:password@ep-xxxxx.region.aws.neon.tech/database?sslmode=require
   ```

5. **Add to .env file**:
   ```env
   POSTGRES_URL=postgresql://username:password@ep-xxxxx.region.aws.neon.tech/database?sslmode=require
   ```

---

## 🚀 Running the Application

### 1. Start the Backend:
```bash
cd backend
npm start
# OR for development with auto-reload:
npm run dev
```

### 2. Start the Admin Portal:
```bash
cd admin-portal
npm start
# OR for development with auto-reload:
npm run dev
```

---

## 🧪 Testing Email Configuration

Run this test to verify your email setup:

```bash
cd backend
node test_email_config.js
```

**Expected Output**:
```
--- Email Configuration Test ---
EMAIL_PROVIDER: gmail
SMTP_USER/EMAIL_USER: Set (***)
SMTP_PASSWORD/EMAIL_PASSWORD: Set (***)

--- Attempting to send test email ---
✅ Email sent successfully to test@example.com
```

---

## 🔍 Troubleshooting

### Email Not Sending:

1. **Check environment variables**:
   ```bash
   cd backend
   node test_email_config.js
   ```

2. **Common issues**:
   - ❌ App Password has spaces → Remove all spaces
   - ❌ Using regular Gmail password → Must use App Password
   - ❌ 2-Step Verification not enabled → Enable it first
   - ❌ Wrong email in SMTP_USER → Must match the Gmail account

### Database Connection Issues:

1. **Check connection string**:
   - Make sure `POSTGRES_URL` or `DATABASE_URL` is set in `.env`
   - Verify the connection string is correct from Neon dashboard

2. **Test connection**:
   - Start the backend and look for: `✅ Database connected successfully`
   - Start admin portal and look for: `✅ Admin Portal: Database connected successfully (PostgreSQL)`

3. **Common issues**:
   - ❌ Missing connection string → Add to `.env`
   - ❌ Wrong credentials → Copy fresh from Neon dashboard
   - ❌ SSL issues → Connection string should include `?sslmode=require`

---

## 📝 Notes

- Both backend and admin portal now use the **same PostgreSQL database** on Neon
- The forgot password feature sends a **6-digit verification code** to the user's email
- Codes expire after **10 minutes**
- In development mode, the verification code is also logged to the console for testing

---

## 🎯 Next Steps

1. ✅ Configure your `.env` file with all required variables
2. ✅ Set up Gmail App Password
3. ✅ Get Neon database connection string
4. ✅ Run `npm install` in both `backend` and `admin-portal` directories (already done)
5. ✅ Test email configuration with `node test_email_config.js`
6. ✅ Start both servers and verify connections
7. ✅ Test the forgot password feature from the frontend

---

## 📞 Support

If you encounter any issues, check:
- Console logs for detailed error messages
- `.env` file is in the root directory (`CIC GROUP/.env`)
- All environment variables are set correctly
- No extra spaces in passwords or connection strings
