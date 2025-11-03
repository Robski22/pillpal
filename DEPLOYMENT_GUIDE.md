# 🚀 PillPal Deployment Guide - Vercel

This guide will help you deploy your PillPal web app to Vercel so you can access it from anywhere.

---

## 📋 Prerequisites

1. ✅ GitHub account (free)
2. ✅ Vercel account (free)
3. ✅ Your Supabase credentials ready
4. ✅ Your project code (already done!)

---

## 🔧 Step 1: Prepare Your Code

### 1.1: Make Pi URL Configurable

The Pi WebSocket URL is currently hardcoded. We'll make it configurable:

**File:** `src/lib/pi-websocket.ts`

Update the Pi URL to use an environment variable with a fallback:

```typescript
const PI_URL = process.env.NEXT_PUBLIC_PI_WEBSOCKET_URL || 'ws://192.168.1.45:8765'
```

*(This will be done automatically)*

### 1.2: Create `.env.example` File

This helps others know what environment variables are needed:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_PI_WEBSOCKET_URL=ws://192.168.1.45:8765
```

*(This will be created automatically)*

---

## 📦 Step 2: Push Code to GitHub

### 2.1: Initialize Git Repository (if not already done)

Open terminal in your project folder:
```bash
cd C:\Users\Robi\pillpal-app
git init
```

### 2.2: Create `.gitignore` (if not exists)

Make sure `.gitignore` includes:
```
.env.local
.env
node_modules
.next
.vercel
```

### 2.3: Add and Commit Files

```bash
git add .
git commit -m "Initial commit - PillPal app ready for deployment"
```

### 2.4: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `pillpal-app` (or any name you like)
3. **Leave it as PUBLIC** (Vercel needs public repos on free tier)
4. Click "Create repository"

### 2.5: Push to GitHub

Copy the commands from GitHub (they'll look like):
```bash
git remote add origin https://github.com/YOUR_USERNAME/pillpal-app.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

---

## 🌐 Step 3: Deploy to Vercel

### 3.1: Sign Up for Vercel

1. Go to https://vercel.com
2. Click "Sign Up"
3. Choose "Continue with GitHub"
4. Authorize Vercel to access your GitHub

### 3.2: Import Your Project

1. In Vercel dashboard, click "Add New..." → "Project"
2. Find your `pillpal-app` repository
3. Click "Import"

### 3.3: Configure Environment Variables

**Before clicking "Deploy", add your environment variables:**

1. Click "Environment Variables" section
2. Add these variables:

   **Variable 1:**
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: Your Supabase URL (from Supabase dashboard → Settings → API)
   - Environment: All (Production, Preview, Development)

   **Variable 2:**
   - Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Value: Your Supabase Anon Key (from Supabase dashboard → Settings → API)
   - Environment: All (Production, Preview, Development)

   **Variable 3:**
   - Name: `NEXT_PUBLIC_PI_WEBSOCKET_URL`
   - Value: `ws://192.168.1.45:8765` (your Pi's local IP)
   - Environment: All (Production, Preview, Development)

   ⚠️ **Note:** The Pi WebSocket URL uses `ws://` (not secure). This only works on the same local network. For remote access, you'll need to set up a tunnel or VPN (see Step 5).

3. Click "Save"

### 3.4: Deploy

1. Framework Preset: Should auto-detect "Next.js"
2. Root Directory: Leave as `./` (default)
3. Build Command: Should auto-detect `next build`
4. Output Directory: Should auto-detect `.next`
5. Click "Deploy" 🚀

### 3.5: Wait for Deployment

- Vercel will build and deploy your app
- Takes 2-5 minutes
- You'll see build logs in real-time
- When done, you'll get a URL like: `https://pillpal-app-xyz.vercel.app`

---

## ✅ Step 4: Test Your Deployment

### 4.1: Visit Your Deployed App

1. Click the deployment URL from Vercel dashboard
2. You should see your PillPal login page!
3. Try logging in with your Supabase credentials

### 4.2: Test Features

- ✅ Login/Signup
- ✅ Dashboard loads
- ✅ View medications
- ✅ Edit schedules

### 4.3: Pi Connection (Local Network Only)

⚠️ **Important:** The WebSocket connection to your Pi (`ws://192.168.1.45:8765`) will **ONLY work** when:
- You're on the same Wi-Fi network as your Raspberry Pi
- The Pi server is running

For remote access, see Step 5.

---

## 🔒 Step 5: Remote Pi Access (Optional but Recommended)

Currently, your Pi WebSocket is only accessible on local network. To access it remotely:

### Option 1: Use a VPN (Recommended)

1. Set up a VPN on your router (e.g., WireGuard, OpenVPN)
2. Connect to VPN from anywhere
3. Use your Pi's local IP: `ws://192.168.1.45:8765`

### Option 2: Use a WebSocket Tunnel (ngrok, Cloudflare Tunnel)

**Example with ngrok:**
```bash
# On your Pi:
ngrok http 8765
# Gives you a public URL like: ws://abc123.ngrok.io:8765
# Update NEXT_PUBLIC_PI_WEBSOCKET_URL in Vercel to this URL
```

### Option 3: Static Public IP + Port Forwarding

1. Get static IP from ISP
2. Configure router port forwarding (port 8765)
3. Update `NEXT_PUBLIC_PI_WEBSOCKET_URL` to `ws://YOUR_STATIC_IP:8765`

---

## 🔄 Step 6: Continuous Deployment

### How It Works

Vercel automatically deploys:
- ✅ Every push to `main` branch → Production
- ✅ Every pull request → Preview deployment
- ✅ All commits trigger new deployments

### Updating Your App

1. Make changes locally
2. Test with `npm run dev`
3. Commit and push:
   ```bash
   git add .
   git commit -m "Your update message"
   git push
   ```
4. Vercel automatically deploys the new version! 🎉

---

## 🌍 Step 7: Custom Domain (Optional)

### 7.1: Buy a Domain

- Namecheap, GoDaddy, Google Domains, etc.
- Cost: ~$10-15/year

### 7.2: Add Domain in Vercel

1. Go to your project in Vercel dashboard
2. Settings → Domains
3. Add your domain (e.g., `pillpal.yourdomain.com`)
4. Follow DNS instructions

### 7.3: Update DNS

- Add CNAME record pointing to Vercel
- Wait 24-48 hours for DNS propagation

---

## 📊 Monitoring & Logs

### View Logs

1. Go to Vercel dashboard → Your Project
2. Click "Deployments" tab
3. Click any deployment → "View Function Logs"

### Monitor Errors

- Vercel automatically tracks errors
- View in "Analytics" section
- Set up email alerts for errors

---

## 🐛 Troubleshooting

### "Build Failed"

1. Check build logs in Vercel
2. Common issues:
   - Missing environment variables
   - TypeScript errors
   - Missing dependencies

### "Cannot Connect to Pi"

- **Local network:** Make sure you're on same Wi-Fi
- **Remote:** Check VPN/tunnel is running
- **Pi server:** Make sure `pi_server_pca9685.py` is running

### "Supabase Error"

- Verify environment variables in Vercel
- Check Supabase dashboard → Settings → API
- Make sure RLS policies are correct

### "Page Not Found" (404)

- Check routing in Next.js app
- Make sure all pages are in `app/` directory
- Check `next.config.ts` for redirects

---

## 📝 Quick Reference

### Environment Variables (Vercel)

| Variable | Value | Where to Find |
|----------|-------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase Anon Key | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_PI_WEBSOCKET_URL` | `ws://192.168.1.45:8765` | Your Pi's IP and port |

### Useful Links

- Vercel Dashboard: https://vercel.com/dashboard
- Supabase Dashboard: https://supabase.com/dashboard
- GitHub Repository: https://github.com/YOUR_USERNAME/pillpal-app

---

## ✅ Deployment Checklist

- [ ] Code is pushed to GitHub
- [ ] Vercel account created
- [ ] Project imported to Vercel
- [ ] Environment variables added
- [ ] Deployment successful
- [ ] App loads correctly
- [ ] Login works
- [ ] Dashboard displays
- [ ] Pi connection tested (if on local network)

---

## 🎉 You're Done!

Your PillPal app is now:
- ✅ Accessible from anywhere
- ✅ Automatically deployed on every push
- ✅ Running on a fast global CDN
- ✅ Free (on Vercel's free tier)

**Next Steps:**
- Share your app URL with others
- Keep developing locally, push to deploy
- Add custom domain when ready
- Set up remote Pi access for full functionality

---

**Need Help?**
- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs
- Check your build logs for errors



