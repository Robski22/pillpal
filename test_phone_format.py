#!/usr/bin/env python3
"""
Test Phone Number Formatting
Tests different phone number formats to see which works with SIMCOM
"""

import serial
import time
import sys

def send_at_command(ser, command, timeout=5):
    """Send AT command and get response"""
    try:
        ser.reset_input_buffer()
        time.sleep(0.2)
        ser.write(f"{command}\r\n".encode())
        time.sleep(0.3)
        
        response = ""
        start_time = time.time()
        while time.time() - start_time < timeout:
            if ser.in_waiting > 0:
                chunk = ser.read(ser.in_waiting).decode('utf-8', errors='ignore')
                response += chunk
                if 'OK' in response or 'ERROR' in response or '>' in response:
                    break
            time.sleep(0.1)
        
        return response.strip()
    except Exception as e:
        return f"ERROR: {e}"

def test_phone_formats():
    """Test different phone number formats"""
    print("=" * 70)
    print("Phone Number Format Test")
    print("=" * 70)
    print()
    
    port = "/dev/ttyS0"
    baudrate = 115200
    
    # Test phone number (replace with your actual number)
    test_number = input("Enter test phone number (e.g., 09276760439): ").strip()
    
    print(f"Connecting to {port} at {baudrate} baud...")
    try:
        ser = serial.Serial(port=port, baudrate=baudrate, timeout=5, writeTimeout=5)
        time.sleep(2)
        print("✅ Connected")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False
    
    # Test different formats
    formats_to_test = [
        ("+63" + test_number[1:] if test_number.startswith("0") else "+63" + test_number, "International (+63)"),
        (test_number, "Original format"),
        ("63" + test_number[1:] if test_number.startswith("0") else "63" + test_number, "Without + (63)"),
    ]
    
    print()
    print("Testing different phone number formats...")
    print("-" * 70)
    
    # Set SMS text mode
    print("Setting SMS text mode...")
    send_at_command(ser, "AT+CMGF=1", timeout=3)
    time.sleep(0.5)
    
    for phone_format, description in formats_to_test:
        print()
        print(f"Testing: {phone_format} ({description})")
        print("-" * 70)
        
        # Try to get CMGS prompt
        response = send_at_command(ser, f'AT+CMGS="{phone_format}"', timeout=8)
        
        if '>' in response:
            print(f"   ✅ Got '>' prompt - format works!")
            # Cancel the SMS (send Ctrl+C)
            ser.write(b'\x03')
            time.sleep(0.3)
            ser.reset_input_buffer()
        elif '+CMGS:' in response:
            print(f"   ✅ Got CMGS response - format works!")
            ser.reset_input_buffer()
        else:
            print(f"   ❌ No prompt - format may not work")
            print(f"   Response: {response[:200]}")
            ser.reset_input_buffer()
        
        time.sleep(1)
    
    print()
    print("=" * 70)
    print("RECOMMENDATION")
    print("=" * 70)
    print()
    print("SIMCOM modules typically need international format:")
    print("  ✅ CORRECT: +639123456789 (with + and country code)")
    print("  ❌ WRONG:   09123456789 (local format)")
    print("  ❌ WRONG:   639123456789 (without +)")
    print()
    print("For Philippines (Smart/Globe):")
    print("  Format: +63XXXXXXXXXX (where X is 10 digits)")
    print("  Example: +639123456789")
    print()
    
    ser.close()
    return True

if __name__ == "__main__":
    try:
        test_phone_formats()
    except KeyboardInterrupt:
        print("\n\n⚠️ Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

