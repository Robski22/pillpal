#!/usr/bin/env python3
"""
Check and Set SMS Service Center for Smart Network
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
                if 'OK' in response or 'ERROR' in response:
                    break
            time.sleep(0.1)
        
        return response.strip()
    except Exception as e:
        return f"ERROR: {e}"

def check_and_set_service_center():
    """Check current service center and set Smart network if needed"""
    print("=" * 70)
    print("SMS Service Center Checker (Smart Network)")
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
    
    # Check current service center
    print()
    print("Checking current SMS service center...")
    print("-" * 70)
    response = send_at_command(ser, "AT+CSCA?")
    print(f"Response: {response}")
    
    # Smart network service center numbers (Philippines)
    # Smart: +639170000130 or +639170000131
    # Globe: +639170000130 (sometimes same)
    
    smart_service_centers = [
        "+639170000130",  # Smart main
        "+639170000131",  # Smart alternate
        "09170000130",    # Without +
        "09170000131"     # Without +
    ]
    
    current_sc = ""
    if "+CSCA:" in response:
        try:
            # Extract service center from response
            parts = response.split("+CSCA:")[1].strip().split(",")
            if len(parts) >= 1:
                current_sc = parts[0].strip().replace('"', '')
                print(f"   Current Service Center: {current_sc}")
        except:
            pass
    
    # Check if it's a Smart number
    is_smart = False
    for sc in smart_service_centers:
        if sc in current_sc or current_sc in sc:
            is_smart = True
            break
    
    if is_smart:
        print("   ✅ Service center appears to be Smart network")
    else:
        print("   ⚠️ Service center doesn't match Smart network")
        print("   Current: " + (current_sc if current_sc else "Unknown"))
    
    # Try to set Smart service center
    print()
    print("Setting Smart service center...")
    print("-" * 70)
    
    # Try Smart main service center
    smart_sc = "+639170000130"
    response = send_at_command(ser, f'AT+CSCA="{smart_sc}"', timeout=5)
    print(f"Setting to {smart_sc}: {response}")
    
    # Verify it was set
    time.sleep(0.5)
    response = send_at_command(ser, "AT+CSCA?")
    print(f"Verification: {response}")
    
    if "+CSCA:" in response and smart_sc in response:
        print("   ✅ Service center set successfully")
    else:
        print("   ⚠️ Service center may not have been set (this is OK if already correct)")
    
    # Check network operator
    print()
    print("Checking network operator...")
    print("-" * 70)
    response = send_at_command(ser, "AT+COPS?")
    print(f"Response: {response}")
    
    if "SMART" in response.upper() or "51503" in response:
        print("   ✅ Connected to Smart network")
    elif "GLOBE" in response.upper() or "51502" in response:
        print("   ⚠️ Connected to Globe network (SIM might be Globe)")
    else:
        print("   ℹ️ Network operator: " + response[:100])
    
    # Check network registration
    print()
    print("Checking network registration...")
    print("-" * 70)
    response = send_at_command(ser, "AT+CREG?")
    print(f"Response: {response}")
    
    if "+CREG:" in response:
        try:
            parts = response.split("+CREG:")[1].strip().split(",")
            if len(parts) >= 2:
                stat = int(parts[1].strip())
                if stat in [1, 2, 5]:
                    print(f"   ✅ Network registered (status: {stat})")
                else:
                    print(f"   ⚠️ Network not fully registered (status: {stat})")
        except:
            pass
    
    print()
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print()
    print("For Smart network SIM cards:")
    print("1. Service center is usually auto-configured by the SIM")
    print("2. AT commands work the same for Smart and Globe")
    print("3. No special configuration needed for SMS sending")
    print("4. If SMS fails, check network registration and signal strength")
    print()
    
    ser.close()
    return True

if __name__ == "__main__":
    try:
        check_and_set_service_center()
    except KeyboardInterrupt:
        print("\n\n⚠️ Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

