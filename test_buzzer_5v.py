#!/usr/bin/env python3
"""
Test script for 5V buzzer on GPIO6
For 5V buzzers, you typically need a transistor circuit
"""

import RPi.GPIO as GPIO
import time

# Buzzer GPIO pin
BUZZER_PIN = 6

try:
    # Set up GPIO
    GPIO.setmode(GPIO.BCM)
    GPIO.setup(BUZZER_PIN, GPIO.OUT)
    
    print(f"Testing 5V buzzer on GPIO{BUZZER_PIN}...")
    print("Note: If no sound, you may need a transistor circuit")
    print("Press Ctrl+C to stop")
    
    # Test with different methods
    
    # Method 1: Simple HIGH/LOW (for active buzzer with transistor)
    print("\n1. Testing simple HIGH/LOW (0.5 seconds)...")
    GPIO.output(BUZZER_PIN, GPIO.HIGH)
    time.sleep(0.5)
    GPIO.output(BUZZER_PIN, GPIO.LOW)
    time.sleep(0.5)
    
    # Method 2: PWM (for passive buzzer or if direct drive works)
    print("2. Testing PWM (1000Hz, 50% duty cycle)...")
    pwm = GPIO.PWM(BUZZER_PIN, 1000)  # 1000 Hz frequency
    pwm.start(50)  # 50% duty cycle
    time.sleep(0.5)
    pwm.stop()
    time.sleep(0.5)
    
    # Method 3: Higher frequency PWM
    print("3. Testing PWM (2000Hz, 50% duty cycle)...")
    pwm = GPIO.PWM(BUZZER_PIN, 2000)  # 2000 Hz frequency
    pwm.start(50)
    time.sleep(0.5)
    pwm.stop()
    time.sleep(0.5)
    
    # Method 4: Rapid toggling
    print("4. Testing rapid toggle (1000 times)...")
    for _ in range(1000):
        GPIO.output(BUZZER_PIN, GPIO.HIGH)
        time.sleep(0.001)  # 1ms
        GPIO.output(BUZZER_PIN, GPIO.LOW)
        time.sleep(0.001)
    time.sleep(0.5)
    
    print("\n✅ Test completed!")
    print("\nIf no sound was heard, you likely need:")
    print("1. A transistor circuit (NPN transistor like 2N2222 or BC547)")
    print("2. Connect buzzer to 5V power supply")
    print("3. Use GPIO6 to control the transistor base")
    
except KeyboardInterrupt:
    print("\n\nTest interrupted by user")
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    # Clean up
    try:
        GPIO.output(BUZZER_PIN, GPIO.LOW)
        GPIO.cleanup()
        print("GPIO cleaned up")
    except:
        pass

