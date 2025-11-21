# Find and Kill What's Using Port 8765

## Step 1: Find What's Using the Port

```bash
# Check what's using port 8765
sudo lsof -i :8765

# Or use netstat
sudo netstat -tlnp | grep 8765

# Or use ss
sudo ss -tlnp | grep 8765
```

**Note the PID (process ID) from the output**

## Step 2: Kill the Process

```bash
# Replace PID with the actual number you see
kill PID

# If that doesn't work, force kill
kill -9 PID

# Or kill all Python processes (be careful!)
pkill -9 python
```

## Step 3: Check if It Restarts Automatically

**If the process keeps coming back, check for:**

### A. Systemd Service
```bash
# Check all services
sudo systemctl list-units --type=service --all | grep -i pillpal
sudo systemctl list-units --type=service --all | grep -i websocket

# Check if any are enabled
sudo systemctl list-unit-files | grep -i pillpal
```

### B. Cron Job
```bash
# Check user crontab
crontab -l

# Check root crontab
sudo crontab -l

# Check system-wide cron
sudo cat /etc/crontab
ls -la /etc/cron.d/
ls -la /etc/cron.daily/
```

### C. Startup Scripts
```bash
# Check rc.local
cat /etc/rc.local

# Check .bashrc
cat ~/.bashrc | grep -i python
cat ~/.bashrc | grep -i websocket

# Check .profile
cat ~/.profile | grep -i python
```

### D. Systemd User Service
```bash
# Check user services
systemctl --user list-units | grep -i pillpal
systemctl --user list-units | grep -i websocket
```

## Step 4: Verify Port is Free

```bash
# Check again
sudo lsof -i :8765
# Should show nothing (or just cloudflar, which is fine)

# Or
sudo netstat -tlnp | grep 8765
# Should show nothing
```

## Step 5: Start Your Server

```bash
cd /home/justin/pillpal
python3 pi_websocket_server.py
```

---

## Quick Debug Commands

```bash
# Find all Python processes
ps aux | grep python

# Find processes listening on ports
sudo lsof -i -P -n | grep LISTEN

# Check if something is auto-restarting
watch -n 1 'ps aux | grep python | grep websocket'
# Press Ctrl+C to stop watching
```

---

## If Process Keeps Restarting

**Check for a watchdog or auto-restart script:**

```bash
# Check for systemd auto-restart
sudo systemctl status pillpal-server
# Look for "Restart=" in the service file

# Check for supervisor
sudo supervisorctl status

# Check for screen/tmux sessions
screen -ls
tmux ls
```

---

## Nuclear Option (Kill Everything)

```bash
# Kill all Python websocket processes
pkill -9 -f "pi_websocket_server"
pkill -9 -f "websocket.*8765"

# Kill all Python processes (CAREFUL - this kills ALL Python!)
# pkill -9 python

# Check port
sudo lsof -i :8765 || echo "✅ Port is free!"
```



