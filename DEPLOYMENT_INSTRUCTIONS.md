# Deployment Instructions for Render and Vercel

## 🚀 Deploy to Vercel

### Prerequisites:
- Vercel account (sign up at https://vercel.com)
- GitHub repository connected

### Steps:

1. **Install Vercel CLI (optional but recommended):**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy from project root:**
   ```bash
   vercel
   ```

4. **Set Environment Variables in Vercel Dashboard:**
   - Go to: https://vercel.com/dashboard
   - Select your project: `cicagency`
   - Go to **Settings** → **Environment Variables**
   - Add these variables:
     ```
     POSTGRES_URL=your-postgres-connection-string
     JWT_SECRET=your-jwt-secret-key
     NODE_ENV=production
     MPESA_CONSUMER_KEY=your-mpesa-consumer-key
     MPESA_CONSUMER_SECRET=your-mpesa-consumer-secret
     MPESA_BUSINESS_SHORT_CODE=your-business-short-code
     MPESA_PASSKEY=your-mpesa-passkey
     VERCEL=1
     ```

5. **Deploy to Production:**
   ```bash
   vercel --prod
   ```

### Vercel Configuration:
- **Framework Preset:** Other
- **Root Directory:** (leave empty - uses root)
- **Build Command:** (leave empty)
- **Output Directory:** `frontend`
- **Install Command:** `cd backend && npm install`

---

## 🖥️ Deploy to Render

### Prerequisites:
- Render account (sign up at https://render.com)
- GitHub repository connected

### Steps:

1. **Go to Render Dashboard:**
   https://dashboard.render.com/

2. **Create New Web Service:**
   - Click **"New +"** → **"Web Service"**
   - Connect your GitHub repository: `newtonsmarsher1/cicagency`
   - Select the repository

3. **Configure Service:**
   - **Name:** `cicagency-backend`
   - **Environment:** `Node`
   - **Region:** Choose closest to your users
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free (or upgrade for better performance)

4. **Add Environment Variables:**
   In the Render dashboard, go to **Environment** tab and add:
   ```
   NODE_ENV=production
   PORT=10000
   POSTGRES_URL=your-postgres-connection-string
   JWT_SECRET=your-jwt-secret-key
   MPESA_CONSUMER_KEY=your-mpesa-consumer-key
   MPESA_CONSUMER_SECRET=your-mpesa-consumer-secret
   MPESA_BUSINESS_SHORT_CODE=your-business-short-code
   MPESA_PASSKEY=your-mpesa-passkey
   ```

5. **Deploy:**
   - Click **"Create Web Service"**
   - Render will automatically deploy from your GitHub repository
   - Wait for deployment to complete (usually 5-10 minutes)

6. **Update Frontend API Configuration:**
   After deployment, update your frontend API configuration to point to your Render URL:
   - Render will provide a URL like: `https://cicagency-backend.onrender.com`
   - Update `frontend/js/api-config.js` or your API base URL

---

## 📝 Alternative: Use render.yaml

If you prefer using the `render.yaml` file:

1. **Go to Render Dashboard:**
   https://dashboard.render.com/

2. **Create New Blueprint:**
   - Click **"New +"** → **"Blueprint"**
   - Connect your GitHub repository
   - Render will automatically detect `render.yaml` and configure the service

3. **Add Environment Variables:**
   - Go to your service → **Environment** tab
   - Add all required environment variables (same as above)

---

## 🔄 Continuous Deployment

Both platforms support automatic deployments:
- **Vercel:** Automatically deploys on every push to `main` branch
- **Render:** Automatically deploys on every push to `main` branch (if enabled)

---

## 🌐 Frontend Deployment

### Option 1: Vercel (Recommended for Frontend)
The `vercel.json` is configured to serve the frontend from the `frontend` directory. Vercel will automatically:
- Serve static files from `frontend/`
- Route `/api/*` requests to the serverless function in `api/index.js`

### Option 2: Render Static Site
1. Create a new **Static Site** in Render
2. Connect your GitHub repository
3. **Build Command:** (leave empty)
4. **Publish Directory:** `frontend`
5. Deploy

---

## 🔍 Verify Deployment

### Vercel:
- Check your Vercel dashboard for deployment status
- Visit: `https://your-project.vercel.app`
- Test API: `https://your-project.vercel.app/api/health`

### Render:
- Check your Render dashboard for deployment status
- Visit: `https://your-service.onrender.com`
- Test API: `https://your-service.onrender.com/api/health`

---

## 🐛 Troubleshooting

### Vercel Issues:
- **API routes not working:** Check that `api/index.js` exists and `vercel.json` has correct rewrites
- **Environment variables:** Ensure all are set in Vercel dashboard
- **Build errors:** Check build logs in Vercel dashboard

### Render Issues:
- **Service crashes:** Check logs in Render dashboard
- **Database connection:** Verify `POSTGRES_URL` is correct
- **Port issues:** Render uses port 10000 by default, but your app should use `process.env.PORT`

---

## 📚 Additional Resources

- Vercel Docs: https://vercel.com/docs
- Render Docs: https://render.com/docs
- Your Repository: https://github.com/newtonsmarsher1/cicagency

