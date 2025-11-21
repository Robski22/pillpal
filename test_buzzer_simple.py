#!/usr/bin/env python3
"""
Simple test - just to verify GPIO6 can be controlled
This will help diagnose if the issue is wiring or code
"""

import RPi.GPIO as GPIO
import time

BUZZER_PIN = 6

try:
    GPIO.setmode(GPIO.BCM)
    GPIO.setup(BUZZER_PIN, GPIO.OUT)
    
    print("Testing GPIO6 control...")
    print("If you have a multimeter, check voltage on GPIO6 pin")
    print("It should go from 0V to 3.3V when HIGH")
    
    # Test 1: Turn on
    print("\n1. Setting GPIO6 HIGH (should be 3.3V)...")
    GPIO.output(BUZZER_PIN, GPIO.HIGH)
    time.sleep(2)
    
    # Test 2: Turn off
    print("2. Setting GPIO6 LOW (should be 0V)...")
    GPIO.output(BUZZER_PIN, GPIO.LOW)
    time.sleep(1)
    
    # Test 3: Blink
    print("3. Blinking GPIO6 (5 times)...")
    for i in range(5):
        GPIO.output(BUZZER_PIN, GPIO.HIGH)
        time.sleep(0.2)
        GPIO.output(BUZZER_PIN, GPIO.LOW)
        time.sleep(0.2)
        print(f"   Blink {i+1}/5")
    
    print("\n✅ GPIO test completed!")
    print("\nIf voltage changes but buzzer doesn't work:")
    print("  → You need a transistor circuit (see BUZZER_WIRING_GUIDE.md)")
    print("\nIf voltage doesn't change:")
    print("  → Check wiring, GPIO pin number, or permissions (try sudo)")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    GPIO.output(BUZZER_PIN, GPIO.LOW)
    GPIO.cleanup()

