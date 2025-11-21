#!/usr/bin/env python3
"""
Set SMS Sender Number
Configures the SIMCOM module to use a specific phone number as the sender
Note: This is carrier-dependent and may not work on all networks
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

def set_sender_number():
    """Set SMS sender number"""
    print("=" * 70)
    print("SMS Sender Number Configuration")
    print("=" * 70)
    print()
    
    # The phone number you want to appear as sender
    sender_number = "+639762549485"
    
    port = "/dev/ttyS0"
    baudrate = 115200
    
    print(f"Target sender number: {sender_number}")
    print(f"Connecting to {port} at {baudrate} baud...")
    print()
    
    try:
        ser = serial.Serial(port=port, baudrate=baudrate, timeout=5, writeTimeout=5)
        time.sleep(2)
        print("✅ Connected")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False
    
    # Check current SIM card number
    print()
    print("STEP 1: Checking current SIM card number...")
    print("-" * 70)
    response = send_at_command(ser, "AT+CNUM")
    print(f"Response: {response}")
    
    if "+CNUM:" in response:
        print("   ✅ SIM card number detected")
    else:
        print("   ⚠️ Could not read SIM card number")
    
    # Check current phonebook
    print()
    print("STEP 2: Checking phonebook...")
    print("-" * 70)
    response = send_at_command(ser, "AT+CPBR=1")
    print(f"Response: {response}")
    
    # Method 1: Try to set via phonebook (may not work on all carriers)
    print()
    print("STEP 3: Attempting to set sender via phonebook...")
    print("-" * 70)
    print("   Note: This method is carrier-dependent and may not work")
    
    # Try to write sender number to phonebook position 1
    # Format: AT+CPBW=<index>,"<number>",<type>,"<name>"
    # Type 129 = national number with name
    response = send_at_command(ser, f'AT+CPBW=1,"{sender_number}",129,"PillPal"', timeout=5)
    print(f"   Response: {response}")
    
    if "OK" in response:
        print("   ✅ Phonebook entry written (may not affect sender number)")
    else:
        print("   ⚠️ Phonebook write failed or not supported")
    
    # Method 2: Try to set SMS service center with sender number
    print()
    print("STEP 4: Checking SMS service center...")
    print("-" * 70)
    response = send_at_command(ser, "AT+CSCA?")
    print(f"Response: {response}")
    
    # Method 3: Try AT+CSCS (character set) - doesn't change sender but ensures compatibility
    print()
    print("STEP 5: Setting character set...")
    print("-" * 70)
    response = send_at_command(ser, 'AT+CSCS="GSM"')
    print(f"Response: {response}")
    
    # Method 4: Check if module supports setting own number
    print()
    print("STEP 6: Checking module capabilities...")
    print("-" * 70)
    response = send_at_command(ser, "AT+CNUM")
    print(f"Response: {response}")
    
    # Final summary
    print()
    print("=" * 70)
    print("IMPORTANT NOTES")
    print("=" * 70)
    print()
    print("⚠️  SMS SENDER NUMBER IS CONTROLLED BY THE CARRIER/SIM CARD")
    print()
    print("The sender number that appears in SMS is determined by:")
    print("1. The SIM card's phone number (primary)")
    print("2. Carrier settings (cannot be changed)")
    print("3. Network operator policies")
    print()
    print("What we can do:")
    print("✅ Set the SIM card number in the SIMCOM module")
    print("✅ Configure SMS service center")
    print("✅ Add 'PillPal:' prefix to message body (already done)")
    print()
    print("What we CANNOT do:")
    print("❌ Change the sender number to a different number")
    print("❌ Override carrier-controlled sender display")
    print()
    print("SOLUTION:")
    print("To use +639762549485 as the sender:")
    print("1. Insert a SIM card with that number into the SIMCOM module")
    print("2. OR use a service that allows custom sender IDs (paid service)")
    print("3. OR add 'PillPal: ' prefix to messages (already implemented)")
    print()
    print("Current implementation:")
    print("- Messages are sent with 'PillPal: ' prefix")
    print("- This ensures 'PillPal' appears in the message even if sender shows differently")
    print()
    
    ser.close()
    return True

if __name__ == "__main__":
    try:
        set_sender_number()
    except KeyboardInterrupt:
        print("\n\n⚠️ Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

