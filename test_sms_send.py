#!/usr/bin/env python3
"""
SMS Sending Test Tool
Tests sending SMS messages via SIMCOM module
"""

import serial
import time
import sys
import os

def send_at_command(ser, command, timeout=5, wait_for_prompt=False):
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
                if wait_for_prompt:
                    if '>' in response:
                        return response
                elif 'OK' in response or 'ERROR' in response:
                    break
            time.sleep(0.1)
        
        return response.strip()
    except Exception as e:
        return f"ERROR: {e}"

def send_sms(ser, phone_number, message):
    """Send SMS message"""
    print(f"\nSending SMS to {phone_number}...")
    print(f"Message: {message}")
    print("-" * 70)
    
    # Set SMS text mode
    print("1. Setting SMS text mode...")
    ser.reset_input_buffer()
    time.sleep(0.2)
    response = send_at_command(ser, "AT+CMGF=1", timeout=5)
    if "OK" not in response:
        print(f"   ❌ Failed: {response}")
        return False
    print("   ✅ SMS text mode set")
    time.sleep(0.5)
    
    # Check SMS service center first
    print("2. Checking SMS service center...")
    response = send_at_command(ser, "AT+CSCA?", timeout=5)
    print(f"   Service center: {response}")
    if "+CSCA:" not in response:
        print("   ⚠️ Service center not configured, trying to set...")
        # Try to set Globe's service center (common in Philippines)
        response = send_at_command(ser, 'AT+CSCA="+639170000130"', timeout=5)
        print(f"   Response: {response}")
    time.sleep(0.5)
    
    # Set recipient number and wait for '>' prompt
    print(f"3. Setting recipient number: {phone_number}...")
    ser.reset_input_buffer()
    time.sleep(0.2)
    
    # Send CMGS command
    ser.write(f'AT+CMGS="{phone_number}"\r\n'.encode())
    time.sleep(0.5)
    
    # Wait for '>' prompt
    print("   Waiting for '>' prompt...")
    prompt_received = False
    response = ""
    start_time = time.time()
    while time.time() - start_time < 5:
        if ser.in_waiting > 0:
            chunk = ser.read(ser.in_waiting).decode('utf-8', errors='ignore')
            response += chunk
            if '>' in response:
                prompt_received = True
                print("   ✅ Received '>' prompt")
                break
        time.sleep(0.1)
    
    if not prompt_received:
        print(f"   ⚠️ Did not receive '>' prompt")
        print(f"   Response so far: {response}")
        print("   Continuing anyway...")
    
    # Clear any remaining data before sending message
    time.sleep(0.2)
    if ser.in_waiting > 0:
        ser.read(ser.in_waiting)
    
    # Send message text followed by Ctrl+Z (ASCII 26)
    print("4. Sending message...")
    message_bytes = message.encode('utf-8')
    ser.write(message_bytes)
    time.sleep(0.2)
    ser.write(b'\x1A')  # Ctrl+Z to send
    time.sleep(0.5)
    
    # Wait for response (CMGS confirmation)
    print("5. Waiting for confirmation...")
    response = ""
    start_time = time.time()
    while time.time() - start_time < 15:  # Wait up to 15 seconds
        if ser.in_waiting > 0:
            chunk = ser.read(ser.in_waiting).decode('utf-8', errors='ignore')
            response += chunk
            # Look for CMGS confirmation or OK/ERROR
            if '+CMGS:' in response:
                print(f"   ✅ Received CMGS confirmation!")
                break
            elif 'OK' in response and '+CMGS:' not in response:
                # Sometimes OK comes before CMGS, wait a bit more
                time.sleep(0.5)
                if ser.in_waiting > 0:
                    chunk = ser.read(ser.in_waiting).decode('utf-8', errors='ignore')
                    response += chunk
                if '+CMGS:' in response:
                    break
            elif 'ERROR' in response:
                break
        time.sleep(0.2)
    
    print(f"   Full response: {response.strip()}")
    
    # Check if SMS was sent successfully
    if '+CMGS:' in response:
        # Extract message reference number
        try:
            msg_ref = response.split('+CMGS:')[1].strip().split()[0]
            print(f"   ✅ SMS sent successfully! Message reference: {msg_ref}")
            return True
        except:
            print(f"   ✅ SMS sent successfully!")
            return True
    elif 'OK' in response and 'ERROR' not in response:
        print(f"   ✅ SMS sent (OK received)")
        return True
    elif 'ERROR' in response:
        print(f"   ❌ SMS sending failed! Error in response")
        return False
    else:
        print(f"   ⚠️ Unknown response - checking if SMS was sent...")
        print(f"   Response: {response}")
        # Sometimes the response is delayed, give it more time
        time.sleep(2)
        if ser.in_waiting > 0:
            additional = ser.read(ser.in_waiting).decode('utf-8', errors='ignore')
            print(f"   Additional response: {additional}")
            if '+CMGS:' in additional or 'OK' in additional:
                return True
        return False

def test_sms():
    """Test SMS sending"""
    print("=" * 70)
    print("SMS Sending Test Tool")
    print("=" * 70)
    print()
    
    # Configuration
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
    
    # Test basic communication
    print("\nTesting module communication...")
    response = send_at_command(ser, "AT")
    if "OK" not in response:
        print(f"❌ Module not responding: {response}")
        ser.close()
        return False
    print("✅ Module responding")
    
    # Check SIM card
    print("\nChecking SIM card...")
    response = send_at_command(ser, "AT+CPIN?")
    if "READY" not in response:
        print(f"❌ SIM card not ready: {response}")
        ser.close()
        return False
    print("✅ SIM card ready")
    
    # Check network registration
    print("\nChecking network registration...")
    response = send_at_command(ser, "AT+CREG?")
    if "+CREG:" in response:
        if ",1" in response or ",2" in response or ",5" in response:
            print("✅ Network registered")
        else:
            print(f"⚠️ Network not registered: {response}")
            print("   SMS may not work without network registration")
    else:
        print(f"⚠️ Could not check registration: {response}")
    
    # Check signal
    print("\nChecking signal strength...")
    response = send_at_command(ser, "AT+CSQ")
    if "+CSQ:" in response:
        try:
            signal = int(response.split("+CSQ:")[1].strip().split(",")[0].strip())
            if signal == 0:
                print(f"⚠️ No signal ({signal}/31) - SMS may fail")
            elif signal < 10:
                print(f"⚠️ Very weak signal ({signal}/31) - SMS may fail")
            else:
                print(f"✅ Signal strength: {signal}/31")
        except:
            pass
    
    # Check SMS service center
    print("\nChecking SMS service center...")
    response = send_at_command(ser, "AT+CSCA?")
    if "+CSCA:" in response:
        try:
            sca = response.split("+CSCA:")[1].strip().strip('"')
            print(f"✅ Service center: {sca}")
        except:
            print(f"   Response: {response}")
    else:
        print(f"⚠️ Could not get service center: {response}")
    
    # Get phone number to send to
    print()
    print("=" * 70)
    print("SMS Sending Test")
    print("=" * 70)
    print()
    print("Enter phone number to send test SMS to.")
    print("Format: +639123456789 (with country code)")
    print("Or: 09123456789 (local format)")
    print()
    
    phone = input("Phone number: ").strip()
    
    # Format phone number (add +63 if local format)
    if phone.startswith("09") or phone.startswith("9"):
        if phone.startswith("09"):
            phone = "+63" + phone[1:]
        else:
            phone = "+63" + phone
    elif not phone.startswith("+"):
        phone = "+" + phone
    
    print(f"\nFormatted phone number: {phone}")
    
    # Get message
    print()
    message = input("Enter test message (or press Enter for default): ").strip()
    if not message:
        message = "Test SMS from PillPal - Network is working!"
    
    # Send SMS
    print()
    print("=" * 70)
    success = send_sms(ser, phone, message)
    print("=" * 70)
    
    if success:
        print("\n✅ SMS TEST SUCCESSFUL!")
        print("   Check the recipient phone to verify SMS was received.")
    else:
        print("\n❌ SMS TEST FAILED!")
        print("   Check:")
        print("   - Network registration (should be registered)")
        print("   - Signal strength (should be > 0)")
        print("   - Phone number format (should include country code)")
        print("   - SMS service center is configured")
    
    ser.close()
    return success

if __name__ == "__main__":
    try:
        success = test_sms()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️ Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

