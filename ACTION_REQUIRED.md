# 🚨 IMPORTANT: Email Setup Required

## Current Status

✅ **Nodemailer installed** - Email functionality is ready
✅ **Admin Portal migrated to PostgreSQL** - Connected to Neon database
⚠️ **Email credentials need updating** - Gmail authentication failed

---

## 🔐 Gmail Authentication Error

The test shows: `535 5.7.8 Username and Password not accepted`

This means you need to set up a **Gmail App Password**.

---

## 📧 How to Fix Email (Step-by-Step)

### Option 1: Use Gmail (Recommended)

#### Step 1: Enable 2-Step Verification

1. Go to: https://myaccount.google.com/security
2. Click on **"2-Step Verification"**
3. Follow the steps to enable it (if not already enabled)

#### Step 2: Create App Password

1. Go to: https://myaccount.google.com/apppasswords
   - Or: Google Account → Security → 2-Step Verification → App passwords
2. Select:
   - **App**: Mail
   - **Device**: Other (Custom name)
3. Name it: `CIC Agency`
4. Click **Generate**
5. **Copy the 16-character password** (looks like: `abcd efgh ijkl mnop`)

#### Step 3: Update .env File

Open your `.env` file and update these lines:

```env
# Email Configuration
EMAIL_PROVIDER=gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-actual-email@gmail.com
SMTP_PASSWORD=abcdefghijklmnop
EMAIL_FROM=noreply@cicagency.com
```

**Important**: 
- Remove ALL spaces from the app password
- Use your actual Gmail address for `SMTP_USER`
- The app password is different from your regular Gmail password

#### Step 4: Test Email

```bash
cd backend
node test_email_config.js
```

You should see: `✅ Email sent successfully`

---

### Option 2: Use Another Email Provider

If you don't want to use Gmail, you can use:

#### SendGrid (Free tier available)

```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
```

#### Other SMTP Provider

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your-email@yourprovider.com
SMTP_PASSWORD=your-password
EMAIL_FROM=noreply@yourdomain.com
```

---

## 🗄️ Database Configuration

Your admin portal now uses PostgreSQL. Make sure your `.env` has:

```env
# Neon PostgreSQL Connection
POSTGRES_URL=postgresql://username:password@host/database
# OR
DATABASE_URL=postgresql://username:password@host/database
```

To get your connection string:
1. Go to: https://console.neon.tech/
2. Select your project
3. Go to **Dashboard → Connection Details**
4. Copy the connection string

---

## 🚀 Restart Instructions

### Stop Current Admin Portal

The admin portal is currently running with the old MySQL config. You need to restart it:

1. **Find the terminal running admin portal**
2. Press `Ctrl + C` to stop it

### Start with New Configuration

**Option A: Use the restart script**
```bash
# From the CIC GROUP directory
restart-admin.bat
```

**Option B: Manual restart**
```bash
cd admin-portal
npm start
```

### Verify Connection

Look for this message:
```
✅ Admin Portal: Database connected successfully (PostgreSQL)
```

If you see this, the admin portal is now connected to your Neon database! 🎉

---

## ✅ Final Checklist

Before testing the forgot password feature:

- [ ] Gmail 2-Step Verification enabled
- [ ] Gmail App Password created
- [ ] `.env` file updated with correct email credentials
- [ ] `.env` file has `POSTGRES_URL` or `DATABASE_URL`
- [ ] Email test passed (`node test_email_config.js`)
- [ ] Admin portal restarted with new config
- [ ] Backend server running
- [ ] Database connection successful

---

## 🧪 Testing Forgot Password

Once email is configured:

1. Go to your frontend forgot password page
2. Enter a registered email address (must be in `payment_details` table)
3. Click "Send Code"
4. Check your email for the 6-digit code
5. Enter the code and set a new password

**Note**: The email must be registered in the user's payment details. If not, the user will see an error message asking them to bind their email first.

---

## 🐛 Troubleshooting

### Email Not Sending

**Error**: `535 5.7.8 Username and Password not accepted`
- ✅ Make sure you're using an **App Password**, not your regular Gmail password
- ✅ Remove all spaces from the app password
- ✅ Verify the email address is correct

**Error**: `Email credentials not configured`
- ✅ Check that `SMTP_USER` and `SMTP_PASSWORD` are set in `.env`
- ✅ Make sure `.env` file is in the root directory (`CIC GROUP/.env`)

### Database Connection Failed

**Error**: `No database connection string found`
- ✅ Add `POSTGRES_URL` or `DATABASE_URL` to your `.env` file
- ✅ Get the connection string from Neon dashboard

**Error**: `Database connection failed`
- ✅ Verify the connection string is correct
- ✅ Check if it includes `?sslmode=require` at the end
- ✅ Make sure you copied the entire string from Neon

---

## 📞 Quick Commands Reference

```bash
# Check email configuration
cd backend
node check_email_config.js

# Test email sending
cd backend
node test_email_config.js

# Start backend
cd backend
npm start

# Start admin portal (with new PostgreSQL config)
cd admin-portal
npm start

# Or use the restart script
restart-admin.bat
```

---

## 🎯 Summary

**What's Done**:
- ✅ Nodemailer installed
- ✅ Admin portal migrated to PostgreSQL
- ✅ Database configuration updated
- ✅ Test scripts created

**What You Need to Do**:
1. Set up Gmail App Password
2. Update `.env` with email credentials
3. Verify Neon database connection string in `.env`
4. Restart admin portal
5. Test email functionality

---

**Once email is configured, everything will work perfectly! 🚀**
