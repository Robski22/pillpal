# How to Deploy the Debug Server

## Step 1: SSH into your Raspberry Pi

On your Windows computer, open PowerShell or Command Prompt and run:
```bash
ssh justin@192.168.100.68
```
(Use your Pi's actual IP address if different)

---

## Step 2: Stop the Old Server

Once connected to the Pi, run these commands:

```bash
# Find running Python servers
ps aux | grep python

# Kill the old server (replace PID with the number you see)
pkill -f pi_server_pca9685
# OR kill all Python processes (be careful!)
pkill -f python3
```

---

## Step 3: Copy the New File to Pi

**Option A: Using SCP from Windows (Easier)**

On your Windows computer (in a NEW PowerShell window, NOT the SSH session):

```powershell
cd C:\Users\Feitan\PillApp\pillpal\pi-server
scp pi_websocket_server_FINAL.py justin@192.168.100.68:/home/justin/pillpal/pi_websocket_server.py
```

**Option B: Manual Copy-Paste**

1. On Windows, open: `C:\Users\Feitan\PillApp\pillpal\pi-server\pi_websocket_server_FINAL.py`
2. Select all (`Ctrl+A`) and copy (`Ctrl+C`)
3. In your SSH session on Pi, run:
   ```bash
   cd /home/justin/pillpal
   nano pi_websocket_server.py
   ```
4. Delete all content (`Ctrl+K` repeatedly)
5. Paste the new content (right-click or `Shift+Insert`)
6. Save: `Ctrl+O`, then `Enter`
7. Exit: `Ctrl+X`

---

## Step 4: Run the New Server

On your Pi (in the SSH session):

```bash
cd /home/justin/pillpal
python3 pi_websocket_server.py
```

You should see:
- "Servos initialized (positions maintained)"
- "WebSocket server running on ws://0.0.0.0:8765"
- "Client connected from..."

---

## Step 5: Test It

1. Keep the SSH session open (you'll see logs)
2. Open your web app in a browser
3. Try to dispense a medication
4. Watch the SSH terminal - you should see detailed logs like:
   - `📨 Raw message received: ...`
   - `🎯 Dispense command received: servo_id='servo1'...`
   - `🚀 dispense() called: servo_id='servo1'...`
   - `✅ Servo servo1 moved to 30.0 degrees`

---

## Troubleshooting

**If you see "Address already in use":**
- The old server is still running
- Run: `pkill -f python3` and try again

**If you see "Servo servo1 not found":**
- Check what servo_id your web app is sending
- The logs will show: `Available servos: ['servo1']`

**If servo doesn't move:**
- Check the logs for errors
- Verify GPIO pin number (currently set to pin 18)
- If using PCA9685 board, use `pi_websocket_server_PCA9685.py` instead

---

## What the Debug Logs Show

The new version has detailed logging that shows:
- ✅ Every message received from web app
- ✅ What servo_id is being requested
- ✅ If the servo is found
- ✅ Step-by-step servo movement
- ✅ Any errors that occur

This will help us figure out why the servo isn't moving!

