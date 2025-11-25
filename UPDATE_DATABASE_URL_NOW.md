# 🚨 URGENT: Update Database URL

## Problem
Your web app is trying to connect to an **OLD/EXPIRED URL**:
- ❌ Old URL: `wss://manufacturers-arabia-defensive-brakes.trycloudflare.com`
- ✅ Current URL: `wss://defensive-southern-virginia-recommend.trycloudflare.com`

## Immediate Fix

### Update Database in Supabase:

1. Go to Supabase Dashboard
2. Navigate to `pi_connection_config` table
3. Click on `websocket_url` cell
4. Change to: `wss://defensive-southern-virginia-recommend.trycloudflare.com`
5. Press Enter to save

### Or Run This SQL:

```sql
UPDATE pi_connection_config
SET websocket_url = 'wss://defensive-southern-virginia-recommend.trycloudflare.com',
    updated_at = NOW();
```

## After Updating

1. **Hard refresh your web app:** `Ctrl + Shift + R`
2. **Check console** - should see the new URL
3. **Should connect immediately!**

## Why This Keeps Happening

The auto-update script on your Pi needs the correct Supabase service role key. Once you fix that, it will auto-update on every boot.

## Verify Current Tunnel URL

On your Pi, run:
```bash
sudo journalctl -u cloudflared-tunnel -n 200 | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1
```

This will show the CURRENT tunnel URL. Make sure the database matches this!



