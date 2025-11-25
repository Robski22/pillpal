# 🔧 Fix Database URL Mismatch

## Problem
- **Database has:** `wss://manufacturers-arabia-defensive-brakes.trycloudflare.com` (OLD)
- **Current tunnel:** `wss://defensive-southern-virginia-recommend.trycloudflare.com` (NEW)
- **Auto-update script is NOT working**

## Quick Fix: Update Database Manually

### Option 1: Update via Supabase SQL Editor

Run this SQL in Supabase:

```sql
UPDATE pi_connection_config
SET websocket_url = 'wss://defensive-southern-virginia-recommend.trycloudflare.com',
    updated_at = NOW();
```

### Option 2: Update via Supabase Table Editor

1. Go to `pi_connection_config` table
2. Click on the `websocket_url` cell
3. Change it to: `wss://defensive-southern-virginia-recommend.trycloudflare.com`
4. Press Enter to save

## After Updating

1. **Refresh your web app:** https://pillpal-drab.vercel.app
2. **Hard refresh:** `Ctrl + Shift + R`
3. **Check browser console (F12):**
   - Should see: `✔ Using WebSocket URL: wss://defensive-southern-virginia-recommend.trycloudflare.com`
   - Should see: `✅ Connected to Pi!`

## Fix the Auto-Update Script

The script isn't working. You need to:

### 1. Configure Passwordless Sudo

```bash
sudo visudo
```

Add this line:
```
justin ALL=(ALL) NOPASSWD: /usr/bin/journalctl
```

### 2. Verify Script Has Credentials

```bash
# Check script
grep SUPABASE ~/scripts/update_tunnel_url.sh

# Should show actual URLs/keys, not "YOUR_SUPABASE..."
```

### 3. Test Script Manually

```bash
bash -x ~/scripts/update_tunnel_url.sh
```

Should see:
```
+ Found tunnel URL: wss://defensive-southern-virginia-recommend.trycloudflare.com
+ ✅ Successfully updated database with: wss://...
```

### 4. Verify Service Logs

```bash
sudo systemctl restart update-tunnel-url.service
sudo journalctl -u update-tunnel-url.service -f
```

Should now show script output!

## Why This Happened

The auto-update script is hanging on the `sudo journalctl` password prompt, so it never updates the database. Once you configure passwordless sudo, it should work automatically on every boot.


