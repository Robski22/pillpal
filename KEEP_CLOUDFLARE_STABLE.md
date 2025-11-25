# 🔧 Keep Cloudflare Tunnel Stable (No ngrok Needed)

## Current Setup
You already have Cloudflare tunnel set up as a service that auto-starts on boot. The only issue is the URL changes when it restarts.

---

## Solution: Make Service More Stable

The Cloudflare tunnel service is already set up to auto-start. To keep the URL stable:

### Option 1: Prevent Unnecessary Restarts

The service is already configured with `Restart=always`, which is good. But we can make it more stable:

```bash
# Edit service file
sudo nano /etc/systemd/system/cloudflared-tunnel.service
```

Make sure it has:
```ini
[Service]
Restart=always
RestartSec=30  # Wait 30 seconds before restart (prevents rapid restarts)
```

This prevents the service from restarting too quickly, which helps keep the URL stable.

---

## Option 2: Accept URL Changes (Simplest)

Since the service auto-starts on boot, you just need to:

1. **Check URL after Pi reboots:**
   ```bash
   sudo journalctl -u cloudflared-tunnel -n 100 | grep -i "https.*trycloudflare" | tail -1
   ```

2. **Update database when URL changes:**
   ```sql
   UPDATE pi_connection_config
   SET websocket_url = 'wss://NEW-URL-HERE.trycloudflare.com',
       updated_at = NOW();
   ```

3. **Update Vercel environment variable** (optional, since app reads from database)

---

## Option 3: Use Environment Variable Only

Since your API route now prioritizes environment variable, you can:

1. **Set Vercel environment variable** with the current tunnel URL
2. **Update it manually** when the tunnel restarts (rarely happens)
3. **Don't rely on database** for the URL

This way, you only update Vercel when needed, not the database.

---

## Current Status

Your Cloudflare tunnel service is already:
- ✅ Set up as systemd service
- ✅ Auto-starts on boot
- ✅ Points to correct port (8766)
- ✅ Runs in background

**The only issue:** URL changes when service restarts (which is rare if Pi doesn't reboot).

---

## Recommendation

**Keep using Cloudflare tunnel** (no ngrok needed):

1. **Service is already set up** - it auto-starts on boot
2. **URL only changes on restart** - which is rare
3. **When URL changes:**
   - Get new URL from logs
   - Update database (takes 30 seconds)
   - Done!

**You don't need to open CMD** - the service runs automatically. You only need to update the URL if the Pi reboots (which is rare).

---

## Quick Check After Reboot

If your Pi reboots, run this to get the new URL:

```bash
sudo journalctl -u cloudflared-tunnel -n 200 | grep -i "https.*trycloudflare" | tail -1
```

Then update database with that URL.

---

## Summary

- ✅ Cloudflare tunnel service is already set up
- ✅ Auto-starts on boot (no CMD needed)
- ✅ Runs in background
- ⚠️ URL changes only if service restarts (rare)
- ✅ Easy to update when it does change

**You're already set up!** Just update the URL in database if the Pi reboots (which shouldn't happen often).



