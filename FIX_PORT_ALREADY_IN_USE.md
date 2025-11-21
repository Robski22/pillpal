# Fix: Port 8765 Already in Use

## The Error
```
OSError: [Errno 98] error while attempting to bind on address ('0.0.0.0', 8765): address already in use
```

This means another server process is already running on port 8765.

## Quick Fix

### Step 1: Find the Process Using Port 8765
```bash
lsof -i :8765
```
OR
```bash
netstat -tulpn | grep 8765
```
OR
```bash
ps aux | grep pi_websocket_server_PCA9685
```

### Step 2: Kill the Process
```bash
pkill -f pi_websocket_server_PCA9685.py
```

### Step 3: Verify It's Stopped
```bash
ps aux | grep pi_websocket_server_PCA9685
```
Should show nothing (or just the grep command itself)

### Step 4: Start Server Again
```bash
cd /home/justin/pillpal
python3 pi_websocket_server_PCA9685.py
```

## Alternative: Find Process ID and Kill It

### Method 1: Using pkill (Easiest)
```bash
pkill -f pi_websocket_server_PCA9685.py
```

### Method 2: Find PID and Kill
```bash
# Find the process
ps aux | grep pi_websocket_server_PCA9685

# Kill it (replace XXXX with the PID number)
kill XXXX

# If it doesn't die, force kill
kill -9 XXXX
```

### Method 3: Using fuser (if available)
```bash
fuser -k 8765/tcp
```

## Why This Happens
- You started the server twice
- Previous server didn't close properly
- Server crashed but process is still running

## Prevention
Always check if server is running before starting:
```bash
ps aux | grep pi_websocket_server_PCA9685
```

If you see a process, kill it first:
```bash
pkill -f pi_websocket_server_PCA9685.py
```

Then start:
```bash
python3 pi_websocket_server_PCA9685.py
```

