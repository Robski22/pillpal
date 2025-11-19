# Find What's Auto-Restarting the Server

## The Problem

When you kill the process, a new one immediately starts with a different PID. This means something is watching and restarting it.

## Step 1: Find the Auto-Restart Mechanism

### Check for systemd services with auto-restart

```bash
# Check all services for "Restart" policy
sudo systemctl list-units --type=service --all | grep -E "(pillpal|websocket|python)"

# Check service files for Restart=always
sudo grep -r "Restart=always" /etc/systemd/system/ | grep -i pillpal
sudo grep -r "Restart=always" /etc/systemd/system/ | grep -i websocket

# Check user services
systemctl --user list-units --all | grep -i pillpal
```

### Check for supervisor or process managers

```bash
# Check for supervisor
sudo supervisorctl status
sudo systemctl status supervisor

# Check for systemd user services
systemctl --user list-units --all
```

### Check for monitoring scripts

```bash
# Find scripts that might be monitoring the server
ps aux | grep -E "(watch|monitor|restart|python.*websocket)"

# Check for scripts in common locations
ls -la ~/pillpal/*.sh
ls -la /home/justin/pillpal/*.sh
find ~ -name "*restart*" -o -name "*watch*" 2>/dev/null
```

### Check for systemd user services

```bash
# List all user services
systemctl --user list-units --all --type=service

# Check user service files
ls -la ~/.config/systemd/user/
ls -la /etc/systemd/user/
```

## Step 2: Check for Hidden Processes

```bash
# Find parent process of the Python server
ps -ef | grep 1842
# Look at the PPID (parent process ID)

# Check what started it
pstree -p 1842

# Find all Python processes and their parents
ps auxf | grep python
```

## Step 3: Check Startup Scripts

```bash
# Check .bashrc
cat ~/.bashrc | grep -i python
cat ~/.bashrc | grep -i websocket

# Check .profile
cat ~/.profile | grep -i python

# Check .bash_profile
cat ~/.bash_profile | grep -i python

# Check rc.local
cat /etc/rc.local
```

## Step 4: Check for Cloudflare Auto-Start

Since cloudflar is connected, check if it's auto-starting the server:

```bash
# Check cloudflare config
cat ~/.cloudflared/config.yml
find ~ -name "*cloudflare*" -type f 2>/dev/null

# Check cloudflare service
sudo systemctl status cloudflared-quick-tunnel
cat /etc/systemd/system/cloudflared-quick-tunnel.service
```

## Step 5: Nuclear Option - Disable Everything Temporarily

```bash
# Stop all systemd services that might restart it
sudo systemctl stop pillpal-server 2>/dev/null
sudo systemctl stop pillpal-websocket 2>/dev/null
sudo systemctl disable pillpal-server 2>/dev/null
sudo systemctl disable pillpal-websocket 2>/dev/null

# Stop user services
systemctl --user stop pillpal-server 2>/dev/null
systemctl --user disable pillpal-server 2>/dev/null

# Kill the process
kill -9 1842

# Check if it restarts
sleep 3
sudo lsof -i :8765
```

## Step 6: Find the Parent Process

```bash
# Find what's starting the Python process
ps -ef | grep python | grep websocket

# Or use pstree to see the process tree
pstree -ap | grep python
```

---

## Quick Diagnostic Commands

```bash
# Find all processes related to websocket
ps aux | grep -E "(websocket|pillpal|pi_websocket)"

# Find parent of current process
ps -o ppid= -p 1842 | xargs ps -p

# Check systemd for auto-restart
sudo systemctl list-units --type=service --all | grep -E "(pillpal|websocket)"
sudo systemctl list-unit-files | grep -E "(pillpal|websocket)"
```

---

## Most Likely Causes

1. **Systemd service with Restart=always** - Check service files
2. **Supervisor process** - Check supervisorctl
3. **Cloudflare tunnel** - Might be configured to start the server
4. **Cron job** - Check crontab
5. **Startup script** - Check .bashrc, rc.local

Run these commands and share the output!

