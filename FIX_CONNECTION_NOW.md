# 🔧 Fix Connection Error - Update Database URL

## Problem
Your web app is trying to connect to an **OLD URL**:
- ❌ Old URL in database: `wss://manufacturers-arabia-defensive-brakes.trycloudflare.com`
- ✅ Current tunnel URL: `wss://defensive-southern-virginia-recommend.trycloudflare.com`

## Quick Fix: Update Database

### Option 1: Update via Supabase SQL Editor

Run this SQL:

```sql
UPDATE pi_connection_config
SET websocket_url = 'wss://defensive-southern-virginia-recommend.trycloudflare.com',
    updated_at = NOW();
```

### Option 2: Update via Supabase Table Editor

1. Go to `pi_connection_config` table
2. Click on `websocket_url` cell
3. Change to: `wss://defensive-southern-virginia-recommend.trycloudflare.com`
4. Press Enter to save

## After Updating Database

1. **Hard refresh your web app:**
   - Press `Ctrl + Shift + R` (or `Cmd + Shift + R` on Mac)
   - Or open in incognito/private window

2. **Check browser console (F12):**
   - Should see: `✔ Using WebSocket URL: wss://defensive-southern-virginia-recommend.trycloudflare.com`
   - Should see: `✅ Connected to Pi!`

3. **Connection should work now!**

## Why This Happened

The auto-update script on your Pi needs the correct Supabase service role key. Once you fix that on your Pi, it will automatically update the database on every boot.

## Next Steps (On Your Pi)

Make sure your script has the correct service role key:

1. Get the service role key from Supabase (Settings → API → service_role key)
2. Update the script: `nano ~/scripts/update_tunnel_url.sh`
3. Replace `SUPABASE_SERVICE_KEY` with the correct key
4. Test: `bash -x ~/scripts/update_tunnel_url.sh`
5. Should see: `✅ Successfully updated database with: wss://...`

After this, the database will auto-update on every boot!


