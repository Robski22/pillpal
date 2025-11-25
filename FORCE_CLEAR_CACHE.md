# 🔄 Force Clear Cache and Verify

## Step 1: Verify Database Has New URL

Run this in Supabase SQL Editor:

```sql
SELECT websocket_url, updated_at FROM pi_connection_config;
```

**Should show:**
- `websocket_url`: `wss://departure-fin-wallace-steady.trycloudflare.com`
- `updated_at`: Recent timestamp

**If it shows old URL, update it:**
```sql
UPDATE pi_connection_config
SET websocket_url = 'wss://departure-fin-wallace-steady.trycloudflare.com',
    updated_at = NOW()
WHERE id = '0fbefbf-0395-482e-9b64-a62bafc548f6';
```

---

## Step 2: Force API to Refresh

The API might be caching. Try accessing it with a cache-busting parameter:

```
https://pillpal-drab.vercel.app/api/pi-url?nocache=1234567890
```

Or:
```
https://pillpal-drab.vercel.app/api/pi-url?_=1234567890
```

**This bypasses browser/CDN cache.**

---

## Step 3: Check API Route for Caching Headers

The API route should have no-cache headers. Let me check the code...

---

## Step 4: Hard Refresh Browser

1. Open: `https://pillpal-drab.vercel.app/api/pi-url`
2. Press `Ctrl+Shift+R` (hard refresh)
3. Or `Ctrl+F5`
4. Or open in incognito/private window

---

## Step 5: Wait and Retry

Sometimes Vercel's edge cache takes a minute to clear:

1. Wait 1-2 minutes
2. Try the API again with cache-bust parameter
3. Check what it returns

---

## Step 6: Check Vercel Function Logs

1. Go to Vercel Dashboard → Your Project
2. Go to **Functions** tab (or **Logs**)
3. Check recent API calls to `/api/pi-url`
4. See what URL it's actually fetching from database

---

## Step 7: Temporary Workaround

If database keeps showing old value, we can modify the API route to force use the new URL temporarily, or rely on environment variable.

---

## Quick Test Sequence

1. **Verify database:**
   ```sql
   SELECT websocket_url FROM pi_connection_config;
   ```

2. **If correct, test API with cache-bust:**
   ```
   https://pillpal-drab.vercel.app/api/pi-url?t=1234567890
   ```

3. **If still old URL, wait 2 minutes and try again**

4. **If still old, check Vercel logs to see what database is returning**



