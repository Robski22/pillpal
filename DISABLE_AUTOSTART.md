# How to Disable Auto-Start (For Now) and Set It Up Later

## Step 1: Find and Disable the Current Auto-Start

On your Pi, run these commands to find what's auto-starting the old server:

```bash
# Check for systemd services
systemctl list-units --type=service | grep -i pi
systemctl list-units --type=service | grep -i python
systemctl list-units --type=service | grep -i server

# Check for user services
systemctl --user list-units | grep -i pi
systemctl --user list-units | grep -i python

# Check cron jobs
crontab -l

# Check for startup scripts
ls -la /etc/rc.local
cat /etc/rc.local 2>/dev/null
ls -la ~/.bashrc
grep -i "pi_server\|python.*server" ~/.bashrc 2>/dev/null
```

## Step 2: Disable Auto-Start

**If it's a systemd service:**
```bash
# Find the service name (might be pi_server_pca9685 or similar)
sudo systemctl stop <service-name>
sudo systemctl disable <service-name>
```

**If it's in crontab:**
```bash
crontab -e
# Remove or comment out the line that starts the server
```

**If it's in rc.local:**
```bash
sudo nano /etc/rc.local
# Remove or comment out the line that starts the server
```

**If it's in .bashrc:**
```bash
nano ~/.bashrc
# Remove or comment out the line that starts the server
```

## Step 3: Stop Current Server and Run New One Manually

```bash
# Kill all Python processes
sudo pkill -9 python3

# Verify port is free
sudo lsof -i :8765

# Run your new server manually
cd /home/justin/pillpal
python3 pi_websocket_server.py
```

## Step 4: Later - Set Up Auto-Start for New Server

When you're ready, create a systemd service for the new server:

```bash
sudo nano /etc/systemd/system/pillpal-server.service
```

Paste this content:

```ini
[Unit]
Description=PillPal WebSocket Server
After=network.target

[Service]
Type=simple
User=justin
WorkingDirectory=/home/justin/pillpal
ExecStart=/usr/bin/python3 /home/justin/pillpal/pi_websocket_server.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Then enable and start it:

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable auto-start on boot
sudo systemctl enable pillpal-server

# Start the service now
sudo systemctl start pillpal-server

# Check status
sudo systemctl status pillpal-server
```

## Useful Commands for Managing the Service

```bash
# Check if service is running
sudo systemctl status pillpal-server

# Stop the service
sudo systemctl stop pillpal-server

# Start the service
sudo systemctl start pillpal-server

# Restart the service
sudo systemctl restart pillpal-server

# Disable auto-start (but keep service file)
sudo systemctl disable pillpal-server

# View logs
sudo journalctl -u pillpal-server -f
```




