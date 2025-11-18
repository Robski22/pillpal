# Fix: Supabase Environment Variables Missing

## Problem
Error: "supabaseUrl is required"
- Your app needs Supabase credentials to work
- These are stored in environment variables
- They're missing on your local machine

## Solution: Create .env.local File

---

## ✅ Step 1: Create .env.local File

1. **In VS Code**, in your project root (`PillApp/pillpal/`)
2. **Create new file** named: `.env.local`
3. **Add these lines:**

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

---

## ✅ Step 2: Get Your Supabase Credentials

### Option A: From Your Deployed App (Vercel)

1. Go to **Vercel Dashboard**
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Find:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. **Copy the values**

### Option B: From Supabase Dashboard

1. Go to **https://supabase.com**
2. Login to your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## ✅ Step 3: Add Values to .env.local

**Replace the placeholders:**

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk2NzI4MCwiZXhwIjoxOTU0NTQzMjgwfQ.xxxxxxxxxxxxx
```

---

## ✅ Step 4: Restart Dev Server

**After creating .env.local:**

1. **Stop dev server:** Press `Ctrl+C` in terminal
2. **Restart:** `npm run dev`
3. **Error should be gone!** ✅

---

## 🔒 Important: Don't Commit .env.local

**Make sure `.env.local` is in `.gitignore`:**

Check `.gitignore` file - it should have:
```
.env.local
.env*.local
```

**Why?** These contain secrets - never commit them to Git!

---

## 📋 Checklist

- [ ] Created `.env.local` file
- [ ] Added `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Added `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Restarted dev server
- [ ] Error is gone
- [ ] `.env.local` is in `.gitignore`

---

## 🎯 Answer to Your Question

**"Should it be changed in local before changing at web app that is deployed?"**

**Answer:**
- **Local:** You need `.env.local` file with Supabase credentials
- **Deployed (Vercel):** Already has environment variables set
- **They're separate:** Local uses `.env.local`, Vercel uses its own environment variables

**Both need the same values, but configured separately:**
- ✅ Local: `.env.local` file
- ✅ Vercel: Environment Variables in dashboard

---

## 🚀 After Fixing

1. **Local dev:** Works with `.env.local`
2. **Deployed app:** Works with Vercel environment variables
3. **Both use same Supabase project** (same credentials)

---

## 💡 Pro Tip

**Keep credentials safe:**
- Never share `.env.local`
- Never commit to Git
- Use different keys for dev/prod if needed

---

## ✅ Summary

**The error means:** Missing Supabase credentials locally

**The fix:**
1. Create `.env.local` file
2. Add your Supabase URL and key
3. Restart dev server
4. Done! ✅

