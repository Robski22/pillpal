# 🔍 Diagnose WebSocket Connection Issue

## Current Problem
- Error 1006: Abnormal closure (server unreachable)
- URL: `wss://asthma-projected-cylinder-kong.trycloudflare.com/`
- Connection fails immediately

## Quick Diagnostic Steps

### 1. Check Browser Console
Open browser console (F12) and run:
```javascript
// Test the URL
await window.testPiUrl()

// Check current connection status
window.checkPiConnection()

// Try manual connection
await window.connectToPi()
```

### 2. Verify URL in Database
1. Go to **Supabase Dashboard** → **Table Editor** → **pi_connection_config**
2. Check the `websocket_url` value
3. **IMPORTANT**: It should be `wss://asthma-projected-cylinder-kong.trycloudflare.com` (NO trailing slash)
4. If it has a trailing slash, update it:
   ```sql
   UPDATE pi_connection_config 
   SET websocket_url = 'wss://asthma-projected-cylinder-kong.trycloudflare.com'
   WHERE websocket_url LIKE '%trycloudflare.com/%';
   ```

### 3. Check Raspberry Pi Server Status
SSH into your Raspberry Pi and check:

```bash
# Check if Python WebSocket server is running
ps aux | grep pi_websocket_server

# Check if it's listening on port 8765
sudo netstat -tlnp | grep 8765
# OR
sudo ss -tlnp | grep 8765

# Check Cloudflare tunnel status
cloudflared tunnel list
cloudflared tunnel info <tunnel-name>

# Check tunnel logs
journalctl -u cloudflared -n 50
```

### 4. Verify Cloudflare Tunnel is Active
The tunnel should be running and forwarding port 8765:

```bash
# On your Pi, check if tunnel is running
systemctl status cloudflared

# Check tunnel configuration
cat ~/.cloudflared/config.yml
```

### 5. Test Connection from Pi
On your Raspberry Pi, test if the WebSocket server responds:

```bash
# Test local connection
python3 -c "
import asyncio
import websockets

async def test():
    try:
        async with websockets.connect('ws://localhost:8765') as ws:
            await ws.send('{\"type\":\"ping\"}')
            response = await ws.recv()
            print('✅ Local connection works:', response)
    except Exception as e:
        print('❌ Local connection failed:', e)

asyncio.run(test())
"
```

### 6. Check Firewall/Router
- Ensure port 8765 is not blocked
- Cloudflare tunnel should handle this, but verify tunnel is active

## Common Issues & Fixes

### Issue 1: URL has trailing slash in database
**Fix**: Update database to remove trailing slash (see step 2 above)

### Issue 2: Python server not running
**Fix**: Start the server on your Pi:
```bash
cd ~/PillApp/pillpal/pi-server
python3 pi_websocket_server_FINAL.py
```

### Issue 3: Cloudflare tunnel is down
**Fix**: Restart the tunnel:
```bash
sudo systemctl restart cloudflared
# OR
cloudflared tunnel run <tunnel-name>
```

### Issue 4: Wrong tunnel URL
**Fix**: Get the current tunnel URL:
```bash
# On Pi, get current tunnel URL
cloudflared tunnel info <tunnel-name> | grep -i url
# OR check logs
journalctl -u cloudflared | grep -i "https://"
```

Then update Supabase with the correct URL.

## Next Steps After Diagnosis

1. **If server is not running**: Start it on your Pi
2. **If tunnel is down**: Restart Cloudflare tunnel
3. **If URL is wrong**: Update Supabase database
4. **If everything looks correct**: Check network connectivity and firewall rules

## Test After Fixes

1. Refresh your localhost page
2. Check browser console for connection logs
3. You should see: `✅ Connected to Pi!`
4. The yellow banner should change to green: "✅ Connected to Raspberry Pi"

