# 🔧 Fix Systemd Service File

## Problem
The service file `update-tunnel-url.service` doesn't exist. The filename was incomplete when created.

## Solution: Create the Service File Correctly

### Step 1: Create the Service File

```bash
sudo nano /etc/systemd/system/update-tunnel-url.service
```

**Important:** Make sure the full filename is `update-tunnel-url.service` (not just `upda`)

### Step 2: Paste This Content

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

### Step 3: Save the File

In nano:
1. Press `Ctrl+X` to exit
2. Press `Y` to confirm save
3. Press `Enter` to confirm filename

**Make sure it says:** `File Name to Write: /etc/systemd/system/update-tunnel-url.service`

### Step 4: Verify the File Exists

```bash
# Check if file exists
ls -la /etc/systemd/system/update-tunnel-url.service

# View the file content
cat /etc/systemd/system/update-tunnel-url.service
```

You should see the content you just pasted.

### Step 5: Enable and Start the Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service (runs on boot)
sudo systemctl enable update-tunnel-url.service

# Start service now (test it)
sudo systemctl start update-tunnel-url.service

# Check status
sudo systemctl status update-tunnel-url.service

# Check logs
sudo journalctl -u update-tunnel-url -n 50
```

### Step 6: Verify It Worked

You should see:
- ✅ Service enabled successfully
- ✅ Service started successfully
- ✅ Logs showing the tunnel URL update

---

## Troubleshooting

### If file still doesn't exist:
```bash
# Check what files are in the directory
ls -la /etc/systemd/system/ | grep update

# If you see a file with wrong name, delete it
sudo rm /etc/systemd/system/upda  # or whatever wrong name

# Create the file again with correct name
sudo nano /etc/systemd/system/update-tunnel-url.service
```

### If service still fails:
```bash
# Check script exists and is executable
ls -la ~/scripts/update_tunnel_url.sh

# Test script manually
~/scripts/update_tunnel_url.sh

# Check script has correct permissions
chmod +x ~/scripts/update_tunnel_url.sh
```

---

## Quick Copy-Paste Commands

Run these in order:

```bash
# 1. Create service file
sudo nano /etc/systemd/system/update-tunnel-url.service
# (Paste the content above, save with Ctrl+X, Y, Enter)

# 2. Verify file exists
ls -la /etc/systemd/system/update-tunnel-url.service

# 3. Enable and start
sudo systemctl daemon-reload
sudo systemctl enable update-tunnel-url.service
sudo systemctl start update-tunnel-url.service

# 4. Check status
sudo systemctl status update-tunnel-url.service
```

---

## Expected Output

After `sudo systemctl status update-tunnel-url.service`, you should see:
- ✅ `Active: inactive (dead)` or `Active: active (exited)` (both are OK for oneshot services)
- ✅ `Loaded: loaded` 
- ✅ No red error messages

After `sudo journalctl -u update-tunnel-url -n 50`, you should see:
- ✅ `Found tunnel URL: wss://xxxxx.trycloudflare.com`
- ✅ `✅ Successfully updated database with: wss://xxxxx.trycloudflare.com`



