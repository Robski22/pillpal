# 🔍 Check Why WebSocket Server Didn't Start

## Current Situation:
- ✅ Service is running (PID 1784)
- ✅ LCD is working ("PillPal READY" messages)
- ❌ WebSocket server NOT listening on port 8765
- ❌ No "WebSocket server running" message in logs

This means the server started but the WebSocket server initialization failed.

---

## Step 1: Check Full Startup Logs

The status command only shows recent logs. Check the full startup sequence:

```bash
# Check logs from when service started (1 hour ago)
sudo journalctl -u pillpal --since "1 hour ago" | head -100

# Or check all logs since boot
sudo journalctl -u pillpal --since "today"

# Look for startup messages
sudo journalctl -u pillpal | grep -i "websocket\|server\|starting\|listening\|error\|failed"
```

**Look for:**
- "🚀 Starting PillPal Raspberry Pi Server"
- "PillPal WebSocket Server Starting..."
- "Listening on 0.0.0.0:8765"
- "WebSocket server running on ws://0.0.0.0:8765"
- Any ERROR or Exception messages

---

## Step 2: Check for Import Errors

The WebSocket server might have failed to start due to missing libraries:

```bash
# Check for import errors
sudo journalctl -u pillpal | grep -i "import\|module\|no module\|cannot import"
```

---

## Step 3: Check for Exception/Traceback

```bash
# Check for Python exceptions
sudo journalctl -u pillpal | grep -A 10 -i "exception\|traceback\|error\|failed"
```

---

## Step 4: Test Server Manually

Stop the service and run it manually to see errors:

```bash
# Stop the service
sudo systemctl stop pillpal

# Wait a moment
sleep 2

# Run manually to see all output
cd ~/pillpal
python3 pi_websocket_server_PCA9685.py
```

**Watch for:**
- Any errors during startup
- Does it reach "WebSocket server running"?
- Any exceptions or tracebacks

Press `Ctrl+C` to stop it, then restart the service.

---

## Step 5: Check Server Code Path

The server might be getting stuck before reaching the WebSocket server initialization. Check if it's reaching that code:

```bash
# Check logs for specific startup messages
sudo journalctl -u pillpal | grep -E "Starting|Server Starting|Listening|WebSocket server running"
```

---

## Common Issues:

### Issue 1: Server Crashes During Initialization

If hardware initialization fails, the server might crash before starting WebSocket server. Check for:
- PCA9685 initialization errors
- GPIO errors
- LCD errors
- SIMCOM errors

### Issue 2: AsyncIO Event Loop Issues

The WebSocket server uses asyncio. Check for:
- Event loop errors
- Async/await issues
- Threading conflicts

### Issue 3: Port Already in Use (Unlikely)

Even though port check showed nothing, double-check:

```bash
sudo lsof -i :8765
sudo fuser 8765/tcp
```

---

## Quick Diagnostic:

```bash
# 1. Full logs since service start
sudo journalctl -u pillpal --since "1 hour ago" | less

# 2. Search for errors
sudo journalctl -u pillpal | grep -i error

# 3. Search for WebSocket messages
sudo journalctl -u pillpal | grep -i websocket

# 4. Check if server code is being reached
sudo journalctl -u pillpal | grep -E "Starting PillPal|Server Starting|Listening"
```

---

## Expected Log Sequence:

When server starts correctly, you should see:
1. "🚀 Starting PillPal Raspberry Pi Server"
2. Hardware initialization messages (PCA9685, LCD, etc.)
3. "PillPal WebSocket Server Starting..."
4. "Listening on 0.0.0.0:8765"
5. "WebSocket server running on ws://0.0.0.0:8765"
6. Then periodic "LCD: PillPal READY" messages

If you only see #6, the WebSocket server didn't start.


