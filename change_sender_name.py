#!/usr/bin/env python3
"""
Change SMS Sender Name to "PillPal"
Tries multiple methods to set the sender name
Note: Sender name is usually controlled by carrier, but we'll try all methods
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

def change_sender_name():
    """Try to change sender name to PillPal"""
    print("=" * 70)
    print("Change SMS Sender Name to 'PillPal'")
    print("=" * 70)
    print()
    print("Note: Sender name is usually controlled by your carrier.")
    print("These methods may or may not work depending on your carrier.")
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
        print("❌ Module not responding")
        ser.close()
        return False
    
    print("\n" + "=" * 70)
    print("Method 1: Phonebook Entry (AT+CPBW)")
    print("=" * 70)
    
    # Set character set to GSM
    print("Setting character set to GSM...")
    response = send_at_command(ser, 'AT+CSCS="GSM"')
    print(f"Response: {response}")
    
    # Try to write "PillPal" to phonebook
    print("Writing 'PillPal' to phonebook...")
    response = send_at_command(ser, 'AT+CPBW=1,"PillPal",129,"PillPal"')
    print(f"Response: {response}")
    
    if "OK" in response:
        print("✅ Phonebook entry written")
    else:
        print("⚠️ Phonebook method may not be supported")
    
    print("\n" + "=" * 70)
    print("Method 2: Device Name (AT+CGMI, AT+CGMM)")
    print("=" * 70)
    
    # Check manufacturer
    print("Checking device manufacturer...")
    response = send_at_command(ser, "AT+CGMI")
    print(f"Manufacturer: {response}")
    
    # Check model
    print("Checking device model...")
    response = send_at_command(ser, "AT+CGMM")
    print(f"Model: {response}")
    
    print("\n" + "=" * 70)
    print("Method 3: SIM Card Name (AT+CPBS, AT+CPBR)")
    print("=" * 70)
    
    # Check phonebook storage
    print("Checking phonebook storage...")
    response = send_at_command(ser, "AT+CPBS?")
    print(f"Response: {response}")
    
    # Try to read phonebook entry 1
    print("Reading phonebook entry 1...")
    response = send_at_command(ser, "AT+CPBR=1")
    print(f"Response: {response}")
    
    print("\n" + "=" * 70)
    print("Method 4: Try Setting via Service Center (AT+CSCA)")
    print("=" * 70)
    print("Note: This usually doesn't change sender name, but we'll try...")
    
    # Get current service center
    response = send_at_command(ser, "AT+CSCA?")
    print(f"Current service center: {response}")
    
    print("\n" + "=" * 70)
    print("IMPORTANT NOTES")
    print("=" * 70)
    print()
    print("⚠️ Sender name is usually controlled by your carrier (Globe).")
    print("   The methods above may not work because:")
    print("   1. Carrier controls the sender name")
    print("   2. SIM card stores the default name")
    print("   3. Some carriers don't allow changing sender name")
    print()
    print("✅ What we tried:")
    print("   - Phonebook entry (AT+CPBW)")
    print("   - Character set (AT+CSCS)")
    print()
    print("📱 To change sender name, you may need to:")
    print("   1. Contact Globe customer service")
    print("   2. Request to change SMS sender name")
    print("   3. Some carriers allow this via their online portal")
    print("   4. Or use a different SIM card that allows custom sender names")
    print()
    print("💡 Alternative: The message content can include 'PillPal' at the start:")
    print("   'PillPal: It's time for your medicine...'")
    print()
    
    ser.close()
    return True

if __name__ == "__main__":
    try:
        change_sender_name()
    except KeyboardInterrupt:
        print("\n\n⚠️ Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

