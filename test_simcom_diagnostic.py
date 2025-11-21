#!/usr/bin/env python3
"""
SIMCOM Diagnostic Tool - Finds the correct port and settings
This will test different ports and baud rates to find the working configuration
"""

import serial
import serial.tools.list_ports
import time
import sys
import os

def test_port_baud(port, baudrate, timeout=5):
    """Test if a port responds at a given baud rate"""
    try:
        ser = serial.Serial(
            port=port,
            baudrate=baudrate,
            timeout=timeout,
            writeTimeout=timeout,
            bytesize=serial.EIGHTBITS,
            parity=serial.PARITY_NONE,
            stopbits=serial.STOPBITS_ONE
        )
        
        # Wait for module to initialize
        time.sleep(2)
        
        # Clear buffer
        ser.reset_input_buffer()
        time.sleep(0.5)
        
        # Send AT command
        ser.write(b"AT\r\n")
        time.sleep(1)
        
        # Read response
        response = ""
        start_time = time.time()
        while time.time() - start_time < timeout:
            if ser.in_waiting > 0:
                chunk = ser.read(ser.in_waiting).decode('utf-8', errors='ignore')
                response += chunk
                if 'OK' in response or 'ERROR' in response:
                    break
            time.sleep(0.1)
        
        ser.close()
        
        # Check if we got a valid response
        if 'OK' in response or 'ERROR' in response:
            return True, response.strip()
        elif len(response) > 0:
            return False, response.strip()
        else:
            return False, "No response"
            
    except serial.SerialException as e:
        return False, f"Serial error: {e}"
    except Exception as e:
        return False, f"Error: {e}"

def find_simcom_module():
    """Find the correct SIMCOM module port and baud rate"""
    print("=" * 70)
    print("SIMCOM Module Diagnostic Tool")
    print("=" * 70)
    print()
    print("This will test different ports and baud rates to find the working configuration...")
    print()
    
    # Find all possible ports
    print("STEP 1: Scanning for serial ports...")
    print("-" * 70)
    
    possible_ports = []
    
    # Check common ports
    common_ports = ['/dev/ttyUSB0', '/dev/ttyUSB1', '/dev/ttyUSB2', 
                    '/dev/ttyAMA0', '/dev/ttyS0', '/dev/ttyS1']
    
    for port in common_ports:
        if os.path.exists(port):
            possible_ports.append(port)
            print(f"   ✅ Found: {port}")
    
    # Check USB serial devices
    try:
        ports = serial.tools.list_ports.comports()
        for port in ports:
            if port.device not in possible_ports:
                possible_ports.append(port.device)
                print(f"   ✅ Found: {port.device} ({port.description})")
    except:
        pass
    
    if not possible_ports:
        print("   ❌ No serial ports found!")
        print("   Check USB connection and run: ls -l /dev/tty*")
        return None, None
    
    # Test different baud rates
    baud_rates = [9600, 115200, 57600, 38400, 19200, 4800]
    
    print()
    print("STEP 2: Testing ports and baud rates...")
    print("-" * 70)
    print("This may take a minute...")
    print()
    
    working_configs = []
    
    for port in possible_ports:
        print(f"Testing {port}...")
        for baud in baud_rates:
            print(f"   Trying {baud} baud... ", end="", flush=True)
            success, response = test_port_baud(port, baud, timeout=3)
            
            if success:
                print(f"✅ WORKING! Response: {response[:50]}")
                working_configs.append((port, baud, response))
            elif len(response) > 0 and response != "No response":
                print(f"⚠️ Got response but not OK: {response[:50]}")
            else:
                print("❌ No response")
    
    print()
    print("=" * 70)
    print("RESULTS")
    print("=" * 70)
    
    if working_configs:
        print(f"✅ Found {len(working_configs)} working configuration(s):")
        print()
        for port, baud, response in working_configs:
            print(f"   Port: {port}")
            print(f"   Baud Rate: {baud}")
            print(f"   Response: {response[:100]}")
            print()
        
        # Use the first working config
        best_port, best_baud, _ = working_configs[0]
        print(f"✅ RECOMMENDED CONFIGURATION:")
        print(f"   Port: {best_port}")
        print(f"   Baud Rate: {best_baud}")
        print()
        print("=" * 70)
        return best_port, best_baud
    else:
        print("❌ No working configuration found!")
        print()
        print("Troubleshooting:")
        print("1. Check if SIMCOM module is powered (LED should be on)")
        print("2. Check USB connection")
        print("3. Try unplugging and replugging USB cable")
        print("4. Check if module needs more time to initialize (wait 10 seconds)")
        print("5. Try different USB port on Raspberry Pi")
        print("6. Check if module is actually a SIMCOM module")
        print("7. Verify module is not being used by another program")
        print()
        print("To check if port is in use:")
        print(f"   sudo lsof | grep {possible_ports[0]}")
        print()
        return None, None

def test_detailed_commands(port, baudrate):
    """Test detailed commands once we have working port/baud"""
    print()
    print("=" * 70)
    print("Testing Detailed Commands")
    print("=" * 70)
    print()
    
    try:
        ser = serial.Serial(
            port=port,
            baudrate=baudrate,
            timeout=5,
            writeTimeout=5
        )
        time.sleep(2)
        
        def send_cmd(cmd, desc):
            ser.reset_input_buffer()
            time.sleep(0.2)
            ser.write(f"{cmd}\r\n".encode())
            time.sleep(1)
            
            response = ""
            start_time = time.time()
            while time.time() - start_time < 3:
                if ser.in_waiting > 0:
                    chunk = ser.read(ser.in_waiting).decode('utf-8', errors='ignore')
                    response += chunk
                    if 'OK' in response or 'ERROR' in response:
                        break
                time.sleep(0.1)
            
            print(f"{desc}:")
            print(f"   Command: {cmd}")
            print(f"   Response: {response.strip()}")
            print()
            return response
        
        # Test basic commands
        send_cmd("AT", "Basic AT Test")
        send_cmd("ATI", "Module Identification")
        send_cmd("AT+CPIN?", "SIM Card Status")
        send_cmd("AT+CSQ", "Signal Strength")
        send_cmd("AT+CREG?", "Network Registration")
        
        ser.close()
        
    except Exception as e:
        print(f"❌ Error testing commands: {e}")

if __name__ == "__main__":
    try:
        port, baud = find_simcom_module()
        
        if port and baud:
            print()
            response = input("Do you want to test detailed commands? (y/n): ")
            if response.lower() == 'y':
                test_detailed_commands(port, baud)
            
            print()
            print("=" * 70)
            print("NEXT STEPS")
            print("=" * 70)
            print()
            print("Update the server code with these settings:")
            print(f"   Port: {port}")
            print(f"   Baud Rate: {baud}")
            print()
            print("Or test manually with minicom:")
            print(f"   sudo minicom -D {port} -b {baud}")
            
    except KeyboardInterrupt:
        print("\n\n⚠️ Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

