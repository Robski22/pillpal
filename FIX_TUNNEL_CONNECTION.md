# 🔧 Fix: Connection Failing Despite Correct URL

## Current Status
- ✅ App using correct URL: `wss://departure-fin-wallace-steady.trycloudflare.com`
- ✅ Pi server running on port 8766
- ❌ WebSocket connection failing

**The issue is likely the tunnel service!**

---

## Step 1: Check if Tunnel Service is Running

On your Pi, run:

```bash
# Check tunnel service status
sudo systemctl status cloudflared-tunnel
```

**Should show:** `active (running)`

**If not running:**
```bash
sudo systemctl start cloudflared-tunnel
sudo systemctl enable cloudflared-tunnel
```

---

## Step 2: Verify Tunnel is Pointing to Correct Port

```bash
# Check what port the tunnel is pointing to
ps aux | grep cloudflared
```

**Should show:** `cloudflared tunnel --url http://localhost:8766`

**If it shows 8765 or different port:**
```bash
# Stop service
sudo systemctl stop cloudflared-tunnel

# Edit service file
sudo nano /etc/systemd/system/cloudflared-tunnel.service
```

Make sure the `ExecStart` line shows:
```
ExecStart=/usr/local/bin/cloudflared tunnel --url http://localhost:8766
```

Save: `Ctrl+X`, then `Y`, then `Enter`

Then:
```bash
# Reload and restart
sudo systemctl daemon-reload
sudo systemctl start cloudflared-tunnel
sudo systemctl status cloudflared-tunnel
```

---

## Step 3: Check Tunnel Logs for Errors

```bash
# View recent tunnel logs
sudo journalctl -u cloudflared-tunnel -n 100

# Look for:
# - Connection errors
# - URL confirmation
# - Any error messages
```

---

## Step 4: Verify Tunnel URL is Still Valid

```bash
# Get current tunnel URL from logs
sudo journalctl -u cloudflared-tunnel -n 200 | grep -i "https.*trycloudflare" | tail -1
```

**Should show:** `departure-fin-wallace-steady.trycloudflare.com`

**If it shows a different URL:**
- The tunnel restarted and got a new URL
- Update database and Vercel with the NEW URL

---

## Step 5: Test Tunnel Connection Locally

On your Pi, test if the tunnel is accessible:

```bash
# Test tunnel endpoint
curl https://departure-fin-wallace-steady.trycloudflare.com

# Or test WebSocket (if wscat is installed)
wscat -c wss://departure-fin-wallace-steady.trycloudflare.com
```

**If this fails, the tunnel is not working correctly.**

---

## Step 6: Restart Tunnel Service

If tunnel is running but not working:

```bash
# Restart the service
sudo systemctl restart cloudflared-tunnel

# Check status
sudo systemctl status cloudflared-tunnel

# View logs to see new URL (if it changed)
sudo journalctl -u cloudflared-tunnel -n 50
```

**⚠️ Note:** Restarting might give you a NEW URL! Check the logs.

---

## Common Issues

### Issue: Tunnel service not running
**Solution:**
```bash
sudo systemctl start cloudflared-tunnel
sudo systemctl enable cloudflared-tunnel
```

### Issue: Tunnel pointing to wrong port
**Solution:** Edit service file to point to port 8766

### Issue: Tunnel URL expired/changed
**Solution:** Get new URL from logs, update database and Vercel

### Issue: Pi server not accessible
**Solution:** Verify server is running: `ps aux | grep pi_websocket_server`

---

## Quick Diagnostic

Run these on your Pi:

```bash
# 1. Check tunnel service
sudo systemctl status cloudflared-tunnel

# 2. Check tunnel process
ps aux | grep cloudflared

# 3. Check Pi server
ps aux | grep pi_websocket_server
netstat -tuln | grep 8766

# 4. Get tunnel URL
sudo journalctl -u cloudflared-tunnel -n 200 | grep -i "https.*trycloudflare" | tail -1

# 5. Test tunnel
curl https://departure-fin-wallace-steady.trycloudflare.com
```

---

## Most Likely Issue

The tunnel service is either:
1. **Not running** - Start it with `sudo systemctl start cloudflared-tunnel`
2. **Pointing to wrong port** - Should be `http://localhost:8766`
3. **Got a new URL** - Check logs for current URL

Run the diagnostic commands above and share the results!




