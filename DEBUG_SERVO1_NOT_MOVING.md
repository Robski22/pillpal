# Debug: Servo1 Not Moving from Localhost

## The Issue
- **On Pi server**: Both servos work ✅
- **From localhost**: Servo1 (30°) doesn't move ❌, but Servo2 (100°) works ✅

## Possible Causes

### 1. Servo1 Already at Target Angle
If servo1 is already at the target angle (30°, 60°, 90°, etc.), it won't move because it's already there.

**Check**: Look at browser console when you click dispense:
```
🎯 Direct dispense: Saturday Morning → Target angle: 30° (Current: 30°)
```
If Current = Target, servo1 won't move (it's already there!)

### 2. Target Angle Not Being Sent
The `target_angle` might not be reaching the server.

**Check**: In browser console, look for:
```
📤 Sending dispense command: {"type":"dispense","servo_id":"servo1","medication":"...","target_angle":30}
```
If `target_angle` is missing, that's the problem!

### 3. Server Not Receiving Command
The WebSocket message might not be reaching the server.

**Check**: On Pi server logs, look for:
```
🎯 Dispense command received: servo_id='servo1', medication='...'
🎯 Progressive dispense: target_angle=30°
```

## How to Debug

### Step 1: Check Browser Console
1. Open Developer Tools (F12)
2. Go to **Console** tab
3. Click "Dispense" button
4. Look for these messages:
   - `🎯 Direct dispense: ... → Target angle: X° (Current: Y°)`
   - `📤 Sending dispense command: ...`
   - `✅ Manual dispense bundle response: ...`

**What to check:**
- Is `target_angle` in the message?
- What is the Current angle vs Target angle?
- Is the response status "success"?

### Step 2: Check Pi Server Logs
1. SSH into Pi
2. Watch the server logs
3. Click "Dispense" from localhost
4. Look for:
   - `🎯 Dispense command received`
   - `🎯 Progressive dispense: target_angle=X°`
   - `📐 Moving from X° to Y°`

**What to check:**
- Is the command received?
- What is the target_angle value?
- Is servo1 actually moving?

### Step 3: Check Current Servo1 Position
The issue might be that servo1 is already at the target angle.

**Solution**: Try dispensing from a different time frame to see if it moves to a different angle.

## Quick Test

1. **Check current position**: Look at browser console - what does it say for "Current: X°"?
2. **Click dispense for Morning**: Should move to 30° (if not already there)
3. **Click dispense for Afternoon**: Should move to 60° (if not already there)
4. **Check if it moves**: Watch the physical servo or check server logs

## Tell Me:
1. What does browser console show for "Current: X°" and "Target angle: Y°"?
2. What does Pi server log show when you click dispense?
3. Is servo1 physically moving at all, or completely still?

