# Email Setup Guide for Password Reset

## Gmail Configuration

### Step 1: Enable 2-Step Verification
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Under "Signing in to Google", click **2-Step Verification**
3. Follow the prompts to enable it (you'll need your phone)

### Step 2: Generate App Password
1. Go back to [Google Account Security](https://myaccount.google.com/security)
2. Under "Signing in to Google", click **App passwords**
3. You may need to sign in again
4. Select app: **Mail**
5. Select device: **Other (Custom name)**
6. Enter name: **CIC Agency** (or any name you prefer)
7. Click **Generate**
8. **Copy the 16-character password** (it looks like: `abcd efgh ijkl mnop`)
   - ⚠️ **You can only see this password once!** Save it immediately.

### Step 3: Configure in Render
1. Go to your Render dashboard
2. Select your backend service
3. Go to **Environment** tab
4. Add these environment variables:

```
EMAIL_PROVIDER=gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_actual_email@gmail.com
SMTP_PASSWORD=abcdefghijklmnop
EMAIL_FROM=your_actual_email@gmail.com
```

**Important Notes:**
- `SMTP_USER`: Your full Gmail address (e.g., `john.doe@gmail.com`)
- `SMTP_PASSWORD`: The 16-character App Password (no spaces)
- `EMAIL_FROM`: Can be the same as `SMTP_USER` or a custom email

### Step 4: Test Email Sending
After adding the credentials, restart your Render service. The email service will automatically use these credentials.

## Alternative: Using Other Email Providers

### SendGrid (Recommended for Production)
1. Sign up at [SendGrid](https://sendgrid.com/)
2. Create an API key
3. Use these variables:
```
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key
EMAIL_FROM=noreply@yourdomain.com
```

### Custom SMTP Server
If you have your own email server:
```
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=your_email@yourdomain.com
SMTP_PASSWORD=your_password
EMAIL_FROM=noreply@yourdomain.com
```

## Troubleshooting

### "Invalid login" error
- Make sure you're using an App Password, not your regular Gmail password
- Verify 2-Step Verification is enabled
- Check that the App Password was copied correctly (no spaces)

### "Connection timeout" error
- Check that `SMTP_PORT=587` (not 465)
- Verify your firewall isn't blocking port 587

### Emails not sending
- Check Render logs for error messages
- Verify all environment variables are set correctly
- Make sure the email service is enabled (`EMAIL_PROVIDER=gmail`)

## Security Best Practices

1. **Never commit credentials to Git** - Always use environment variables
2. **Use App Passwords** - Never use your main Gmail password
3. **Rotate passwords** - Regenerate App Passwords periodically
4. **Monitor usage** - Check Gmail account activity regularly







