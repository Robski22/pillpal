# 🚀 Quick Deployment Steps for PillPal

## Prerequisites
- ✅ GitHub account (free)
- ✅ Vercel account (free - sign up at vercel.com)

---

## Step 1: Push Code to GitHub

### If you haven't initialized git yet:

1. Open terminal in your project folder:
   ```bash
   cd C:\Users\Robi\pillpal-app
   git init
   ```

2. Create `.gitignore` (should already exist):
   - Make sure it includes `.env.local` and `.env`

3. Add and commit files:
   ```bash
   git add .
   git commit -m "PillPal app - ready for deployment"
   ```

### Create GitHub Repository:

1. Go to https://github.com/new
2. Repository name: `pillpal-app`
3. **Make it PUBLIC** (required for Vercel free tier)
4. Click "Create repository"
5. Copy the commands GitHub shows you

6. Run these commands in your terminal:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/pillpal-app.git
   git branch -M main
   git push -u origin main
   ```
   (Replace `YOUR_USERNAME` with your GitHub username)

---

## Step 2: Deploy to Vercel

### 2.1: Sign Up for Vercel

1. Go to https://vercel.com
2. Click "Sign Up"
3. Choose "Continue with GitHub"
4. Authorize Vercel

### 2.2: Import Project

1. Click "Add New..." → "Project"
2. Find your `pillpal-app` repository
3. Click "Import"

### 2.3: Add Environment Variables (IMPORTANT!)

**Before clicking "Deploy", add these environment variables:**

Click "Environment Variables" and add:

**Variable 1:**
- Name: `NEXT_PUBLIC_SUPABASE_URL`
- Value: (Your Supabase URL - get from Supabase Dashboard → Settings → API)
- Environment: Select all (Production, Preview, Development)

**Variable 2:**
- Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Value: (Your Supabase Anon Key - get from Supabase Dashboard → Settings → API)
- Environment: Select all (Production, Preview, Development)

**Variable 3:**
- Name: `NEXT_PUBLIC_PI_WEBSOCKET_URL`
- Value: `ws://192.168.1.45:8765`
- Environment: Select all (Production, Preview, Development)

⚠️ **Note:** Pi connection only works on local network. For remote access, see full DEPLOYMENT_GUIDE.md

Click "Save" after adding all variables.

### 2.4: Deploy

1. Framework Preset: Should be "Next.js" (auto-detected)
2. Click "Deploy" 🚀
3. Wait 2-5 minutes for build to complete

---

## Step 3: Test Your App

1. After deployment, click the deployment URL (e.g., `https://pillpal-app-xyz.vercel.app`)
2. Test login
3. Check dashboard loads
4. Test features

---

## ✅ Done!

Your app is now:
- ✅ Live on the internet
- ✅ Accessible from anywhere
- ✅ Auto-deploys on every git push

**To update your app:**
1. Make changes locally
2. Test with `npm run dev`
3. Commit and push:
   ```bash
   git add .
   git commit -m "Your update message"
   git push
   ```
4. Vercel automatically deploys! 🎉

---

## 🔒 Important Notes

### Pi WebSocket Connection

The Pi WebSocket (`ws://192.168.1.45:8765`) only works when:
- You're on the same Wi-Fi network as your Pi
- The Pi server is running

For remote access, you'll need:
- VPN connection to your home network, OR
- A WebSocket tunnel service (like ngrok or Cloudflare Tunnel)

See `DEPLOYMENT_GUIDE.md` for detailed remote access setup.

### Security

- ✅ Never commit `.env.local` to GitHub
- ✅ Always add environment variables in Vercel dashboard
- ✅ Use Supabase RLS policies for database security

---

## 📚 Full Guide

For detailed deployment instructions, troubleshooting, and advanced features:
- See `DEPLOYMENT_GUIDE.md`

---

## 🐛 Troubleshooting

### Build Fails?
- Check Vercel build logs
- Verify all environment variables are added
- Check for TypeScript errors

### App Doesn't Load?
- Check deployment URL
- Verify Supabase credentials in environment variables
- Check browser console for errors

### Can't Connect to Pi?
- Make sure you're on same Wi-Fi network
- Check Pi server is running (`python3 pi_server_pca9685.py`)
- For remote access, see DEPLOYMENT_GUIDE.md





