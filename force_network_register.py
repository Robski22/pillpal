#!/usr/bin/env python3
"""
Force Network Registration
Manually registers with network (Globe) if automatic registration fails
"""

import serial
import time
import sys

def send_at_command(ser, command, timeout=10):
    """Send AT command and get response"""
    try:
        ser.reset_input_buffer()
        time.sleep(0.2)
        ser.write(f"{command}\r\n".encode())
        time.sleep(0.5)
        
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

def force_network_register():
    """Force network registration"""
    print("=" * 70)
    print("Force Network Registration Tool")
    print("=" * 70)
    print()
    
    port = "/dev/ttyS0"
    baudrate = 115200
    
    print(f"Connecting to {port} at {baudrate} baud...")
    try:
        ser = serial.Serial(port=port, baudrate=baudrate, timeout=10, writeTimeout=10)
        time.sleep(2)
        print("✅ Connected")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False
    
    # Test communication
    response = send_at_command(ser, "AT")
    if "OK" not in response:
        print("❌ Module not responding")
        ser.close()
        return False
    
    # Check current registration
    print("\n1. Checking current registration status...")
    response = send_at_command(ser, "AT+CREG?")
    print(f"   Response: {response}")
    
    # Enable network registration notifications
    print("\n2. Enabling network registration notifications...")
    response = send_at_command(ser, "AT+CREG=2")
    print(f"   Response: {response}")
    time.sleep(2)
    
    # Check signal strength
    print("\n3. Checking signal strength...")
    response = send_at_command(ser, "AT+CSQ")
    print(f"   Response: {response}")
    
    signal = 0
    if "+CSQ:" in response:
        try:
            signal = int(response.split("+CSQ:")[1].strip().split(",")[0].strip())
            if signal == 99:
                print("   ⚠️ Signal: Unknown/Not detectable (99)")
                print("   ⚠️ This is bad - check antenna and location")
            elif signal == 0:
                print(f"   ❌ Signal: NO SIGNAL ({signal}/31)")
            else:
                print(f"   ✅ Signal: {signal}/31")
        except:
            pass
    
    # Search for available networks
    print("\n4. Searching for available networks...")
    print("   This may take 30-60 seconds...")
    response = send_at_command(ser, "AT+COPS=?", timeout=60)
    print(f"   Response: {response[:500]}...")  # Show first 500 chars
    
    # Try automatic registration first
    print("\n5. Trying automatic network registration...")
    response = send_at_command(ser, "AT+COPS=0", timeout=30)
    print(f"   Response: {response}")
    time.sleep(5)
    
    # Check registration status
    print("\n6. Checking registration status...")
    response = send_at_command(ser, "AT+CREG?")
    print(f"   Response: {response}")
    
    if "+CREG:" in response:
        try:
            parts = response.split("+CREG:")[1].strip().split(",")
            if len(parts) >= 2:
                stat = int(parts[1].strip())
                if stat == 1 or stat == 2 or stat == 5:
                    print("   ✅ Network registered!")
                    ser.close()
                    return True
        except:
            pass
    
    # If automatic failed, try manual registration with Globe
    print("\n7. Automatic registration failed, trying manual registration...")
    print("   Attempting to register with Globe (51502, 51503, 51505)...")
    
    globe_codes = ["51502", "51503", "51505"]
    
    for code in globe_codes:
        print(f"\n   Trying Globe network code: {code}...")
        response = send_at_command(ser, f'AT+COPS=1,2,"{code}"', timeout=30)
        print(f"   Response: {response}")
        
        if "OK" in response:
            print("   ✅ Registration command accepted, waiting...")
            time.sleep(10)  # Wait for registration
            
            # Check status
            response = send_at_command(ser, "AT+CREG?")
            print(f"   Registration status: {response}")
            
            if "+CREG:" in response:
                try:
                    parts = response.split("+CREG:")[1].strip().split(",")
                    if len(parts) >= 2:
                        stat = int(parts[1].strip())
                        if stat == 1 or stat == 2 or stat == 5:
                            print(f"   ✅ Successfully registered with network {code}!")
                            ser.close()
                            return True
                except:
                    pass
    
    # Final check
    print("\n8. Final registration check...")
    response = send_at_command(ser, "AT+CREG?")
    print(f"   Response: {response}")
    
    if "+CREG:" in response:
        try:
            parts = response.split("+CREG:")[1].strip().split(",")
            if len(parts) >= 2:
                stat = int(parts[1].strip())
                if stat == 1 or stat == 2 or stat == 5:
                    print("\n✅ NETWORK REGISTERED!")
                    ser.close()
                    return True
                else:
                    print(f"\n❌ Network still not registered (status: {stat})")
                    print("\nTroubleshooting:")
                    print("1. Check antenna connection")
                    print("2. Move to better location (near window)")
                    print("3. Wait longer (some modules need 1-2 minutes)")
                    print("4. Check if SIM card has active service")
                    print("5. Power cycle the module (unplug/replug USB)")
        except:
            pass
    
    ser.close()
    return False

if __name__ == "__main__":
    try:
        success = force_network_register()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️ Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

