# ✅ Verify URL Update - Step by Step

## Current Issue
App is still trying to connect to old URL: `wss://location-oxide-surround-atlas.trycloudflare.com`
New URL should be: `wss://complimentary-pst-plastic-jersey.trycloudflare.com`

---

## Step 1: Verify Database Has Correct URL

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run:
```sql
SELECT * FROM pi_connection_config;
```

3. **Check `websocket_url` column:**
   - Should be: `wss://complimentary-pst-plastic-jersey.trycloudflare.com`
   - If it's the old URL or empty, update it:
   ```sql
   UPDATE pi_connection_config
   SET websocket_url = 'wss://complimentary-pst-plastic-jersey.trycloudflare.com',
       updated_at = NOW();
   ```

---

## Step 2: Verify Vercel Environment Variable

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Find `NEXT_PUBLIC_PI_WEBSOCKET_URL`
3. **Check the value:**
   - Should be: `wss://complimentary-pst-plastic-jersey.trycloudflare.com`
   - If it's wrong, update it
4. **Important:** After updating, you MUST redeploy:
   - Go to **Deployments** tab
   - Click **⋮** (3 dots) on latest deployment
   - Click **Redeploy**

---

## Step 3: Check What URL API Returns

1. Open your browser
2. Go to: `https://pillpal-drab.vercel.app/api/pi-url`
3. You should see JSON like:
   ```json
   {"url": "wss://complimentary-pst-plastic-jersey.trycloudflare.com"}
   ```
4. If it shows the old URL, the database or Vercel env var is wrong

---

## Step 4: Clear Browser Cache

The browser might be caching the old URL:

1. **Hard refresh:** Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. **Or clear cache:**
   - Press `F12` → **Application** tab → **Clear storage** → **Clear site data**
   - Or `Ctrl+Shift+Delete` → Clear cached images and files

---

## Step 5: Verify Tunnel is Running with Correct Port

On your Pi, check:

```bash
# Check if tunnel is running
ps aux | grep cloudflared

# Should show: cloudflared tunnel --url http://localhost:8766
# (Not 8765!)
```

If it's pointing to 8765, restart it:
```bash
pkill cloudflared
cloudflared tunnel --url http://localhost:8766
```

---

## Step 6: Check Deployment Status

1. Go to **Vercel Dashboard** → **Deployments**
2. Check if latest deployment is **Ready** (green checkmark)
3. If it's still building, wait for it to finish
4. If it failed, check the error logs

---

## Common Issues

### Issue: Database updated but API still returns old URL
**Solution:** 
- Check if there are multiple records in `pi_connection_config`
- Delete old records or update all of them
- Wait a few seconds for cache to clear

### Issue: Vercel env var updated but not deployed
**Solution:**
- Environment variables only apply to NEW deployments
- You MUST redeploy after changing env vars
- Go to Deployments → Redeploy

### Issue: Browser caching old URL
**Solution:**
- Hard refresh: `Ctrl+Shift+R`
- Clear browser cache
- Try incognito/private window

### Issue: Tunnel URL changed (restarted tunnel)
**Solution:**
- If you restarted the tunnel, you got a NEW URL
- Update database and Vercel with the NEW URL
- Redeploy

---

## Quick Test

1. Open: `https://pillpal-drab.vercel.app/api/pi-url`
2. Should show: `{"url": "wss://complimentary-pst-plastic-jersey.trycloudflare.com"}`
3. If it shows old URL → Database or Vercel is wrong
4. If it shows correct URL → Browser is caching, clear cache

---

## Checklist

- [ ] Database has correct URL: `wss://complimentary-pst-plastic-jersey.trycloudflare.com`
- [ ] Vercel env var has correct URL
- [ ] Vercel deployment is complete (not building)
- [ ] Tunnel is running on port 8766
- [ ] API endpoint returns correct URL
- [ ] Browser cache cleared
- [ ] Hard refresh done



