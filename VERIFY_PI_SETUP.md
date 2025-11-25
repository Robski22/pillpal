# 🔍 Verify Raspberry Pi Setup

## 1. Get Current Tunnel URL

Run this on your Pi to get the current tunnel URL:

```bash
sudo journalctl -u cloudflared-tunnel -n 200 | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1
```

**Expected output:** `https://something-something.trycloudflare.com`

## 2. Check Auto-Update Script Status

```bash
# Check if service is enabled
sudo systemctl status update-tunnel-url.service

# Check recent logs
sudo journalctl -u update-tunnel-url.service -n 50

# Check if it ran successfully
sudo journalctl -u update-tunnel-url.service --since "1 hour ago" | grep "Successfully updated"
```

**Expected:** Should show "✅ Successfully updated database with: wss://..."

## 3. Verify Port Configuration

Your tunnel is pointing to `http://localhost:8766`, but make sure your WebSocket server is running on the same port:

```bash
# Check what's running on port 8766
sudo netstat -tlnp | grep 8766

# Or check port 8765 (if that's what your server uses)
sudo netstat -tlnp | grep 8765
```

**Important:** The tunnel URL and your WebSocket server port must match!

## 4. Check Database URL

In Supabase, check the `pi_connection_config` table:
- `websocket_url` should be: `wss://[tunnel-url].trycloudflare.com`
- `updated_at` should be recent (within last few minutes if script ran)

## 5. Test Connection

After verifying everything:
1. Go to your web app: https://pillpal-drab.vercel.app
2. Check browser console (F12)
3. Should see: `✔ Using WebSocket URL: wss://...`
4. Should see: `✅ Connected to Pi!`

## Troubleshooting

### If tunnel URL is not updating:
1. Check if `update_tunnel_url.sh` has correct Supabase service key
2. Check if script has execute permissions: `chmod +x ~/scripts/update_tunnel_url.sh`
3. Check if service is enabled: `sudo systemctl enable update-tunnel-url.service`

### If connection disconnects after 1 minute:
- The new keepalive (every 10 seconds) should prevent this
- Check browser console for keepalive ping messages: `💓 Keepalive ping sent`
- Check if URL refresh is working: Should see `🔄 Tunnel URL changed!` if URL updates

### If port mismatch:
- Update cloudflared service to use correct port:
  ```bash
  sudo nano /etc/systemd/system/cloudflared-tunnel.service
  # Change --url http://localhost:8766 to match your server port
  sudo systemctl daemon-reload
  sudo systemctl restart cloudflared-tunnel
  ```



