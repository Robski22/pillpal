# Test Buzzer on GPIO17

Since your buzzer works with 3V directly connected to GPIO17 and GND, let's test if the code is working correctly.

## Quick Test Script

### Step 1: SSH into Raspberry Pi
```bash
ssh justin@192.168.100.220
cd /home/justin/pillpal
```

### Step 2: Create Simple Test Script
```bash
cat > test_buzzer_simple.py << 'EOF'
#!/usr/bin/env python3
"""
Simple buzzer test - same as your working code
"""
import RPi.GPIO as GPIO
import time

# Setup GPIO
GPIO.setmode(GPIO.BCM)
GPIO.setup(17, GPIO.OUT)  # GPIO17

print("Testing buzzer on GPIO17...")
print("This should beep 3 times (1s ON, 1s OFF each)")

try:
    for i in range(3):
        print(f"Beep {i+1}/3: ON")
        GPIO.output(17, GPIO.HIGH)  # Turn ON
        time.sleep(1.0)  # 1 second ON
        
        print(f"Beep {i+1}/3: OFF")
        GPIO.output(17, GPIO.LOW)  # Turn OFF
        if i < 2:  # Don't wait after last beep
            time.sleep(1.0)  # 1 second OFF
    
    print("Test complete!")
    
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
finally:
    GPIO.cleanup()
    print("GPIO cleaned up")
EOF

chmod +x test_buzzer_simple.py
```

### Step 3: Run the Test
```bash
python3 test_buzzer_simple.py
```

**Expected**: You should hear 3 beeps (1 second each, with 1 second pause between)

**If it works**: The buzzer hardware is fine, issue is in the server code  
**If it doesn't work**: Check wiring (GPIO17 → Buzzer +, GND → Buzzer -)

## Test Server Code Directly

If the simple test works, let's test if the server's buzzer function works:

### Step 1: Create Test Script Using Server's Buzzer Class
```bash
cat > test_buzzer_server.py << 'EOF'
#!/usr/bin/env python3
"""
Test using the server's BuzzerController class
"""
import sys
sys.path.insert(0, '/home/justin/pillpal')

# Import the buzzer controller from server
# We need to import GPIO and other dependencies first
try:
    import RPi.GPIO as GPIO
    GPIO_AVAILABLE = True
except ImportError:
    GPIO_AVAILABLE = False
    print("❌ RPi.GPIO not available")

if GPIO_AVAILABLE:
    # Initialize GPIO mode
    GPIO.setmode(GPIO.BCM)
    
    # Import buzzer controller
    from pi_websocket_server_PCA9685 import BuzzerController
    
    print("Testing server's BuzzerController...")
    buzzer = BuzzerController(demo_mode=False)
    
    print(f"Buzzer setup complete: {buzzer.setup_complete}")
    
    if buzzer.setup_complete:
        print("Calling sound_dispense_notification()...")
        buzzer.sound_dispense_notification()
        print("Function called - wait 6 seconds for beeps...")
        import time
        time.sleep(7)  # Wait for beeps to complete
        print("Test complete!")
    else:
        print("❌ Buzzer setup failed!")
else:
    print("❌ GPIO not available - cannot test")
EOF

chmod +x test_buzzer_server.py
```

### Step 2: Run the Test
```bash
python3 test_buzzer_server.py
```

## Check Server Logs

When you dispense, check the server logs for:

```
🔔 Buzzer initialized on GPIO17
🔔 Buzzer: Starting dispense notification (1s ON, 1s OFF x3)
🔔 Buzzer: ON (beep 1/3)
🔔 Buzzer: OFF (pause 1/3)
🔔 Buzzer: ON (beep 2/3)
🔔 Buzzer: OFF (pause 2/3)
🔔 Buzzer: ON (beep 3/3)
🔔 Buzzer: OFF (pause 3/3)
🔔 Buzzer: Notification complete
```

**If you see these logs but no sound**: 
- Check if GPIO17 is actually being set (might be a different pin)
- Check if buzzer is connected to correct GPIO pin
- Try the simple test script above

**If you DON'T see these logs**:
- Buzzer function is not being called
- Check server code is calling `buzzer_controller.sound_dispense_notification()`

## Debug: Check GPIO17 State

To verify GPIO17 is actually being set, you can monitor it:

```bash
# Install gpio command (if not installed)
sudo apt-get install wiringpi

# Monitor GPIO17
gpio -g mode 17 out
gpio -g write 17 1  # Should turn buzzer ON
sleep 1
gpio -g write 17 0  # Should turn buzzer OFF
```

Or use Python to check:
```bash
python3 -c "import RPi.GPIO as GPIO; GPIO.setmode(GPIO.BCM); GPIO.setup(17, GPIO.OUT); GPIO.output(17, GPIO.HIGH); print('GPIO17 set to HIGH - buzzer should be ON'); import time; time.sleep(2); GPIO.output(17, GPIO.LOW); print('GPIO17 set to LOW - buzzer should be OFF'); GPIO.cleanup()"
```

## Common Issues

### Issue: Buzzer works with simple code but not with server
**Possible causes:**
1. GPIO mode conflict (BCM vs BOARD)
2. GPIO pin already in use
3. Buzzer function not being called
4. Threading issue (buzzer runs in background thread)

**Solution**: Check server logs to see if buzzer function is being called

### Issue: No sound at all
**Check:**
1. Wiring: GPIO17 → Buzzer +, GND → Buzzer -
2. Buzzer polarity (if it matters for your buzzer)
3. Try simple test script first

### Issue: Buzzer beeps once then stops
**Possible cause**: GPIO is being reset or cleaned up too early
**Solution**: Check if `GPIO.cleanup()` is being called somewhere

## Verify Wiring

Your wiring should be:
```
Raspberry Pi GPIO17 (Pin 11) → Buzzer + (positive)
Raspberry Pi GND (Pin 6, 9, 14, etc.) → Buzzer - (negative)
```

**Note**: Since you said it works with 3V directly, your buzzer is likely a 3.3V buzzer, which is perfect for Raspberry Pi GPIO (which outputs 3.3V).

