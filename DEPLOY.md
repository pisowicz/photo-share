# Photo Share App - Deployment Guide

## Quick Deploy to Render.com (Free)

### Step 1: Create Render Account
1. Go to https://render.com
2. Sign up with your email or GitHub
3. Verify your account

### Step 2: Deploy
1. In Render dashboard, click **"New +"** → **"Web Service"**
2. Choose **"Deploy from directory"**
3. Upload this entire `photo-share` folder
4. Configure:
   - **Name:** photo-share-app (or whatever you want)
   - **Runtime:** Node
   - **Build Command:** `npm install && cd frontend && npm install && npm run build && cd ..`
   - **Start Command:** `node server.js`
   - **Plan:** Free

5. Add Environment Variables:
   ```
   CLOUDINARY_CLOUD_NAME=dedyd8imi
   CLOUDINARY_API_KEY=747989251765642
   CLOUDINARY_API_SECRET=SMQDnlJwOQE0e2oUa_PzRaa60RU
   ```

6. Click **"Create Web Service"**

### Step 3: Get Your Link
- Render will give you a URL like: `https://photo-share-app.onrender.com`
- Share this link with anyone!

### Storage Limits
- **Cloudinary Free Tier:** 25 GB storage, 25 GB bandwidth/month
- **Render Free Tier:** 512 MB RAM, sleeps after 15 min inactivity (wakes on request)

This is plenty for personal/family use with hundreds of photos and videos!

### Features
- ✅ No login required for guests
- ✅ Drag & drop upload
- ✅ Album creation/management
- ✅ Photo/video support
- ✅ Delete photos
- ✅ Mobile-friendly

### Custom Domain (Optional)
Once deployed, you can add a custom domain in Render settings if you want something like `photos.yourname.com`

## Alternative: Vercel (Even Faster)
If Render is too slow, I can also deploy to Vercel which is faster but requires a slightly different setup.

## Need Help?
If you get stuck, I can walk you through it step by step!
