# 🔧 Fix Tunnel Connection Issues

## Current Issues Found:

1. ✅ **Tunnel is running** - URL: `https://asthma-projected-cylinder-kong.trycloudflare.com/`
2. ❌ **Python WebSocket server is NOT running** - Error: "connection refused" on port 8765
3. ⚠️ **URL has trailing slash** - Should be removed

---

## Step 1: Start Python WebSocket Server

The tunnel can't connect because the server isn't running. Start it:

```bash
# Check if server is running
ps aux | grep pi_websocket_server

# If not running, start it
cd ~/pillpal
python3 pi_websocket_server_PCA9685.py
```

**Or if you set it up as a service:**

```bash
# Check service status
sudo systemctl status pillpal-websocket

# If not running, start it
sudo systemctl start pillpal-websocket

# Check if it started successfully
sudo systemctl status pillpal-websocket
```

---

## Step 2: Update Database with Correct URL

The tunnel URL is: `https://asthma-projected-cylinder-kong.trycloudflare.com/`

**Important:** 
- Remove trailing slash: `/` → (nothing)
- Change `https://` to `wss://` for WebSocket

**Correct URL:** `wss://asthma-projected-cylinder-kong.trycloudflare.com`

### Update in Supabase SQL Editor:

```sql
UPDATE pi_connection_config 
SET websocket_url = 'wss://asthma-projected-cylinder-kong.trycloudflare.com',
    updated_at = NOW()
WHERE id = 1;
```

Or if you don't know the ID:

```sql
UPDATE pi_connection_config 
SET websocket_url = 'wss://asthma-projected-cylinder-kong.trycloudflare.com',
    updated_at = NOW();
```

### Verify:

```sql
SELECT websocket_url, updated_at FROM pi_connection_config;
```

Should show: `wss://asthma-projected-cylinder-kong.trycloudflare.com` (no trailing slash)

---

## Step 3: Verify Both Are Running

```bash
# Check Python server
ps aux | grep pi_websocket_server
# Should show the process running

# Check Cloudflare tunnel
sudo systemctl status cloudflared-quick-tunnel
# Should show "active (running)"

# Check tunnel logs (should no longer show connection refused errors)
sudo journalctl -u cloudflared-quick-tunnel -n 20
```

---

## Step 4: Test Connection

After both are running:

1. **Refresh your web app** (https://pillpal-drab.vercel.app/)
2. **Check browser console** (F12) - should see connection attempts
3. **Should see green "✅ Connected to Raspberry Pi"** instead of yellow "offline"

---

## Step 5: Set Up Auto-Start (Permanent Fix)

To prevent this from happening again, set up auto-start:

1. **Python server auto-start:** Follow `PERMANENT_FIX_COMPLETE.md` Step 1
2. **Cloudflare tunnel auto-start:** Follow `PERMANENT_FIX_COMPLETE.md` Step 2
3. **Auto-update script:** Follow `PERMANENT_FIX_COMPLETE.md` Step 3-5

After setup, both will start automatically on boot!

---

## Troubleshooting

### If Python server won't start:

```bash
# Check for errors
python3 ~/pillpal/pi_websocket_server_PCA9685.py

# Check if port 8765 is already in use
sudo netstat -tlnp | grep 8765
# OR
sudo ss -tlnp | grep 8765

# Check file permissions
ls -la ~/pillpal/pi_websocket_server_PCA9685.py
```

### If tunnel still shows connection refused:

1. Make sure Python server is running first
2. Wait 5-10 seconds after starting server
3. Check tunnel logs: `sudo journalctl -u cloudflared-quick-tunnel -n 50`

### If database update doesn't work:

```sql
-- Check if table has data
SELECT * FROM pi_connection_config;

-- If empty, insert instead of update
INSERT INTO pi_connection_config (websocket_url, updated_at)
VALUES ('wss://asthma-projected-cylinder-kong.trycloudflare.com', NOW());
```


