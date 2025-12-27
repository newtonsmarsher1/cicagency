# 🚀 Quick Start Guide - Admin Portal

## Step 1: Install Dependencies

```bash
cd admin-portal
npm install
```

## Step 2: Verify Database Configuration

Make sure your `.env` file in the **root directory** (`CIC GROUP/.env`) contains:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=cic
DB_USER=root
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
```

## Step 3: Start the Server

```bash
npm start
```

Or for development with auto-restart:

```bash
npm run dev
```

## Step 4: Access the Portal

Open your browser and go to:

**http://localhost:2003**

You will see the **Login Page** (this is the index page).

## Step 5: Login as CEO

Use the default CEO credentials:
- **Username**: `ceo`
- **Password**: `CEO@2024`

## Step 6: Change Password (IMPORTANT!)

1. After logging in, click **"Profile Settings"** in the navigation
2. Scroll to **"Change Password"** section
3. Enter current password: `CEO@2024`
4. Enter your new secure password
5. Click **"Change Password"**

## What Happens on Server Start?

1. ✅ Server starts on port 2003
2. ✅ Database connection is tested
3. ✅ `admin_users` table is created automatically
4. ✅ Default CEO account is created (if it doesn't exist)

## Troubleshooting

### "Database connection failed"
- Check MySQL is running
- Verify `.env` file has correct credentials
- Ensure database `cic` exists

### "Port 2003 already in use"
- Stop other application using port 2003
- Or change port in `server.js` (line 13)

### "Cannot login"
- Make sure you're using: username `ceo`, password `CEO@2024`
- Check browser console for errors
- Verify JWT_SECRET is set in `.env`

## Next Steps

1. ✅ Login as CEO
2. ✅ Change password
3. ✅ Register admin assistants at `/register`
4. ✅ Approve assistants from "Pending Approvals" page
5. ✅ Start managing the system!

---

**That's it! You're ready to go! 🎉**




