#!/usr/bin/env python3
"""
Test script for buzzer on GPIO6
Run this on the Raspberry Pi to test the buzzer
"""

import RPi.GPIO as GPIO
import time

# Buzzer GPIO pin
BUZZER_PIN = 6

try:
    # Set up GPIO
    GPIO.setmode(GPIO.BCM)
    GPIO.setup(BUZZER_PIN, GPIO.OUT)
    
    print(f"Testing buzzer on GPIO{BUZZER_PIN}...")
    print("Press Ctrl+C to stop")
    
    # Test 1: Single beep
    print("\n1. Single beep (0.5 seconds)...")
    GPIO.output(BUZZER_PIN, GPIO.HIGH)
    time.sleep(0.5)
    GPIO.output(BUZZER_PIN, GPIO.LOW)
    time.sleep(0.5)
    
    # Test 2: Double beep
    print("2. Double beep...")
    for _ in range(2):
        GPIO.output(BUZZER_PIN, GPIO.HIGH)
        time.sleep(0.2)
        GPIO.output(BUZZER_PIN, GPIO.LOW)
        time.sleep(0.2)
    time.sleep(0.5)
    
    # Test 3: Triple beep
    print("3. Triple beep...")
    for _ in range(3):
        GPIO.output(BUZZER_PIN, GPIO.HIGH)
        time.sleep(0.15)
        GPIO.output(BUZZER_PIN, GPIO.LOW)
        time.sleep(0.15)
    time.sleep(0.5)
    
    # Test 4: Long beep
    print("4. Long beep (1 second)...")
    GPIO.output(BUZZER_PIN, GPIO.HIGH)
    time.sleep(1.0)
    GPIO.output(BUZZER_PIN, GPIO.LOW)
    time.sleep(0.5)
    
    # Test 5: Rapid beeps
    print("5. Rapid beeps (10 quick beeps)...")
    for _ in range(10):
        GPIO.output(BUZZER_PIN, GPIO.HIGH)
        time.sleep(0.05)
        GPIO.output(BUZZER_PIN, GPIO.LOW)
        time.sleep(0.05)
    time.sleep(0.5)
    
    print("\n✅ Buzzer test completed!")
    
except KeyboardInterrupt:
    print("\n\nTest interrupted by user")
except Exception as e:
    print(f"\n❌ Error: {e}")
finally:
    # Clean up
    GPIO.output(BUZZER_PIN, GPIO.LOW)
    GPIO.cleanup()
    print("GPIO cleaned up")

