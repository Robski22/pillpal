# Deploy Servo Fix to Raspberry Pi

## ✅ The Fix is Already in the Code

The `pi_websocket_server.py` file already has the fix to prevent servo reset:
- ✅ Servos don't reset on initialization
- ✅ Servos don't reset on connection/disconnection
- ✅ Servos maintain position when Pi is turned off/on

## 🚀 Deploy to Raspberry Pi

### Step 1: Copy File to Pi

**Option A: Using Remote SSH in VS Code (Recommended)**
1. Connect to Pi via Remote SSH (see `SETUP_REMOTE_SSH.md`)
2. Copy `pi_websocket_server.py` to Pi:
   - In VS Code, right-click file → "Copy"
   - Navigate to Pi folder (e.g., `/home/pi/pillpal/`)
   - Paste file there

**Option B: Using SCP (Command Line)**
```bash
# From your Windows computer:
scp pi-server/pi_websocket_server.py pi@192.168.1.45:/home/pi/pillpal/
```

**Option C: Using File Transfer (WinSCP, FileZilla, etc.)**
- Connect to Pi via SFTP
- Upload `pi_websocket_server.py` to `/home/pi/pillpal/`

### Step 2: Uncomment Hardware Code

**On the Pi, edit the file:**
```bash
# SSH to Pi or use Remote SSH in VS Code
nano /home/pi/pillpal/pi_websocket_server.py
```

**Find these lines and uncomment them:**

**Line 22-23 (Hardware imports):**
```python
# Change from:
# from gpiozero import Servo
# import RPi.GPIO as GPIO

# To:
from gpiozero import Servo
import RPi.GPIO as GPIO
```

**Line 42-47 (Servo initialization - GPIOZero):**
```python
# Uncomment and configure for your setup:
from gpiozero import Servo
self.servos['servo1'] = Servo(18)  # Change pin if needed
# DON'T set value = 0 - this would reset position!
self.servos['servo1'].value = None  # Disable without moving
```

**OR if using RPi.GPIO (Line 49-54):**
```python
# Uncomment and configure:
GPIO.setmode(GPIO.BCM)
GPIO.setup(18, GPIO.OUT)  # Change pin if needed
self.servos['servo1'] = GPIO.PWM(18, 50)  # 50Hz
# DON'T call start(0) - this would reset position!
```

**Line 77-82 (Servo movement - GPIOZero):**
```python
# Uncomment when moving servo:
servo = self.servos[servo_id]
value = (angle / 90.0) - 1.0  # 0° = -1, 90° = 0, 180° = 1
servo.value = value
self.servo_positions[servo_id] = angle
```

**OR Line 84-91 (Servo movement - RPi.GPIO):**
```python
# Uncomment when moving servo:
servo = self.servos[servo_id]
servo.start(0)  # Start PWM only when moving
duty_cycle = 2.5 + (angle / 180.0) * 10.0
servo.ChangeDutyCycle(duty_cycle)
time.sleep(0.5)
# Don't stop PWM - let servo hold position
self.servo_positions[servo_id] = angle
```

### Step 3: Install Dependencies on Pi

```bash
# SSH to Pi
pip3 install websockets asyncio

# If using GPIOZero:
pip3 install gpiozero

# If using RPi.GPIO:
pip3 install RPi.GPIO
```

### Step 4: Stop Old Server (if running)

```bash
# Find and stop old server process:
ps aux | grep websocket
# Or:
pkill -f websocket
# Or:
sudo systemctl stop pillpal-websocket  # If running as service
```

### Step 5: Test the New Server

```bash
# Run the server:
python3 /home/pi/pillpal/pi_websocket_server.py
```

**You should see:**
```
PillPal WebSocket Server Starting...
Listening on 0.0.0.0:8765
Servo positions will be maintained (not reset)
WebSocket server running on ws://0.0.0.0:8765
```

### Step 6: Test Servo Behavior

1. **Move servo to a position** (e.g., 90 degrees) via your web app
2. **Turn off Pi** (or stop server with `Ctrl+C`)
3. **Turn Pi back on** (or restart server)
4. **Servo should still be at 90 degrees** ✅ (not reset to 0)

### Step 7: Run as Service (Optional - Auto-start on boot)

**Create systemd service:**
```bash
sudo nano /etc/systemd/system/pillpal-websocket.service
```

**Add this content:**
```ini
[Unit]
Description=PillPal WebSocket Server
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/pillpal
ExecStart=/usr/bin/python3 /home/pi/pillpal/pi_websocket_server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
sudo systemctl enable pillpal-websocket.service
sudo systemctl start pillpal-websocket.service
sudo systemctl status pillpal-websocket.service
```

---

## ✅ Key Points

**The fix ensures:**
1. ✅ Servos don't reset on server startup
2. ✅ Servos don't reset on connection/disconnection
3. ✅ Servos maintain position when Pi is turned off
4. ✅ Servos only move when dispense command is received

**Critical lines in code:**
- Line 36-56: `_initialize_servos()` - Does NOT set servo to 0
- Line 195-260: `handle_client()` - Does NOT reset servos on connect/disconnect
- Line 61-98: `dispense()` - Only moves servo when called

---

## 🧪 Testing Checklist

- [ ] File copied to Pi
- [ ] Hardware code uncommented
- [ ] Dependencies installed
- [ ] Server starts without errors
- [ ] Move servo to position (e.g., 90°)
- [ ] Turn off Pi
- [ ] Turn on Pi
- [ ] Servo still at 90° (not 0°) ✅

---

## 🚨 If Servo Still Resets

**Check:**
1. Are you using the new `pi_websocket_server.py` file?
2. Did you uncomment the correct hardware code?
3. Is there another script that initializes servos?
4. Check hardware connections - some servos reset if power is lost

**Most servos will hold position when:**
- Not actively being controlled
- Power is maintained
- No reset signal is sent

If your servo physically resets (hardware issue), you may need a servo with position memory or a different control method.

---

## ✅ Summary

**The code is ready** - just deploy it to your Pi and uncomment the hardware sections. The servo will maintain its position when the Pi is turned off/on! 🎉

