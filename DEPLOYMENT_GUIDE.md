# 🚀 Deployment & Git Push Guide

## ✅ What's Been Fixed

1. **Forgot Password Email** - Nodemailer installed and configured
2. **Admin Portal Database** - Migrated from MySQL to PostgreSQL (Neon)
3. **Admin Users Table** - Fixed PostgreSQL syntax for table creation

---

## 📦 Changes Made

### Backend:
- ✅ Installed `nodemailer` package
- ✅ Email service ready (needs Gmail App Password in `.env`)

### Admin Portal:
- ✅ Replaced `mysql2` with `pg` (PostgreSQL)
- ✅ Updated database configuration
- ✅ Fixed `admin_users` table creation (PostgreSQL syntax)
- ✅ Updated all SQL queries to use PostgreSQL placeholders ($1, $2, etc.)
- ✅ Removed MySQL-specific syntax (AUTO_INCREMENT, ENUM, etc.)

---

## 🔄 Restart Admin Portal

The admin portal is currently running with old code. You need to restart it:

### Step 1: Stop Current Server

In the terminal running the admin portal, press `Ctrl + C`

### Step 2: Start with New Code

```bash
cd admin-portal
npm start
```

### Step 3: Verify Success

Look for these messages:
```
✅ Admin Portal: Database connected successfully (PostgreSQL)
✅ Admin users table initialized
✅ CEO account already exists (or created)
Admin Portal running on port 3001
```

---

## 📤 Push Changes to Git

### Step 1: Check Status

```bash
cd "c:\Users\PC\Desktop\CIC GROUP"
git status
```

### Step 2: Stage All Changes

```bash
git add .
```

### Step 3: Commit Changes

```bash
git commit -m "Fix: Email service & migrate admin portal to PostgreSQL

- Install nodemailer for forgot password emails
- Migrate admin portal from MySQL to PostgreSQL (Neon)
- Fix admin_users table creation with PostgreSQL syntax
- Update all SQL queries to use PostgreSQL placeholders
- Create setup documentation and guides"
```

### Step 4: Push to Remote

```bash
git push origin main
```

Or if your branch is named differently:
```bash
git push origin master
```

---

## 🌐 Deploy Admin Portal

### Option 1: Deploy to Vercel (Recommended)

#### Prerequisites:
- Vercel account (free tier available)
- Vercel CLI installed: `npm install -g vercel`

#### Steps:

1. **Navigate to admin portal directory:**
   ```bash
   cd admin-portal
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```

4. **Set Environment Variables in Vercel Dashboard:**
   - Go to: https://vercel.com/dashboard
   - Select your project
   - Go to Settings → Environment Variables
   - Add these variables:
     ```
     POSTGRES_URL=your-neon-connection-string
     JWT_SECRET=your-jwt-secret
     NODE_ENV=production
     ```

5. **Deploy to Production:**
   ```bash
   vercel --prod
   ```

---

### Option 2: Deploy to Render

#### Steps:

1. **Go to Render Dashboard:**
   https://dashboard.render.com/

2. **Create New Web Service:**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the `admin-portal` directory

3. **Configure Service:**
   - **Name:** `cic-admin-portal`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free

4. **Add Environment Variables:**
   ```
   POSTGRES_URL=your-neon-connection-string
   JWT_SECRET=your-jwt-secret
   NODE_ENV=production
   ```

5. **Deploy:**
   - Click "Create Web Service"
   - Wait for deployment to complete

---

### Option 3: Deploy to Railway

#### Steps:

1. **Go to Railway:**
   https://railway.app/

2. **New Project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure:**
   - Root directory: `/admin-portal`
   - Build command: `npm install`
   - Start command: `npm start`

4. **Add Environment Variables:**
   ```
   POSTGRES_URL=your-neon-connection-string
   JWT_SECRET=your-jwt-secret
   NODE_ENV=production
   ```

5. **Deploy:**
   - Railway will automatically deploy

---

## 🔐 Environment Variables for Production

Make sure these are set in your deployment platform:

```env
# Database (Neon PostgreSQL)
POSTGRES_URL=postgresql://username:password@host/database

# JWT Secret (use a strong random string)
JWT_SECRET=your-super-secret-production-key

# Node Environment
NODE_ENV=production

# Optional: Email (if admin portal sends emails)
EMAIL_PROVIDER=gmail
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

---

## ✅ Deployment Checklist

- [ ] Admin portal restarted locally and working
- [ ] Database connection successful (PostgreSQL)
- [ ] Admin users table created
- [ ] CEO account accessible (username: ceo, password: CEO@2024)
- [ ] All changes committed to git
- [ ] Changes pushed to remote repository
- [ ] Environment variables configured in deployment platform
- [ ] Admin portal deployed successfully
- [ ] Production URL accessible
- [ ] Login working on production

---

## 🧪 Test Production Deployment

1. **Access your admin portal URL**
2. **Login with CEO account:**
   - Username: `ceo`
   - Password: `CEO@2024`
3. **Verify dashboard loads**
4. **Check database connection** (should show users, payments, etc.)
5. **Create a test admin account** (to verify registration)

---

## 📝 Post-Deployment

### Change CEO Password

After first login, change the default CEO password:

1. Login as CEO
2. Go to Profile/Settings
3. Change password from `CEO@2024` to something secure

### Update Frontend

If your frontend needs to connect to the deployed admin portal:

1. Update API endpoints in frontend config
2. Replace `localhost:3001` with your production URL
3. Redeploy frontend

---

## 🐛 Troubleshooting Deployment

### Database Connection Fails

- ✅ Verify `POSTGRES_URL` is set correctly
- ✅ Check Neon database is accessible from deployment platform
- ✅ Ensure connection string includes `?sslmode=require`

### Admin Users Table Not Created

- ✅ Check deployment logs for errors
- ✅ Verify `update_updated_at_column()` function exists in database
- ✅ Run the backend's `initializeDatabase()` first (it creates the function)

### JWT Errors

- ✅ Ensure `JWT_SECRET` is set in environment variables
- ✅ Use the same secret across all deployments

---

## 📞 Support

If you encounter issues:

1. Check deployment platform logs
2. Verify all environment variables are set
3. Test database connection separately
4. Review `ACTION_REQUIRED.md` for setup steps

---

**Ready to deploy! 🚀**
