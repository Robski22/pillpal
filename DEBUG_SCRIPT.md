# 🔍 Debug the Auto-Update Script

## Current Issue
Service runs but no script output is visible. The script might be:
- Hanging on sudo password prompt
- Failing silently
- Output not being captured

## Step 1: Check if Passwordless Sudo is Configured

```bash
# Test if you can run journalctl without password
sudo journalctl -u cloudflared-tunnel -n 5

# If it asks for password, you need to configure passwordless sudo
```

## Step 2: Configure Passwordless Sudo (if needed)

```bash
sudo visudo
```

Add this line at the end:
```
justin ALL=(ALL) NOPASSWD: /usr/bin/journalctl
```

Save: Ctrl+X, Y, Enter

## Step 3: Test Script Manually (Without Sudo Prompt)

```bash
# First, test if you can get the tunnel URL without sudo
journalctl -u cloudflared-tunnel -n 200 --no-pager | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1

# If that works, test the full script
bash -x ~/scripts/update_tunnel_url.sh
```

## Step 4: Check Script Permissions and Content

```bash
# Make sure script is executable
chmod +x ~/scripts/update_tunnel_url.sh

# Check script content
cat ~/scripts/update_tunnel_url.sh

# Verify Supabase credentials are set (not "YOUR_SUPABASE...")
grep SUPABASE ~/scripts/update_tunnel_url.sh
```

## Step 5: Update Script to Avoid Sudo (Alternative)

If you can't configure passwordless sudo, add user to systemd-journal group:

```bash
sudo usermod -aG systemd-journal justin
newgrp systemd-journal

# Then update script to remove 'sudo' from journalctl commands
nano ~/scripts/update_tunnel_url.sh
# Change: sudo journalctl
# To: journalctl
```

## Step 6: Verify Systemd Service Configuration

```bash
# Check service file
cat /etc/systemd/system/update-tunnel-url.service
```

Should have:
```ini
[Service]
Type=oneshot
User=justin
ExecStart=/home/justin/scripts/update_tunnel_url.sh
StandardOutput=journal
StandardError=journal
```

## Step 7: Test with Direct Output

Create a test version that writes to a file:

```bash
# Create test script
cat > ~/test_script.sh << 'EOF'
#!/bin/bash
echo "Script started at $(date)" > /tmp/script_test.log
TUNNEL_URL=$(journalctl -u cloudflared-tunnel -n 200 --no-pager 2>&1 | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1)
echo "Found URL: $TUNNEL_URL" >> /tmp/script_test.log
EOF

chmod +x ~/test_script.sh
bash ~/test_script.sh
cat /tmp/script_test.log
```

## Step 8: Check for Errors

```bash
# Check systemd service status with more details
sudo systemctl status update-tunnel-url.service -l --no-pager

# Check for any errors
sudo journalctl -u update-tunnel-url.service --since "10 minutes ago" | grep -i error
```

## Expected Output After Fix

Once working, you should see:
```
Nov 25 00:12:41 raspberrypi update_tunnel_url.sh[PID]: 2025-11-25 00:12:41: Found tunnel URL: wss://defensive-southern-virginia-recommend.trycloudflare.com
Nov 25 00:12:42 raspberrypi update_tunnel_url.sh[PID]: 2025-11-25 00:12:42: ✅ Successfully updated database with: wss://defensive-southern-virginia-recommend.trycloudflare.com
```



