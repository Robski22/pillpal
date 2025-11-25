# 🔍 Verify Python Server is Listening on Port 8765

## Current Status:
✅ Python server is running (PID 1784)
❌ Tunnel can't connect - "connection refused"

This usually means the server isn't listening on port 8765, or there's a port mismatch.

---

## Step 1: Check What Port the Server is Listening On

```bash
# Check if anything is listening on port 8765
sudo netstat -tlnp | grep 8765
# OR
sudo ss -tlnp | grep 8765

# Check what ports Python is using
sudo netstat -tlnp | grep python
# OR
sudo ss -tlnp | grep python
```

This will show if the server is actually listening on port 8765.

---

## Step 2: Check the Server Configuration

Check what port the server is configured to use:

```bash
# Check the server file
grep -n "8765\|port\|PORT" ~/pillpal/pi_websocket_server_PCA9685.py
```

Look for lines like:
- `port = 8765`
- `8765`
- `websockets.serve(..., port=8765)`

---

## Step 3: Check Server Logs

```bash
# If running as service, check logs
sudo journalctl -u pillpal-websocket -n 50

# If running manually, check the terminal where it's running
# Look for messages like "Server started on port 8765"
```

---

## Step 4: Test Local Connection

Test if the server responds locally:

```bash
# Test WebSocket connection locally
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

If this fails, the server isn't listening on port 8765.

---

## Step 5: Check Cloudflare Tunnel Configuration

Verify the tunnel is trying to connect to the right port:

```bash
# Check tunnel service configuration
cat /etc/systemd/system/cloudflared-quick-tunnel.service | grep "8765"

# Should show: --url http://localhost:8765
```

---

## Common Issues:

### Issue 1: Server Listening on Different Port
If the server is listening on a different port (e.g., 8766), update the tunnel:

```bash
# Edit tunnel service
sudo nano /etc/systemd/system/cloudflared-quick-tunnel.service

# Change --url http://localhost:8765 to the correct port
# Then restart
sudo systemctl daemon-reload
sudo systemctl restart cloudflared-quick-tunnel
```

### Issue 2: Server Not Binding to Localhost
The server might be binding to a specific IP. Check:

```bash
# In the server file, look for:
# websockets.serve(..., host='0.0.0.0')  # Should be 0.0.0.0 or localhost
# websockets.serve(..., host='127.0.0.1')  # Should work
# websockets.serve(..., host='192.168.x.x')  # Won't work for localhost
```

### Issue 3: IPv6 vs IPv4
Cloudflare might be trying IPv6 (`[::1]:8765`) but server is on IPv4. Check server binding:

```bash
# Server should bind to 0.0.0.0 (all interfaces) or 127.0.0.1
grep -n "serve\|bind\|host" ~/pillpal/pi_websocket_server_PCA9685.py
```

---

## Quick Fix: Restart Both Services

Sometimes a restart fixes connection issues:

```bash
# Restart Python server
sudo systemctl restart pillpal-websocket
# OR if running manually, stop and restart it

# Wait 5 seconds
sleep 5

# Restart tunnel
sudo systemctl restart cloudflared-quick-tunnel

# Check logs
sudo journalctl -u cloudflared-quick-tunnel -n 20
```

---

## Expected Output:

When everything works:
- `sudo netstat -tlnp | grep 8765` should show Python listening
- `sudo journalctl -u cloudflared-quick-tunnel -n 20` should NOT show "connection refused"
- Local test should succeed


