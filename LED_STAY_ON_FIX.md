# LED Stay On Fix - Final Solution

## Problem
LEDs are only staying on for 2 seconds, then turning off. They should stay on as long as the servo1 angle doesn't change.

## Solution Implemented

### 1. **Startup Initialization**
- Server reads servo1 angle at startup
- LEDs are set immediately using `force_update=True`
- LEDs will stay on based on the angle:
  - **Green (GPIO22)**: 0°, 30°, 60°, 90°, 120°
  - **Red (GPIO27)**: 150°, 180°

### 2. **Periodic Task**
- Checks servo1 angle every 1 second
- Only updates GPIO if angle changes
- If angle is the same, returns early (no GPIO writes) = LEDs stay ON

### 3. **State Tracking**
- Tracks both `_last_angle` and `_last_led_state`
- Only writes to GPIO when angle OR state changes
- Prevents unnecessary GPIO writes = no blinking, LEDs stay on

## How It Works

```python
# At startup:
current_angle = servo_controller.get_position('servo1')
led_controller.update_leds(current_angle, force_update=True)  # Force set LEDs

# In periodic task (every 1 second):
current_angle = servo_controller.get_position('servo1')
led_controller.update_leds(current_angle)  # Only updates if angle changed
```

## Test Instructions

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

### Step 3: Check startup logs
Look for:
```
🔍 Reading servo1 angle at startup: 30°
💡 LEDs initialized and set for servo1 position: 30°
💚 GREEN LED (GPIO22) ON, RED LED (GPIO27) OFF - Position: 30°
💡 LED update task started - checking servo1 angle every 1 second
```

### Step 4: Test LED behavior

1. **At startup**: 
   - If servo1 is at 0°, 30°, 60°, 90°, or 120° → Green LED should turn ON and stay ON
   - If servo1 is at 150° or 180° → Red LED should turn ON and stay ON

2. **After 2 seconds**: 
   - LEDs should still be ON (not turning off)
   - Periodic task checks angle but doesn't write to GPIO if angle is the same

3. **When servo1 moves**:
   - If moves to different angle → LED changes accordingly
   - If stays at same angle → LED stays ON

## Troubleshooting

### If LEDs turn off after 2 seconds:

1. **Check logs for periodic task**:
   - Look for: `💡 LED update task started`
   - If missing: Task not starting

2. **Check if angle is being read correctly**:
   - Look for: `🔍 Reading servo1 angle at startup: XX°`
   - Verify the angle matches servo1 position

3. **Check for GPIO conflicts**:
   - Make sure no other code is writing to GPIO22 or GPIO27
   - Check if `GPIO.cleanup()` is being called (it shouldn't be)

4. **Check hardware**:
   - Run `test_leds_final.py` to verify LEDs work
   - Check wiring: GPIO22 → Green, GPIO27 → Red

### If LEDs don't turn on at startup:

1. **Check initialization logs**:
   - Look for: `✅ LEDs initialized: GPIO22 (GREEN), GPIO27 (RED)`
   - If missing: GPIO setup failed

2. **Check servo1 angle reading**:
   - Look for: `🔍 Reading servo1 angle at startup: XX°`
   - If "not available": Servo controller issue

3. **Force update**:
   - The code uses `force_update=True` at startup
   - This bypasses the angle check and forces LED update

## Code Logic

```python
def update_leds(self, servo1_angle: float, force_update: bool = False):
    angle_int = int(round(servo1_angle))
    
    # Determine desired state
    if angle_int in [0, 30, 60, 90, 120]:
        desired_state = 'green'
    elif angle_int in [150, 180]:
        desired_state = 'red'
    else:
        desired_state = 'off'
    
    # Only update if angle/state changed OR force_update
    if not force_update and angle_int == self._last_angle and desired_state == self._last_led_state:
        return  # Don't write to GPIO - LEDs stay ON
    
    # Update LEDs
    if desired_state == 'green':
        GPIO.output(LED_RED_PIN, GPIO.LOW)    # Red OFF
        GPIO.output(LED_GREEN_PIN, GPIO.HIGH) # Green ON (stays on)
    elif desired_state == 'red':
        GPIO.output(LED_GREEN_PIN, GPIO.LOW)  # Green OFF
        GPIO.output(LED_RED_PIN, GPIO.HIGH)   # Red ON (stays on)
```

This ensures:
- LEDs set at startup based on current angle
- LEDs stay ON as long as angle doesn't change
- No unnecessary GPIO writes = no blinking
- Periodic task maintains LEDs without turning them off

