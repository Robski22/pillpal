#!/usr/bin/env python3
"""
Fix SMS Service Center Configuration
Sets the SMS service center for Globe SIM (Philippines)
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

def fix_service_center():
    """Check and set SMS service center"""
    print("=" * 70)
    print("SMS Service Center Configuration")
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
    
    # Test communication
    response = send_at_command(ser, "AT")
    if "OK" not in response:
        print(f"❌ Module not responding")
        ser.close()
        return False
    
    # Check current service center
    print("\nChecking current SMS service center...")
    response = send_at_command(ser, "AT+CSCA?")
    print(f"Response: {response}")
    
    if "+CSCA:" in response:
        try:
            sca = response.split("+CSCA:")[1].strip().strip('"')
            print(f"✅ Current service center: {sca}")
            
            if sca and len(sca) > 5:
                print("\n✅ Service center is configured!")
                ser.close()
                return True
        except:
            pass
    
    # Service center not configured or empty
    print("\n⚠️ Service center not configured or empty")
    print("Setting SMS service center for Globe...")
    print()
    
    # Globe service center numbers (Philippines)
    globe_centers = [
        "+639170000130",  # Globe primary
        "+639170000131",  # Globe alternate
        "+639170000132",  # Globe alternate
    ]
    
    for center in globe_centers:
        print(f"Trying: {center}...")
        response = send_at_command(ser, f'AT+CSCA="{center}"', timeout=10)
        print(f"Response: {response}")
        
        if "OK" in response:
            print(f"✅ Service center set to: {center}")
            
            # Verify it was set
            time.sleep(1)
            response = send_at_command(ser, "AT+CSCA?")
            print(f"\nVerification: {response}")
            
            if center in response:
                print("✅ Service center verified!")
                ser.close()
                return True
        else:
            print(f"❌ Failed to set service center")
    
    print("\n❌ Could not set service center")
    print("\nTroubleshooting:")
    print("1. Check if SIM card has active SMS service")
    print("2. Contact Globe to get correct service center number")
    print("3. Try manual setting with minicom:")
    print("   sudo minicom -D /dev/ttyS0 -b 115200")
    print("   Then type: AT+CSCA=\"+639170000130\"")
    
    ser.close()
    return False

if __name__ == "__main__":
    try:
        success = fix_service_center()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️ Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

