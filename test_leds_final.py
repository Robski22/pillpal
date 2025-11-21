#!/usr/bin/env python3
"""
Final LED Test - Test GPIO22 (Green) and GPIO27 (Red) directly
Run this to verify LEDs work before testing with server
"""

import RPi.GPIO as GPIO
import time
import sys

print("=" * 60)
print("LED Hardware Test - GPIO22 (Green) and GPIO27 (Red)")
print("=" * 60)
print()

# Setup GPIO
try:
    GPIO.setmode(GPIO.BCM)
    GPIO.setup(22, GPIO.OUT)  # Green LED
    GPIO.setup(27, GPIO.OUT)  # Red LED
    
    print("✅ GPIO initialized")
    print()
    
    # Test Green LED (GPIO22)
    print("Testing GREEN LED (GPIO22)...")
    print("  Turning ON for 3 seconds...")
    GPIO.output(22, GPIO.HIGH)
    GPIO.output(27, GPIO.LOW)  # Red OFF
    time.sleep(3)
    print("  Turning OFF...")
    GPIO.output(22, GPIO.LOW)
    time.sleep(1)
    
    # Test Red LED (GPIO27)
    print()
    print("Testing RED LED (GPIO27)...")
    print("  Turning ON for 3 seconds...")
    GPIO.output(22, GPIO.LOW)  # Green OFF
    GPIO.output(27, GPIO.HIGH)
    time.sleep(3)
    print("  Turning OFF...")
    GPIO.output(27, GPIO.LOW)
    time.sleep(1)
    
    # Test both OFF
    print()
    print("Testing both OFF...")
    GPIO.output(22, GPIO.LOW)
    GPIO.output(27, GPIO.LOW)
    time.sleep(1)
    
    # Test sequence: Green for angles 0, 30, 60, 90, 120
    print()
    print("=" * 60)
    print("Testing GREEN LED for angles: 0°, 30°, 60°, 90°, 120°")
    print("=" * 60)
    for angle in [0, 30, 60, 90, 120]:
        print(f"  Angle {angle}°: Green ON, Red OFF (2 seconds)")
        GPIO.output(27, GPIO.LOW)  # Red OFF
        GPIO.output(22, GPIO.HIGH)  # Green ON
        time.sleep(2)
    
    # Test sequence: Red for angles 150, 180
    print()
    print("=" * 60)
    print("Testing RED LED for angles: 150°, 180°")
    print("=" * 60)
    for angle in [150, 180]:
        print(f"  Angle {angle}°: Red ON, Green OFF (2 seconds)")
        GPIO.output(22, GPIO.LOW)  # Green OFF
        GPIO.output(27, GPIO.HIGH)  # Red ON
        time.sleep(2)
    
    # Final: Turn both OFF
    print()
    print("Turning both LEDs OFF...")
    GPIO.output(22, GPIO.LOW)
    GPIO.output(27, GPIO.LOW)
    
    print()
    print("=" * 60)
    print("✅ LED Test Complete!")
    print("=" * 60)
    print()
    print("If you saw:")
    print("  - Green LED light up for 0°, 30°, 60°, 90°, 120°")
    print("  - Red LED light up for 150°, 180°")
    print("Then LEDs are working correctly!")
    print()
    print("If LEDs didn't light up:")
    print("  - Check wiring: GPIO22 → Green LED +, GPIO27 → Red LED +")
    print("  - Check resistors: 220Ω resistors needed")
    print("  - Check LED polarity: Long leg = +, Short leg = -")
    
except ImportError:
    print("❌ RPi.GPIO not available")
    print("   This script must run on Raspberry Pi")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
finally:
    GPIO.cleanup()
    print("GPIO cleaned up")

