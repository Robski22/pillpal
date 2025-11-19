# Stop PCA Server Temporarily (For Editing)

## Quick Stop Commands

**SSH to your Pi first:**
```bash
ssh justin@192.168.100.68
```

### Step 1: Find the Running PCA Server Process

```bash
# Find the process
ps aux | grep python | grep pi_websocket_server
```

**You'll see something like:**
```
justin    1234  0.5  2.1  ... python3 /home/justin/pillpal/pi_websocket_server.py
```

**Note the PID number (first number after username, e.g., 1234)**

### Step 2: Stop the Process

**Option A: Kill by PID (replace 1234 with your actual PID)**
```bash
kill 1234
```

**Option B: Kill by process name (easier)**
```bash
pkill -f "pi_websocket_server"
```

**Option C: Kill all Python websocket processes**
```bash
pkill -f "websocket.*8765"
```

### Step 3: Verify It's Stopped

```bash
# Check if process is still running
ps aux | grep python | grep pi_websocket_server

# Check if port 8765 is free
sudo lsof -i :8765
# Should show nothing or "command not found"
```

### Step 4: Edit Your File

Now you can edit the file:
```bash
nano /home/justin/pillpal/pi_websocket_server.py
```

Or use VS Code Remote SSH to edit it directly.

### Step 5: Restart When Done Editing

After you finish editing, start it manually:
```bash
cd /home/justin/pillpal
python3 pi_websocket_server.py
```

---

## One-Line Command to Stop

```bash
pkill -f "pi_websocket_server" && echo "✅ PCA server stopped" || echo "⚠️ No process found"
```

---

## If It Keeps Restarting Automatically

If the server keeps restarting after you kill it, there's a service or script auto-starting it:

```bash
# Check for systemd service
sudo systemctl status pillpal-server
sudo systemctl status pillpal-websocket

# If found, stop it temporarily (doesn't disable permanently)
sudo systemctl stop pillpal-server
```

---

## Summary

1. **Stop:** `pkill -f "pi_websocket_server"`
2. **Verify:** `ps aux | grep python | grep websocket` (should show nothing)
3. **Edit:** `nano /home/justin/pillpal/pi_websocket_server.py`
4. **Restart:** `python3 /home/justin/pillpal/pi_websocket_server.py`

