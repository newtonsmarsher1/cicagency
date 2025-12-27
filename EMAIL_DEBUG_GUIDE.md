# Email Not Sending - Debugging Guide

## Step 1: Check Render Environment Variables

Go to Render Dashboard → Your Service → Environment tab and verify these are set:

```
EMAIL_PROVIDER=gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_actual_gmail@gmail.com
SMTP_PASSWORD=ftvobuupwbnmoqal
EMAIL_FROM=your_actual_gmail@gmail.com
```

**Important:**
- Remove ALL spaces from App Password: `ftvo buup wbnm oqal` → `ftvobuupwbnmoqal`
- Replace `your_actual_gmail@gmail.com` with your real Gmail address
- Make sure there are no extra spaces or quotes

## Step 2: Check Render Logs

1. Go to Render Dashboard → Your Service → Logs
2. Try to reset password
3. Look for these messages:

### ✅ If email is working:
```
✅ Verification code sent via email to [email]
✅ Email sent successfully to [email]
```

### ❌ If email is NOT working, you'll see:
```
❌ Email credentials missing. SMTP_USER and SMTP_PASSWORD must be set.
```
**Solution:** Check environment variables are set correctly

```
⚠️ Email sending failed: Invalid login
```
**Solution:** App Password is wrong - generate a new one

```
❌ Failed to create email transporter
```
**Solution:** Check EMAIL_PROVIDER is set to 'gmail'

## Step 3: Test Email Configuration

After deploying, test the email configuration:

Visit: `https://cicagency.onrender.com/api/test-email?email=your_email@gmail.com`

This will show:
- Whether email credentials are configured
- If email sending works
- Detailed error messages

## Step 4: Common Issues & Solutions

### Issue 1: "Invalid login" or "Authentication failed"
**Cause:** Wrong App Password or regular password used
**Solution:**
1. Go to https://myaccount.google.com/apppasswords
2. Generate a NEW App Password
3. Copy it WITHOUT spaces
4. Update `SMTP_PASSWORD` in Render

### Issue 2: "Email credentials not configured"
**Cause:** Environment variables not set in Render
**Solution:**
1. Go to Render → Environment tab
2. Add ALL 6 email variables
3. Click Save
4. Restart service

### Issue 3: "Connection timeout"
**Cause:** Network/firewall issue
**Solution:**
- Check Render service is running
- Try changing SMTP_PORT to 465 (and secure: true)
- Check Gmail account isn't locked

### Issue 4: Emails go to spam
**Cause:** Gmail security settings
**Solution:**
- Check spam folder
- Mark as "Not spam"
- Add sender to contacts

## Step 5: Verify Gmail Settings

1. **2-Step Verification MUST be enabled**
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification if not already enabled

2. **"Less secure app access" is NOT needed**
   - App Passwords work with 2-Step Verification
   - Don't enable "Less secure app access"

3. **Check for account locks**
   - Go to https://myaccount.google.com/security
   - Check "Recent security activity"
   - If account is locked, unlock it

## Step 6: Check Backend Logs for Detailed Errors

The backend now logs detailed information:

```
📧 Creating email transporter with:
   Host: smtp.gmail.com
   Port: 587
   User: your_email@gmail.com
   Password: ***oqal
```

If you see errors, they'll show exactly what's wrong.

## Quick Fix Checklist

- [ ] All 6 email environment variables are set in Render
- [ ] App Password has NO spaces (`ftvobuupwbnmoqal` not `ftvo buup wbnm oqal`)
- [ ] SMTP_USER is your full Gmail address
- [ ] EMAIL_FROM matches SMTP_USER
- [ ] 2-Step Verification is enabled on Gmail
- [ ] Service restarted after adding variables
- [ ] Checked Render logs for errors
- [ ] Tested with `/api/test-email` endpoint

## Still Not Working?

1. **Check Render Logs** - Look for specific error messages
2. **Test Email Endpoint** - Visit `/api/test-email?email=your_email@gmail.com`
3. **Generate New App Password** - Sometimes old ones expire
4. **Verify Email in Payment Details** - Make sure user has bound their email

## Need More Help?

Check the logs and share:
- The exact error message from Render logs
- The response from `/api/test-email` endpoint
- Screenshot of your Render environment variables (hide passwords!)





