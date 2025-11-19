# Stop Auto-Start Service to Edit Server

## The Problem

Port 8765 is already in use because a service automatically starts the server when the Pi boots. You need to stop and disable it temporarily.

## Step 1: Find What's Using Port 8765

**On your Pi, run:**
```bash
# Find the process using port 8765
sudo lsof -i :8765

# Or use netstat
sudo netstat -tlnp | grep 8765

# Or find Python processes
ps aux | grep python | grep 8765
```

**Note the PID (process ID) - it's the number in the second column**

## Step 2: Stop the Running Process

**Kill the process:**
```bash
# Replace PID with the number you found
kill PID

# Or kill all Python websocket processes
pkill -f "pi_websocket_server"
pkill -f "websocket.*8765"
```

## Step 3: Find and Stop the Auto-Start Service

**Check for systemd services:**
```bash
# List all services
sudo systemctl list-units --type=service | grep -i pillpal
sudo systemctl list-units --type=service | grep -i websocket
sudo systemctl list-units --type=service | grep -i python

# Check specific service names
sudo systemctl status pillpal-server
sudo systemctl status pillpal-websocket
sudo systemctl status pi-server
sudo systemctl status websocket-server
```

**If you find a service, stop it:**
```bash
# Replace 'pillpal-server' with the actual service name
sudo systemctl stop pillpal-server

# Disable it temporarily (so it won't auto-start on next boot)
sudo systemctl disable pillpal-server

# Verify it's stopped
sudo systemctl status pillpal-server
```

## Step 4: Check for Other Auto-Start Methods

### Check rc.local
```bash
cat /etc/rc.local
```

### Check crontab
```bash
# Check user crontab
crontab -l

# Check root crontab
sudo crontab -l
```

### Check startup scripts
```bash
# Check .bashrc
cat ~/.bashrc | grep -i python
cat ~/.bashrc | grep -i websocket

# Check .profile
cat ~/.profile | grep -i python
```

## Step 5: Verify Port is Free

```bash
# Check if port 8765 is free now
sudo lsof -i :8765
# Should show nothing

# Or
sudo netstat -tlnp | grep 8765
# Should show nothing
```

## Step 6: Now Start Your Server Manually

```bash
cd /home/justin/pillpal
python3 pi_websocket_server.py
```

**Now you can edit and test!**

---

## Quick One-Liner to Stop Everything

```bash
# Stop all Python websocket processes
pkill -f "pi_websocket_server"; pkill -f "websocket.*8765"

# Stop common service names
sudo systemctl stop pillpal-server 2>/dev/null
sudo systemctl stop pillpal-websocket 2>/dev/null
sudo systemctl stop pi-server 2>/dev/null

# Verify port is free
sudo lsof -i :8765 || echo "✅ Port 8765 is free!"
```

---

## Re-Enable Auto-Start Later (After Testing)

**When you're done testing and want auto-start back:**
```bash
# Re-enable the service
sudo systemctl enable pillpal-server
sudo systemctl start pillpal-server
```

---

## About Cloudflare and Vercel

- **Cloudflare**: This is a tunnel (probably `cloudflared`) - it doesn't use port 8765, so it's fine
- **Vercel**: This is your frontend deployment - also doesn't use port 8765
- **PCA Server**: This is what's using port 8765 - you need to stop it

---

## Summary

1. **Find the service:** `sudo systemctl list-units --type=service | grep -i pillpal`
2. **Stop it:** `sudo systemctl stop pillpal-server` (replace with actual name)
3. **Disable it:** `sudo systemctl disable pillpal-server`
4. **Kill any running processes:** `pkill -f "pi_websocket_server"`
5. **Verify port is free:** `sudo lsof -i :8765`
6. **Start manually:** `python3 /home/justin/pillpal/pi_websocket_server.py`

Now you can edit and test!

