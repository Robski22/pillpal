# LED Fix - Final Solution

## Problem
LEDs are blinking or not staying on at the correct angles.

## Solution
The code now:
1. **Tracks both angle AND state** - Only updates GPIO when either changes
2. **Early return** - If angle and state are the same, returns immediately (no GPIO writes)
3. **Periodic check** - Checks servo1 angle every 1 second to keep LEDs on

## LED Configuration

### Green LED (GPIO22):
- **ON** for: 0°, 30°, 60°, 90°, 120°
- **OFF** for: 150°, 180°, and other angles

### Red LED (GPIO27):
- **ON** for: 150°, 180°
- **OFF** for: 0°, 30°, 60°, 90°, 120°, and other angles

## How It Works

1. **Periodic Task**: Checks servo1 angle every 1 second
2. **State Tracking**: Remembers last angle and LED state
3. **Smart Updates**: Only writes to GPIO when angle or state changes
4. **No Blinking**: If angle is the same, no GPIO writes = LEDs stay on

## Test Hardware First

Before testing with the server, test LEDs directly:

### Step 1: Copy test script
```bash
scp C:\Users\Feitan\PillApp\pillpal\test_leds_final.py justin@192.168.100.220:/home/justin/pillpal/
```

### Step 2: Run test
```bash
ssh justin@192.168.100.220
cd /home/justin/pillpal
python3 test_leds_final.py
```

**Expected**: 
- Green LED lights up for 0°, 30°, 60°, 90°, 120°
- Red LED lights up for 150°, 180°

**If LEDs don't light up**: Hardware/wiring issue (not code issue)

## Test with Server

### Step 1: Copy updated server
```bash
scp C:\Users\Feitan\PillApp\pillpal\pi-server\pi_websocket_server_PCA9685.py justin@192.168.100.220:/home/justin/pillpal/
```

### Step 2: Restart server
```bash
ssh justin@192.168.100.220
cd /home/justin/pillpal
pkill -f pi_websocket_server_PCA9685.py
sleep 2
python3 pi_websocket_server_PCA9685.py
```

### Step 3: Check logs

Look for:
```
✅ LEDs initialized: GPIO22 (GREEN - lots of medicine), GPIO27 (RED - low medicine)
💡 LED update task started - checking servo1 angle every 1 second
💚 GREEN LED (GPIO22) ON, RED LED (GPIO27) OFF - Position: 30°
```

### Step 4: Test LEDs

1. **Move servo1 to 0°, 30°, 60°, 90°, or 120°**
   - Green LED should turn ON and stay ON
   - Red LED should be OFF
   - No blinking

2. **Move servo1 to 150° or 180°**
   - Red LED should turn ON and stay ON
   - Green LED should be OFF
   - No blinking

## Troubleshooting

### If LEDs still blink:

1. **Check if hardware test works**:
   - Run `test_leds_final.py`
   - If hardware test works but server doesn't: Code issue
   - If hardware test doesn't work: Hardware/wiring issue

2. **Check server logs**:
   - Look for LED update messages
   - If you see messages every second: Task is running
   - If you see "Angle hasn't changed" messages: Good (means no GPIO writes)

3. **Check GPIO pins**:
   - Verify GPIO22 = Green LED
   - Verify GPIO27 = Red LED
   - Check wiring and resistors

4. **Check for conflicts**:
   - Make sure no other code is writing to GPIO22 or GPIO27
   - Check if GPIO.cleanup() is being called somewhere (it shouldn't be)

### If LEDs don't turn on at all:

1. **Check initialization**:
   - Look for: `✅ LEDs initialized: GPIO22 (GREEN), GPIO27 (RED)`
   - If missing: GPIO setup failed

2. **Check wiring**:
   - GPIO22 → 220Ω resistor → Green LED + → Green LED - → GND
   - GPIO27 → 220Ω resistor → Red LED + → Red LED - → GND

3. **Test with hardware test script**:
   - Run `test_leds_final.py` first
   - If that works, LEDs are fine, issue is in server code

## Code Logic

```python
# Only update if angle OR state changed
if angle_int == self._last_angle and desired_state == self._last_led_state:
    return  # Don't write to GPIO - LEDs stay on

# Angle or state changed - update LEDs
if desired_state == 'green':
    GPIO.output(LED_RED_PIN, GPIO.LOW)    # Red OFF
    GPIO.output(LED_GREEN_PIN, GPIO.HIGH) # Green ON
elif desired_state == 'red':
    GPIO.output(LED_GREEN_PIN, GPIO.LOW)   # Green OFF
    GPIO.output(LED_RED_PIN, GPIO.HIGH)   # Red ON
```

This ensures:
- LEDs only update when angle changes
- No unnecessary GPIO writes = no blinking
- LEDs stay ON as long as angle doesn't change

