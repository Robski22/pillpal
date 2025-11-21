#!/usr/bin/env python3
"""
SIMCOM Module Diagnostic Tool
Checks why module is not responding consistently
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

def diagnose_module():
    """Diagnose SIMCOM module issues"""
    print("=" * 70)
    print("SIMCOM Module Diagnostic Tool")
    print("=" * 70)
    print()
    
    port = "/dev/ttyS0"
    baudrate = 115200
    
    print(f"Connecting to {port} at {baudrate} baud...")
    try:
        ser = serial.Serial(port=port, baudrate=baudrate, timeout=5, writeTimeout=5)
        time.sleep(2)
        print("✅ Connected")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False
    
    # Test 1: Basic AT command (multiple times)
    print()
    print("TEST 1: Basic AT Command (5 attempts)")
    print("-" * 70)
    at_success = 0
    for i in range(5):
        response = send_at_command(ser, "AT", timeout=3)
        if "OK" in response:
            at_success += 1
            print(f"   Attempt {i+1}: ✅ OK")
        else:
            print(f"   Attempt {i+1}: ❌ Failed - {response[:50]}")
        time.sleep(0.5)
    
    print(f"\n   Result: {at_success}/5 successful")
    if at_success < 3:
        print("   ⚠️ Module is not responding consistently!")
    
    # Test 2: Check if module is busy
    print()
    print("TEST 2: Check Module State")
    print("-" * 70)
    
    # Check SIM card
    response = send_at_command(ser, "AT+CPIN?")
    print(f"   SIM Status: {response}")
    
    # Check network
    response = send_at_command(ser, "AT+CREG?")
    print(f"   Network: {response}")
    
    # Check signal
    response = send_at_command(ser, "AT+CSQ")
    print(f"   Signal: {response}")
    
    # Test 3: SMS mode check
    print()
    print("TEST 3: SMS Mode Check")
    print("-" * 70)
    response = send_at_command(ser, "AT+CMGF?")
    print(f"   SMS Mode: {response}")
    
    # Test 4: Try to get CMGS prompt
    print()
    print("TEST 4: Test CMGS Prompt (without sending)")
    print("-" * 70)
    print("   Sending AT+CMGS command (will cancel with Ctrl+C equivalent)...")
    
    ser.reset_input_buffer()
    time.sleep(0.2)
    ser.write(b'AT+CMGS="+639276760439"\r\n')
    time.sleep(1)
    
    response = ""
    start_time = time.time()
    while time.time() - start_time < 5:
        if ser.in_waiting > 0:
            chunk = ser.read(ser.in_waiting).decode('utf-8', errors='ignore')
            response += chunk
            if '>' in response:
                print(f"   ✅ Got '>' prompt: {response}")
                # Cancel by sending Ctrl+C (0x03)
                ser.write(b'\x03')
                time.sleep(0.5)
                break
        time.sleep(0.1)
    
    if '>' not in response:
        print(f"   ❌ No '>' prompt received")
        print(f"   Response: {response[:200]}")
    
    # Test 5: Check for pending operations
    print()
    print("TEST 5: Check for Pending Operations")
    print("-" * 70)
    
    # Check if there are any pending SMS
    response = send_at_command(ser, "AT+CPMS?")
    print(f"   SMS Storage: {response}")
    
    # Check module status
    response = send_at_command(ser, "AT+CSCLK?")
    print(f"   Sleep Mode: {response}")
    
    # Final summary
    print()
    print("=" * 70)
    print("DIAGNOSIS SUMMARY")
    print("=" * 70)
    print()
    
    if at_success < 3:
        print("❌ PROBLEM: Module is not responding consistently")
        print()
        print("Possible causes:")
        print("1. Module is busy processing previous command")
        print("2. Buffer overflow - too much data in buffer")
        print("3. Module needs more time between commands")
        print("4. Hardware issue - loose connection")
        print("5. Power issue - insufficient power")
        print()
        print("Solutions:")
        print("1. Add longer delays between commands")
        print("2. Clear buffers more thoroughly")
        print("3. Check USB connection and power")
        print("4. Try power cycling the module")
    
    if '>' not in response:
        print()
        print("❌ PROBLEM: Module not sending '>' prompt")
        print()
        print("Possible causes:")
        print("1. Module is in wrong mode")
        print("2. Network not registered")
        print("3. Module is busy")
        print("4. SMS mode not set correctly")
        print()
        print("Solutions:")
        print("1. Ensure network is registered")
        print("2. Set SMS mode explicitly: AT+CMGF=1")
        print("3. Wait longer for prompt")
        print("4. Check if module is ready")
    
    ser.close()
    return True

if __name__ == "__main__":
    try:
        diagnose_module()
    except KeyboardInterrupt:
        print("\n\n⚠️ Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

