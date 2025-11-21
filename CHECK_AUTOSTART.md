# Check and Disable Auto-Start Services on Raspberry Pi

## Step 1: SSH to Your Pi

```bash
ssh justin@192.168.100.68
```

## Step 2: Check for Auto-Start Services

### Check for systemd Services

```bash
# List all services related to pillpal
sudo systemctl list-units --type=service | grep -i pillpal

# Or check for websocket services
sudo systemctl list-units --type=service | grep -i websocket

# Or check for python services
sudo systemctl list-units --type=service | grep -i python
```

### Check Specific Service Names (Common ones)

```bash
# Check if pillpal-server service exists
sudo systemctl status pillpal-server

# Check if pillpal-websocket service exists
sudo systemctl status pillpal-websocket

# Check if pi-server service exists
sudo systemctl status pi-server

# Check if websocket-server service exists
sudo systemctl status websocket-server
```

### Check Service Files

```bash
# List all service files
ls -la /etc/systemd/system/ | grep -i pillpal
ls -la /etc/systemd/system/ | grep -i websocket
ls -la /etc/systemd/system/ | grep -i python
```

## Step 3: Check Running Processes

```bash
# Check for running Python websocket servers
ps aux | grep python | grep websocket
ps aux | grep python | grep pi_websocket

# Check for any Python processes listening on port 8765
sudo lsof -i :8765

# Or use netstat
sudo netstat -tlnp | grep 8765
```

## Step 4: Check Startup Scripts

### Check rc.local (old method)

```bash
cat /etc/rc.local
```

### Check crontab (scheduled tasks)

```bash
# Check user crontab
crontab -l

# Check root crontab
sudo crontab -l
```

### Check .bashrc or .profile (user startup)

```bash
cat ~/.bashrc | grep -i python
cat ~/.bashrc | grep -i websocket
cat ~/.profile | grep -i python
```

## Step 5: Disable Auto-Start Services

### If you find a systemd service:

```bash
# Stop the service
sudo systemctl stop pillpal-server
# (or whatever the service name is)

# Disable auto-start on boot
sudo systemctl disable pillpal-server

# Verify it's disabled
sudo systemctl is-enabled pillpal-server
# Should show: disabled
```

### Remove Service File (if you want to delete it completely)

```bash
# First, stop and disable
sudo systemctl stop pillpal-server
sudo systemctl disable pillpal-server

# Remove the service file
sudo rm /etc/systemd/system/pillpal-server.service

# Reload systemd
sudo systemctl daemon-reload
```

## Step 6: Kill Running Processes

```bash
# Find the process ID
ps aux | grep python | grep websocket

# Kill it (replace PID with the number you see)
kill PID_NUMBER

# Or kill all Python websocket processes
pkill -f "pi_websocket_server"
pkill -f "websocket"
```

## Step 7: Check After Reboot

After disabling services, reboot and check:

```bash
# Reboot the Pi
sudo reboot

# After reboot, SSH back in and check
ps aux | grep python | grep websocket
sudo systemctl status pillpal-server
```

---

## Quick Check Commands (Run All at Once)

```bash
# Check services
echo "=== Checking Services ==="
sudo systemctl list-units --type=service | grep -i pillpal
sudo systemctl list-units --type=service | grep -i websocket

# Check running processes
echo "=== Checking Processes ==="
ps aux | grep python | grep websocket

# Check port 8765
echo "=== Checking Port 8765 ==="
sudo lsof -i :8765

# Check service files
echo "=== Checking Service Files ==="
ls -la /etc/systemd/system/ | grep -i pillpal
ls -la /etc/systemd/system/ | grep -i websocket
```

---

## Common Service Names to Check

- `pillpal-server.service`
- `pillpal-websocket.service`
- `pi-server.service`
- `websocket-server.service`
- `pillpal.service`

Run `sudo systemctl status <service-name>` for each to check if they exist and are enabled.



