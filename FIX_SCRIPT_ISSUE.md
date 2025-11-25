# 🔧 Fix Auto-Update Script Issue

## Problem Identified

The script is hanging because:
1. `sudo journalctl` requires a password (interactive prompt)
2. Script output isn't being captured by systemd journal
3. The script might be failing silently

## Solution: Configure Passwordless Sudo

You need to allow the `justin` user to run `journalctl` without a password.

### Step 1: Edit Sudoers File

```bash
sudo visudo
```

### Step 2: Add This Line at the End

```
justin ALL=(ALL) NOPASSWD: /usr/bin/journalctl
```

This allows the `justin` user to run `journalctl` without a password.

### Step 3: Save and Exit

- Press `Ctrl+X`
- Press `Y` to confirm
- Press `Enter` to save

## Alternative: Add User to systemd-journal Group

If you prefer not to use sudo:

```bash
# Add user to systemd-journal group
sudo usermod -aG systemd-journal justin

# Log out and log back in for changes to take effect
# Or use: newgrp systemd-journal
```

Then update the script to use `journalctl` without `sudo`:

```bash
# In the script, change:
sudo journalctl -u cloudflared-tunnel

# To:
journalctl -u cloudflared-tunnel
```

## Update the Script

I've created a fixed version: `update_tunnel_url_fixed.sh`

Copy it to your Pi:

```bash
# On your Pi, replace the script:
nano ~/scripts/update_tunnel_url.sh

# Or copy the fixed version from the file I created
```

## Test the Fix

After configuring passwordless sudo:

```bash
# Test manually
bash -x ~/scripts/update_tunnel_url.sh

# Should see output like:
# + Found tunnel URL: wss://defensive-southern-virginia-recommend.trycloudflare.com
# + ✅ Successfully updated database with: wss://...
```

## Verify Systemd Service

Make sure the service file has proper logging:

```bash
sudo nano /etc/systemd/system/update-tunnel-url.service
```

Should have:
```ini
[Service]
StandardOutput=journal
StandardError=journal
```

## Restart and Test

```bash
# Restart the service
sudo systemctl restart update-tunnel-url.service

# Check logs
sudo journalctl -u update-tunnel-url.service -f
```

You should now see the script's output!



