# ✅ Deployment Checklist

## Current Status: Preparing for GitHub

### ✅ Step 1: Git Setup (In Progress)
- [x] Git repository initialized
- [ ] Git user configured (needs your email/name)
- [ ] Files committed locally
- [ ] GitHub repository created
- [ ] Code pushed to GitHub

### ⏳ Step 2: Vercel Deployment (Next)
- [ ] Vercel account created
- [ ] Project imported from GitHub
- [ ] Environment variables added:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `NEXT_PUBLIC_PI_WEBSOCKET_URL`
- [ ] Deployment successful
- [ ] App tested and working

---

## Quick Commands

### Configure Git (run this first):
```bash
git config --global user.email "your-email@example.com"
git config --global user.name "Your Name"
```

### Then commit:
```bash
cd C:\Users\Robi\pillpal-app
git commit -m "PillPal app - ready for deployment"
```

### Create GitHub Repo:
1. Go to: https://github.com/new
2. Repository name: `pillpal-app`
3. Make it **PUBLIC** (required for Vercel free tier)
4. Click "Create repository"
5. Copy the commands GitHub shows you

### Push to GitHub:
```bash
git remote add origin https://github.com/YOUR_USERNAME/pillpal-app.git
git branch -M main
git push -u origin main
```

---

## Environment Variables Needed (for Vercel)

Get these from **Supabase Dashboard → Settings → API**:

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Location: Supabase Dashboard → Settings → API → Project URL

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Location: Supabase Dashboard → Settings → API → anon public key

3. **NEXT_PUBLIC_PI_WEBSOCKET_URL**
   - Value: `ws://192.168.1.45:8765`

---

## Notes

- ✅ **Pi can be OFF during deployment** - it's not needed until you try to dispense
- ✅ All code is committed locally
- ⏳ Next: Configure git user, then push to GitHub


