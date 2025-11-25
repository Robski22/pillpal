# 🔄 Update Database with New Tunnel URL

Your tunnel is working! Now update the database with the new URL.

## Current Tunnel URL
`https://kenny-spas-basically-fancy.trycloudflare.com`

## Step 1: Update Supabase Database

Go to **Supabase Dashboard** → **SQL Editor** and run:

```sql
UPDATE pi_connection_config 
SET websocket_url = 'wss://kenny-spas-basically-fancy.trycloudflare.com',
    updated_at = NOW();
```

**Important:** 
- Change `https://` to `wss://` (WebSocket Secure)
- Remove any trailing slash
- The URL should be: `wss://kenny-spas-basically-fancy.trycloudflare.com`

## Step 2: Verify Update

Check that it was updated:
```sql
SELECT websocket_url, updated_at FROM pi_connection_config;
```

Should show: `wss://kenny-spas-basically-fancy.trycloudflare.com`

## Step 3: Test Your Vercel App

1. Open https://pillpal-drab.vercel.app/
2. Refresh the page (F5 or Ctrl+R)
3. Should see green "✅ Connected to Raspberry Pi" (not yellow "offline")

## Step 4: Set Up Permanent Auto-Start

Now follow `PERMANENT_FIX_COMPLETE.md` to set up:
- Auto-start Python server on boot
- Auto-start Cloudflare tunnel on boot  
- Auto-update database with new URL on boot

After that, even if the tunnel URL changes, it will update automatically!


