# LED Fix - Green and Red LEDs

## What Was Fixed

### LED Behavior:
- **Green LED (GPIO27)**: ON when servo1 is at **0°, 30°, 60°, 90°, 120°**
- **Red LED (GPIO22)**: ON when servo1 is at **150°, 180°**
- **Both OFF**: For any other angle

## Test the Fix

### Step 1: Copy Updated Server File
```bash
scp C:\Users\Feitan\PillApp\pillpal\pi-server\pi_websocket_server_PCA9685.py justin@192.168.100.220:/home/justin/pillpal/
```

### Step 2: Restart Server
```bash
ssh justin@192.168.100.220
cd /home/justin/pillpal
pkill -f pi_websocket_server_PCA9685.py
sleep 2
python3 pi_websocket_server_PCA9685.py
```

### Step 3: Check Startup Logs
Look for:
```
✅ LEDs initialized: GPIO27 (GREEN), GPIO22 (RED)
```

### Step 4: Test LEDs

#### Test Green LED (GPIO27):
1. Move servo1 to **0°** (or 30°, 60°, 90°, 120°)
2. **Green LED should turn ON**
3. **Red LED should be OFF**
4. Check logs: `💚 GREEN LED (GPIO27) ON - Position: X°`

#### Test Red LED (GPIO22):
1. Move servo1 to **150°** (or 180°)
2. **Red LED should turn ON**
3. **Green LED should be OFF**
4. Check logs: `❤️ RED LED (GPIO22) ON - Position: X°`

#### Test Both OFF:
1. Move servo1 to any angle NOT in [0, 30, 60, 90, 120, 150, 180]
2. **Both LEDs should be OFF**
3. Check logs: `⚪ Both LEDs OFF - Position: X°`

## Wiring Check

Make sure LEDs are wired correctly:

### Green LED (GPIO27):
```
Raspberry Pi GPIO27 (Pin 13) → 220Ω Resistor → Green LED + (anode/long leg)
Green LED - (cathode/short leg) → GND
```

### Red LED (GPIO22):
```
Raspberry Pi GPIO22 (Pin 15) → 220Ω Resistor → Red LED + (anode/long leg)
Red LED - (cathode/short leg) → GND
```

**Important**: LEDs need resistors (220Ω recommended) to prevent damage!

## Quick Test Script

If you want to test LEDs directly:

```bash
# SSH into Raspberry Pi
ssh justin@192.168.100.220
cd /home/justin/pillpal

# Create test script
cat > test_leds.py << 'EOF'
import RPi.GPIO as GPIO
import time

GPIO.setmode(GPIO.BCM)
GPIO.setup(27, GPIO.OUT)  # Green LED
GPIO.setup(22, GPIO.OUT)  # Red LED

print("Testing LEDs...")
print("Green LED (GPIO27) ON for 2 seconds...")
GPIO.output(27, GPIO.HIGH)
time.sleep(2)
GPIO.output(27, GPIO.LOW)
print("Green LED OFF")

print("Red LED (GPIO22) ON for 2 seconds...")
GPIO.output(22, GPIO.HIGH)
time.sleep(2)
GPIO.output(22, GPIO.LOW)
print("Red LED OFF")

GPIO.cleanup()
print("Test complete!")
EOF

python3 test_leds.py
```

**Expected**: Green LED lights up, then Red LED lights up.

## Troubleshooting

### If LEDs Don't Light Up:

1. **Check Wiring:**
   - GPIO27 → Resistor → Green LED + → Green LED - → GND
   - GPIO22 → Resistor → Red LED + → Red LED - → GND

2. **Check Resistors:**
   - LEDs need 220Ω resistors
   - Without resistors, LEDs might burn out or not work

3. **Check LED Polarity:**
   - Long leg = + (anode) → goes to GPIO/resistor
   - Short leg = - (cathode) → goes to GND

4. **Check GPIO:**
   - Run test script above
   - If test script works but server doesn't: Check server logs

5. **Check Logs:**
   - Look for: `✅ LEDs initialized: GPIO27 (GREEN), GPIO22 (RED)`
   - Look for: `💚 GREEN LED (GPIO27) ON` or `❤️ RED LED (GPIO22) ON`
   - If you see errors: `❌ Error updating LEDs: [error]`

## Expected Log Messages

When servo moves to different positions:

```
# At 0°, 30°, 60°, 90°, 120°:
💚 GREEN LED (GPIO27) ON - Position: 30°

# At 150°, 180°:
❤️ RED LED (GPIO22) ON - Position: 150°

# At other angles:
⚪ Both LEDs OFF - Position: 45° (not a standard position)
```

## Summary

✅ **Fixed**: LEDs now turn on/off based on exact servo positions
- Green (GPIO27): 0°, 30°, 60°, 90°, 120°
- Red (GPIO22): 150°, 180°
- Both OFF: Other positions

Test it and let me know if it works!

