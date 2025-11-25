# 🔧 Fix Cloudflare Tunnel for WebSocket

## Problem
Cloudflare Tunnel doesn't support `ws://` protocol directly. Error: "Currently Cloudflare Tunnel does not support ws protocol."

## Solution

Cloudflare Tunnel can forward WebSocket connections, but you need to use `http://` for the origin URL. The tunnel will handle the WebSocket upgrade automatically.

### Correct Command:

```bash
# Stop current tunnel (if running)
pkill cloudflared

# Start tunnel with http:// (not ws://)
cloudflared tunnel --url http://localhost:8765
```

**Note:** Use `http://localhost:8765` (not `ws://`). Cloudflare will handle the WebSocket upgrade.

---

## Alternative: Use TCP Tunneling

If `http://` doesn't work, you can use TCP tunneling:

```bash
# For TCP tunneling (more direct for WebSocket)
cloudflared tunnel --url tcp://localhost:8765
```

However, this requires a different connection method on the client side.

---

## Recommended Approach

1. **Use HTTP for tunnel origin:**
   ```bash
   cloudflared tunnel --url http://localhost:8765
   ```

2. **Client connects with WSS:**
   - Tunnel gives: `https://references-thin-organisms-indirect.trycloudflare.com`
   - Client uses: `wss://references-thin-organisms-indirect.trycloudflare.com`

3. **Update database:**
   ```sql
   UPDATE pi_connection_config
   SET websocket_url = 'wss://references-thin-organisms-indirect.trycloudflare.com',
       updated_at = NOW()
   WHERE id = 1;
   ```

---

## Verify Your Pi Server

Make sure your Pi WebSocket server accepts HTTP upgrade requests:

```bash
# Check if server is running
ps aux | grep pi_websocket_server

# Test if it accepts HTTP connections
curl http://localhost:8765
```

If your server only accepts WebSocket connections (not HTTP), you may need to:
1. Modify the server to accept HTTP and upgrade to WebSocket
2. Use a different tunneling solution (ngrok with WebSocket support)
3. Use TCP tunneling with Cloudflare

---

## New Tunnel URL

From your output, the new tunnel URL is:
**`https://references-thin-organisms-indirect.trycloudflare.com`**

Use this in your database as: **`wss://references-thin-organisms-indirect.trycloudflare.com`**




