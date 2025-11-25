# 🔧 Fix Tunnel to Use Port 8765 with WebSocket Protocol

## Current Issue
Tunnel is using `http://localhost:8765` but needs `ws://localhost:8765` for WebSocket.

## Solution: Restart Tunnel with WebSocket Protocol

### On Your Pi, Run These Commands:

```bash
# 1. Stop the current tunnel
pkill cloudflared

# 2. Verify it's stopped
ps aux | grep cloudflared

# 3. Start tunnel with WebSocket protocol (ws://) on port 8765
cloudflared tunnel --url ws://localhost:8765
```

**Key Change:** Using `ws://` instead of `http://` for WebSocket support.

### After Restarting:

1. **Copy the new tunnel URL** (it will be different from before)
2. **Update database** with the new URL
3. **Update Vercel environment variable** if needed
4. **Test connection**

---

## Keep Tunnel Running

To keep it running after SSH disconnects:

```bash
# Use screen
screen -S tunnel
cloudflared tunnel --url ws://localhost:8765
# Press Ctrl+A, then D to detach

# Or use nohup
nohup cloudflared tunnel --url ws://localhost:8765 > tunnel.log 2>&1 &
```

---

## Verify Pi Server is Running on Port 8765

Before starting the tunnel, make sure your Pi WebSocket server is running:

```bash
# Check if server is running
ps aux | grep pi_websocket_server

# Check what port it's listening on
netstat -tuln | grep 8765
# or
ss -tuln | grep 8765
```




