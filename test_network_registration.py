#!/usr/bin/env python3
"""
Network Registration Test and Fix Tool
Checks network registration status and helps register if needed
For Globe SIM and other carriers
"""

import serial
import serial.tools.list_ports
import time
import sys
import os

def send_at_command(ser, command, timeout=5, wait_for_ok=True):
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
                if wait_for_ok and ('OK' in response or 'ERROR' in response):
                    break
            time.sleep(0.1)
        
        response = response.strip()
        if command in response:
            response = response.replace(command, "").strip()
        
        return response
    except Exception as e:
        return f"ERROR: {e}"

def find_simcom_port():
    """Find SIMCOM module port"""
    common_ports = ['/dev/ttyUSB0', '/dev/ttyUSB1', '/dev/ttyUSB2', 
                    '/dev/ttyAMA0', '/dev/ttyS0', '/dev/ttyS1']
    
    for port in common_ports:
        if os.path.exists(port):
            return port
    
    # Try USB serial devices
    try:
        ports = serial.tools.list_ports.comports()
        for port in ports:
            if 'USB' in port.device or 'ttyUSB' in port.device:
                return port.device
    except:
        pass
    
    return None

def test_baud_rate(port, baudrate):
    """Test if module responds at given baud rate"""
    try:
        ser = serial.Serial(port=port, baudrate=baudrate, timeout=3, writeTimeout=3)
        time.sleep(2)
        
        ser.reset_input_buffer()
        ser.write(b"AT\r\n")
        time.sleep(0.5)
        
        response = ""
        start_time = time.time()
        while time.time() - start_time < 2:
            if ser.in_waiting > 0:
                response += ser.read(ser.in_waiting).decode('utf-8', errors='ignore')
                if 'OK' in response:
                    ser.close()
                    return True
            time.sleep(0.1)
        
        ser.close()
        return False
    except:
        return False

def check_network_registration():
    """Check and fix network registration"""
    print("=" * 70)
    print("Network Registration Check and Fix Tool")
    print("=" * 70)
    print()
    
    # Find port
    print("STEP 1: Finding SIMCOM module...")
    print("-" * 70)
    port = find_simcom_port()
    if not port:
        print("   ❌ SIMCOM module not found!")
        print("   Check USB connection")
        return False
    print(f"   ✅ Found: {port}")
    
    # Find baud rate
    print()
    print("STEP 2: Finding correct baud rate...")
    print("-" * 70)
    baud_rates = [115200, 9600, 57600, 38400]
    working_baud = None
    
    for baud in baud_rates:
        print(f"   Trying {baud} baud... ", end="", flush=True)
        if test_baud_rate(port, baud):
            print("✅")
            working_baud = baud
            break
        else:
            print("❌")
    
    if not working_baud:
        print("   ❌ Could not communicate with module!")
        return False
    
    print(f"   ✅ Working baud rate: {working_baud}")
    
    # Connect
    print()
    print("STEP 3: Connecting to module...")
    print("-" * 70)
    try:
        ser = serial.Serial(port=port, baudrate=working_baud, timeout=5, writeTimeout=5)
        time.sleep(2)
        print("   ✅ Connected")
    except Exception as e:
        print(f"   ❌ Connection failed: {e}")
        return False
    
    # Check SIM card
    print()
    print("STEP 4: Checking SIM card...")
    print("-" * 70)
    response = send_at_command(ser, "AT+CPIN?")
    print(f"   Response: {response}")
    
    if "READY" not in response:
        print("   ❌ SIM card not ready!")
        print("   Fix SIM card first before checking network")
        ser.close()
        return False
    print("   ✅ SIM card ready")
    
    # Check current registration status
    print()
    print("STEP 5: Checking Network Registration Status...")
    print("-" * 70)
    response = send_at_command(ser, "AT+CREG?")
    print(f"   Response: {response}")
    
    reg_status = None
    if "+CREG:" in response:
        try:
            parts = response.split("+CREG:")[1].strip()
            parts = parts.split(",")
            if len(parts) >= 2:
                stat = int(parts[1].strip())
                reg_status = stat
                
                if stat == 0:
                    print("   ⚠️ Status: Not registered, searching...")
                elif stat == 1:
                    print("   ✅ Status: Registered on HOME network")
                elif stat == 2:
                    print("   ✅ Status: Registered on ROAMING network")
                elif stat == 3:
                    print("   ❌ Status: Registration DENIED")
                elif stat == 4:
                    print("   ❌ Status: Unknown")
                elif stat == 5:
                    print("   ✅ Status: Registered (roaming)")
        except:
            pass
    
    # Check signal strength
    print()
    print("STEP 6: Checking Signal Strength...")
    print("-" * 70)
    response = send_at_command(ser, "AT+CSQ")
    print(f"   Response: {response}")
    
    signal = 0
    if "+CSQ:" in response:
        try:
            parts = response.split("+CSQ:")[1].strip().split(",")
            signal = int(parts[0].strip())
            
            if signal == 99:
                print("   ❌ Signal: Unknown/Not detectable")
            elif signal == 0:
                print("   ❌ Signal: NO SIGNAL (0/31)")
            elif signal <= 10:
                print(f"   ⚠️ Signal: Very weak ({signal}/31)")
            elif signal <= 20:
                print(f"   ⚠️ Signal: Weak ({signal}/31)")
            else:
                print(f"   ✅ Signal: Good ({signal}/31)")
        except:
            pass
    
    # Check network operator
    print()
    print("STEP 7: Checking Network Operator...")
    print("-" * 70)
    response = send_at_command(ser, "AT+COPS?")
    print(f"   Response: {response}")
    
    operator = "Unknown"
    if "+COPS:" in response:
        try:
            parts = response.split("+COPS:")[1].strip()
            if "," in parts:
                oper = parts.split(",")[-1].strip().strip('"')
                operator = oper
                print(f"   ✅ Operator: {operator}")
        except:
            pass
    
    # If not registered, try to register
    if reg_status != 1 and reg_status != 2:
        print()
        print("STEP 8: Attempting Network Registration...")
        print("-" * 70)
        print("   Trying automatic registration...")
        
        # Set to automatic registration mode
        response = send_at_command(ser, "AT+CREG=2")
        print(f"   Response: {response}")
        time.sleep(2)
        
        # Check registration again
        print("   Checking registration status again...")
        time.sleep(5)  # Wait for registration
        
        response = send_at_command(ser, "AT+CREG?")
        print(f"   Response: {response}")
        
        if "+CREG:" in response:
            try:
                parts = response.split("+CREG:")[1].strip().split(",")
                if len(parts) >= 2:
                    new_stat = int(parts[1].strip())
                    if new_stat == 1 or new_stat == 2:
                        print("   ✅ Registration successful!")
                        reg_status = new_stat
                    else:
                        print(f"   ⚠️ Still not registered (status: {new_stat})")
            except:
                pass
        
        # Try manual network selection (for Globe)
        if reg_status != 1 and reg_status != 2:
            print()
            print("   Trying manual network selection (Globe)...")
            
            # Search for available networks
            print("   Searching for available networks...")
            response = send_at_command(ser, "AT+COPS=?", timeout=30)
            print(f"   Available networks: {response[:200]}...")
            
            # Try to register with Globe (common in Philippines)
            globe_operators = ["51502", "51503", "51505"]  # Globe network codes
            
            for op_code in globe_operators:
                print(f"   Trying to register with operator {op_code}...")
                response = send_at_command(ser, f'AT+COPS=1,2,"{op_code}"', timeout=30)
                print(f"   Response: {response}")
                
                if "OK" in response:
                    time.sleep(5)
                    # Check if registered
                    response = send_at_command(ser, "AT+CREG?")
                    if "+CREG:" in response:
                        parts = response.split("+CREG:")[1].strip().split(",")
                        if len(parts) >= 2:
                            stat = int(parts[1].strip())
                            if stat == 1 or stat == 2:
                                print(f"   ✅ Successfully registered with operator {op_code}!")
                                reg_status = stat
                                break
    
    # Final summary
    print()
    print("=" * 70)
    print("FINAL STATUS")
    print("=" * 70)
    print(f"Port: {port}")
    print(f"Baud Rate: {working_baud}")
    print(f"SIM Card: ✅ Ready")
    print(f"Signal Strength: {signal}/31")
    print(f"Network Operator: {operator}")
    
    if reg_status == 1:
        print(f"Network Registration: ✅ REGISTERED (HOME)")
        print()
        print("✅ Network is registered! SMS should work.")
    elif reg_status == 2:
        print(f"Network Registration: ✅ REGISTERED (ROAMING)")
        print()
        print("✅ Network is registered! SMS should work.")
    else:
        print(f"Network Registration: ❌ NOT REGISTERED")
        print()
        print("❌ Network is not registered. SMS will NOT work.")
        print()
        print("Troubleshooting:")
        print("1. Check signal strength - move to better location")
        print("2. Check antenna connection")
        print("3. Wait longer (some modules need 1-2 minutes to register)")
        print("4. Check if SIM card has active service")
        print("5. Try power cycling the module (unplug/replug USB)")
        print("6. Check if SIM card is locked (PIN/PUK)")
    
    ser.close()
    return reg_status == 1 or reg_status == 2

if __name__ == "__main__":
    try:
        success = check_network_registration()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️ Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

