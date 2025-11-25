# 🔑 How to Find Your Supabase Service Role Key

## Step-by-Step Guide

### Step 1: Go to Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Sign in to your account
3. Select your project: **JustRobs** (or **Pillpal**)

### Step 2: Navigate to API Settings

1. In the left sidebar, click **"Settings"** (gear icon)
2. Click **"API"** (under Project Settings)

### Step 3: Find Service Role Key

You'll see several keys:

1. **Project URL**: `https://ubpyymhxyjtbcifspcwj.supabase.co`
   - This is your `SUPABASE_URL`

2. **anon public** key
   - This is NOT what you need (this is for client-side)

3. **service_role secret** key ⭐ **THIS IS WHAT YOU NEED!**
   - Click the **"Reveal"** or **eye icon** to show it
   - It's a long string that starts with `eyJ...`
   - **This is your `SUPABASE_SERVICE_KEY`**

### Step 4: Copy the Service Role Key

1. Click **"Reveal"** next to `service_role` key
2. Click the **copy icon** (or select all and copy)
3. **Keep this secret!** Don't share it publicly

---

## Update Your Script

### On Your Pi:

```bash
# Edit the script
nano ~/scripts/update_tunnel_url.sh
```

### Find These Lines (around line 30-31):

```bash
SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
SUPABASE_SERVICE_KEY="YOUR_SERVICE_ROLE_KEY"
```

### Replace With:

```bash
SUPABASE_URL="https://ubpyymhxyjtbcifspcwj.supabase.co"
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVicHl5bWh4eWp0YmNpZnNwY3dqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY5ODk2NzIwMCwiZXhwIjoyMDE0NTQzMjAwfQ.YOUR_ACTUAL_KEY_HERE"
```

**Important:**
- Replace `YOUR_ACTUAL_KEY_HERE` with your **actual** service role key from Supabase
- The key is very long (usually 200+ characters)
- Make sure you copy the ENTIRE key

### Save the File:

1. Press `Ctrl+X` to exit
2. Press `Y` to confirm save
3. Press `Enter` to confirm filename

---

## Visual Guide

In Supabase Dashboard → Settings → API, you'll see:

```
Project URL
https://ubpyymhxyjtbcifspcwj.supabase.co

API Keys
┌─────────────────────────────────────┐
│ anon public                         │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6...     │
│ [Copy] [Reveal]                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ service_role secret  ⭐ THIS ONE!    │
│ [Reveal] [Copy]                    │
│ (Click Reveal to see the key)      │
└─────────────────────────────────────┘
```

---

## Security Note

⚠️ **IMPORTANT:**
- The **service_role** key has **full access** to your database
- **Never** commit it to Git or share it publicly
- Only use it in server-side scripts (like your Pi script)
- If exposed, regenerate it immediately in Supabase

---

## Quick Checklist

- [ ] Go to Supabase Dashboard
- [ ] Click Settings → API
- [ ] Find "service_role secret" key
- [ ] Click "Reveal" to show the key
- [ ] Copy the entire key
- [ ] Paste it into `update_tunnel_url.sh` replacing `YOUR_SERVICE_ROLE_KEY`
- [ ] Also update `SUPABASE_URL` to `https://ubpyymhxyjtbcifspcwj.supabase.co`
- [ ] Save the file
- [ ] Test the script

---

## After Updating

Test your script:

```bash
# Test manually
~/scripts/update_tunnel_url.sh

# Should see:
# Found tunnel URL: wss://xxxxx.trycloudflare.com
# ✅ Successfully updated database with: wss://xxxxx.trycloudflare.com
```

If you see errors, check:
- Service role key is correct (full key copied)
- URL is correct
- Script has execute permissions: `chmod +x ~/scripts/update_tunnel_url.sh`



