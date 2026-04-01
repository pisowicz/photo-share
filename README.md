# Photo Share App

A simple, free photo and video sharing website. Anyone with the link can upload and view photos without needing an account.

## Features

- 📸 Drag & drop upload (photos + videos)
- 🎨 Clean Google Photos-style gallery
- 🔗 Shareable link — no login required
- 💾 Cloud storage via Cloudinary (free tier)
- 📱 Mobile-friendly design
- 🎥 Video support with thumbnails

## Setup Instructions

### 1. Sign up for Cloudinary (Free)

1. Go to https://cloudinary.com
2. Click "Sign Up for Free"
3. Verify your email
4. Go to Dashboard → copy your credentials:
   - Cloud name
   - API Key
   - API Secret

### 2. Configure the App

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Cloudinary credentials:
   ```
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

### 3. Start the App

**Terminal 1 - Start the backend:**
```bash
cd /home/brian/.openclaw/workspace/photo-share
node server.js
```

**Terminal 2 - Start the frontend:**
```bash
cd /home/brian/.openclaw/workspace/photo-share/frontend
npm run dev
```

### 4. Access the App

- Open http://localhost:5173 in your browser
- Upload photos/videos
- Share the link with guests

## Cloudinary Free Tier Limits

- 25 GB storage
- 25 GB bandwidth per month
- Generous transformations

This is plenty for personal/family use!

## Making It Public (Optional)

To share outside your local network:

1. **Option A: Deploy to Vercel/Netlify (Free)**
   - Push code to GitHub
   - Connect to Vercel or Netlify
   - They provide a public URL

2. **Option B: Use ngrok (Temporary)**
   ```bash
   npx ngrok http 5173
   ```
   - Gives you a temporary public URL
   - Good for quick sharing

3. **Option C: Run on a VPS (Always-on)**
   - Deploy to DigitalOcean, AWS, etc.
   - Costs ~$5/month

## Customization

- Change the title in `frontend/src/App.jsx`
- Adjust colors in `frontend/src/App.css`
- Modify upload limits in `server.js`

## Troubleshooting

**"Upload failed" error:**
- Check that your Cloudinary credentials are correct
- Make sure the backend server is running

**Can't access from other devices:**
- Use your computer's local IP (e.g., http://192.168.1.100:5173)
- Or deploy to a hosting service

**Videos not playing:**
- Make sure video format is supported (MP4, MOV, WebM)
- Check browser console for errors
