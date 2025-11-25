# 🚀 Setup Auto-Connect on Pi Boot

## Complete Setup Instructions

Follow these steps **on your Raspberry Pi** to enable automatic connection after boot:

## Step 1: Configure Passwordless Sudo for journalctl

This allows the script to read cloudflared logs without a password prompt.

```bash
sudo visudo
```

Add this line at the **end** of the file:
```
justin ALL=(ALL) NOPASSWD: /usr/bin/journalctl
```

Save and exit:
- Press `Ctrl+X`
- Press `Y` to confirm
- Press `Enter` to save

**Verify it works:**
```bash
sudo journalctl -u cloudflared-tunnel -n 5
# Should NOT ask for password
```

## Step 2: Update the Script

Copy the fixed script to your Pi:

```bash
# Backup old script
cp ~/scripts/update_tunnel_url.sh ~/scripts/update_tunnel_url.sh.backup

# Edit the script
nano ~/scripts/update_tunnel_url.sh
```

**Replace the entire content** with the fixed version (from `update_tunnel_url_fixed.sh`).

Or copy it directly:
```bash
# If you have the fixed file, copy it:
# (You'll need to transfer update_tunnel_url_fixed.sh to your Pi first)
cp update_tunnel_url_fixed.sh ~/scripts/update_tunnel_url.sh
```

**Make sure it's executable:**
```bash
chmod +x ~/scripts/update_tunnel_url.sh
```

## Step 3: Verify Systemd Service Configuration

```bash
sudo nano /etc/systemd/system/update-tunnel-url.service
```

Should look like this:
```ini
[Unit]
Description=Auto-Update Tunnel URL on Boot
After=cloudflared-tunnel.service network.target
Requires=cloudflared-tunnel.service

[Service]
Type=oneshot
User=justin
ExecStart=/home/justin/scripts/update_tunnel_url.sh
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**Important:** Make sure it has:
- `StandardOutput=journal`
- `StandardError=journal`
- `After=cloudflared-tunnel.service` (so it waits for tunnel to start)

## Step 4: Reload and Enable Service

```bash
# Reload systemd to pick up changes
sudo systemctl daemon-reload

# Enable service to run on boot
sudo systemctl enable update-tunnel-url.service

# Verify it's enabled
sudo systemctl is-enabled update-tunnel-url.service
# Should output: enabled
```

## Step 5: Test the Script Manually

```bash
# Test the script
bash -x ~/scripts/update_tunnel_url.sh
```

**Expected output:**
```
+ Starting tunnel URL update script...
+ Waiting for cloudflared to start...
+ Attempting to get tunnel URL...
+ Found tunnel URL: wss://defensive-southern-virginia-recommend.trycloudflare.com
+ Updating Supabase database with URL: wss://...
+ ✅ Successfully updated database with: wss://...
```

## Step 6: Test the Service

```bash
# Restart the service
sudo systemctl restart update-tunnel-url.service

# Watch logs in real-time
sudo journalctl -u update-tunnel-url.service -f
```

**Expected output:**
```
Nov 25 00:30:00 raspberrypi update_tunnel_url.sh[PID]: 2025-11-25 00:30:00: Starting tunnel URL update script...
Nov 25 00:30:25 raspberrypi update_tunnel_url.sh[PID]: 2025-11-25 00:30:25: Found tunnel URL: wss://...
Nov 25 00:30:26 raspberrypi update_tunnel_url.sh[PID]: 2025-11-25 00:30:26: ✅ Successfully updated database with: wss://...
```

## Step 7: Verify in Supabase

1. Go to Supabase → `pi_connection_config` table
2. Check `websocket_url` - should be the current tunnel URL
3. Check `updated_at` - should be recent (just now)

## Step 8: Test Full Boot Sequence

```bash
# Reboot the Pi
sudo reboot
```

After reboot:
1. Wait 1-2 minutes for everything to start
2. Check service status:
   ```bash
   sudo systemctl status update-tunnel-url.service
   ```
3. Check logs:
   ```bash
   sudo journalctl -u update-tunnel-url.service --since "5 minutes ago"
   ```
4. Verify in Supabase that URL was updated
5. Check your web app - should auto-connect!

## Troubleshooting

### If script still hangs:
```bash
# Check if passwordless sudo works
sudo journalctl -u cloudflared-tunnel -n 5
# Should NOT prompt for password

# If it does prompt, re-check visudo configuration
```

### If no output in logs:
```bash
# Check service file has StandardOutput/StandardError
cat /etc/systemd/system/update-tunnel-url.service | grep Standard

# Should show:
# StandardOutput=journal
# StandardError=journal
```

### If URL not updating:
```bash
# Check if cloudflared is running
sudo systemctl status cloudflared-tunnel

# Check if script can find the URL
journalctl -u cloudflared-tunnel -n 200 | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1
```

### If Supabase update fails:
```bash
# Test curl manually
curl -X POST "https://ubpyymhxyjtbcifspcwj.supabase.co/rest/v1/rpc/update_pi_url" \
  -H "apikey: YOUR_KEY" \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "wss://test.trycloudflare.com"}'
```

## Expected Behavior After Setup

1. **On Pi Boot:**
   - Cloudflare tunnel starts
   - Auto-update script runs
   - Database is updated with new tunnel URL
   - Script logs success

2. **On Web App:**
   - Fetches URL from Supabase API
   - Connects to Pi automatically
   - Stays connected with keepalive pings
   - Auto-reconnects if URL changes

3. **No Manual Steps Required:**
   - ✅ No need to update Supabase manually
   - ✅ No need to restart services
   - ✅ Everything happens automatically!

## Verify Everything Works

After setup, test:
1. Reboot Pi → Check Supabase → URL should update automatically
2. Open web app → Should connect automatically
3. Wait 1 minute → Connection should stay alive (no disconnection)

You're all set! 🎉


