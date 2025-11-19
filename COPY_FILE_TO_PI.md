# Copy Servo Fix File to Raspberry Pi

## You're Connected! ✅

Your Pi IP is: **192.168.100.220**

---

## Method 1: Using SCP from Windows (Easiest)

### Step 1: Open New PowerShell/Command Prompt on Windows

**Keep your SSH session open, but open a NEW terminal on Windows**

### Step 2: Copy the File

```powershell
# Navigate to your project folder
cd C:\Users\Feitan\PillApp\pillpal

# Copy file to Pi
scp pi-server\pi_websocket_server.py justin@192.168.100.220:/home/justin/pillpal/
```

**Or if the folder doesn't exist on Pi:**
```powershell
scp pi-server\pi_websocket_server.py justin@192.168.100.220:/home/justin/
```

### Step 3: Verify File Copied

**Back in your SSH session (on Pi), check:**
```bash
ls -la /home/justin/pillpal/pi_websocket_server.py
# Or
ls -la /home/justin/pi_websocket_server.py
```

---

## Method 2: Create File Directly on Pi (If SCP Doesn't Work)

### Step 1: On Pi (SSH session), create the file:
```bash
nano /home/justin/pillpal/pi_websocket_server.py
```

### Step 2: Copy Content from Windows

**On Windows, open the file:**
- `C:\Users\Feitan\PillApp\pillpal\pi-server\pi_websocket_server.py`

**Copy all the content** (Ctrl+A, Ctrl+C)

### Step 3: Paste into Pi

**In the nano editor on Pi:**
- Right-click to paste (or Shift+Insert)
- Save: `Ctrl+O`, `Enter`
- Exit: `Ctrl+X`

---

## Method 3: Using VS Code Remote SSH (Best for Editing)

### Step 1: In VS Code
1. Install "Remote - SSH" extension (if not installed)
2. Press `Ctrl+Shift+P`
3. Type: "Remote-SSH: Connect to Host"
4. Enter: `justin@192.168.100.220`
5. Enter password

### Step 2: Open Pi Folder
1. File → Open Folder
2. Navigate to `/home/justin/pillpal/` (or create it)

### Step 3: Copy File
1. In VS Code, open: `PillApp/pillpal/pi-server/pi_websocket_server.py`
2. Copy all content (Ctrl+A, Ctrl+C)
3. In Remote SSH window, create new file: `pi_websocket_server.py`
4. Paste content (Ctrl+V)
5. Save (Ctrl+S)

---

## After Copying File

### Step 1: Create Directory (if needed)
```bash
mkdir -p /home/justin/pillpal
cd /home/justin/pillpal
```

### Step 2: Make File Executable
```bash
chmod +x pi_websocket_server.py
```

### Step 3: Install Dependencies
```bash
pip3 install websockets asyncio
```

### Step 4: Uncomment Hardware Code

**Edit the file:**
```bash
nano pi_websocket_server.py
```

**Find and uncomment these sections:**

**Line 22-23 (Hardware imports):**
```python
from gpiozero import Servo
import RPi.GPIO as GPIO
```

**Line 42-47 (Servo initialization):**
```python
from gpiozero import Servo
self.servos['servo1'] = Servo(18)  # Change pin if needed
self.servos['servo1'].value = None  # Don't reset!
```

**Line 77-82 (Servo movement):**
```python
servo = self.servos[servo_id]
value = (angle / 90.0) - 1.0
servo.value = value
self.servo_positions[servo_id] = angle
```

**Save:** `Ctrl+O`, `Enter`, `Ctrl+X`

### Step 5: Stop Old Server (if running)
```bash
# Find old server
ps aux | grep websocket
# Or
ps aux | grep python

# Kill it (replace PID with actual process ID):
kill PID_NUMBER
# Or kill all Python websocket processes:
pkill -f websocket
```

### Step 6: Test New Server
```bash
python3 /home/justin/pillpal/pi_websocket_server.py
```

**You should see:**
```
PillPal WebSocket Server Starting...
Listening on 0.0.0.0:8765
Servo positions will be maintained (not reset)
WebSocket server running on ws://0.0.0.0:8765
```

---

## Quick Commands Summary

**From Windows (new terminal):**
```powershell
cd C:\Users\Feitan\PillApp\pillpal
scp pi-server\pi_websocket_server.py justin@192.168.100.220:/home/justin/pillpal/
```

**On Pi (SSH session):**
```bash
cd /home/justin/pillpal
pip3 install websockets asyncio gpiozero
nano pi_websocket_server.py
# Uncomment hardware code, save
python3 pi_websocket_server.py
```

---

## ✅ Test the Fix

1. **Move servo to position** (e.g., 90°) via web app
2. **Turn off Pi** (or stop server: `Ctrl+C`)
3. **Turn Pi back on** (or restart server)
4. **Servo should still be at 90°** ✅ (not reset to 0°)


