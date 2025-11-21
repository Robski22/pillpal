#!/usr/bin/env python3
"""
Comprehensive SIMCOM Module Test
Checks SIM card registration, network status, signal strength, and SMS capability
Run this on the Raspberry Pi to verify SIMCOM is working correctly
"""

import serial
import serial.tools.list_ports
import time
import sys
import os

def send_at_command(ser, command, timeout=3, wait_for_ok=True):
    """Send AT command and get response"""
    try:
        ser.reset_input_buffer()
        time.sleep(0.1)
        
        # Send command
        ser.write(f"{command}\r\n".encode())
        time.sleep(0.2)
        
        # Read response
        response = ""
        start_time = time.time()
        while time.time() - start_time < timeout:
            if ser.in_waiting > 0:
                chunk = ser.read(ser.in_waiting).decode('utf-8', errors='ignore')
                response += chunk
                if wait_for_ok and ('OK' in response or 'ERROR' in response):
                    break
            time.sleep(0.1)
        
        # Clean up response
        response = response.strip()
        # Remove echo of command if present
        if command in response:
            response = response.replace(command, "").strip()
        
        return response
    except Exception as e:
        return f"ERROR: {e}"

def check_simcom_status():
    """Comprehensive SIMCOM module status check"""
    print("=" * 70)
    print("SIMCOM Module Comprehensive Status Check")
    print("=" * 70)
    print()
    
    # Step 1: Find SIMCOM port
    print("STEP 1: Finding SIMCOM Module...")
    print("-" * 70)
    simcom_port = None
    common_ports = ['/dev/ttyUSB0', '/dev/ttyUSB1', '/dev/ttyUSB2', '/dev/ttyAMA0', '/dev/ttyS0']
    
    for port in common_ports:
        if os.path.exists(port):
            simcom_port = port
            print(f"   ✅ Found port: {port}")
            break
    
    if not simcom_port:
        # Try to find USB serial devices
        print("   Checking USB serial devices...")
        ports = serial.tools.list_ports.comports()
        for port in ports:
            if 'USB' in port.device or 'ttyUSB' in port.device:
                simcom_port = port.device
                print(f"   ✅ Found USB device: {simcom_port}")
                break
    
    if not simcom_port:
        print("   ❌ SIMCOM module not found!")
        print("   Check:")
        print("      - USB connection")
        print("      - Module power (LED should be on)")
        print("      - Run: ls -l /dev/ttyUSB*")
        return False
    
    # Step 2: Connect to SIMCOM
    print()
    print("STEP 2: Connecting to SIMCOM Module...")
    print("-" * 70)
    try:
        ser = serial.Serial(
            port=simcom_port,
            baudrate=9600,
            timeout=3,
            writeTimeout=3
        )
        time.sleep(2)  # Wait for module to initialize
        print(f"   ✅ Connected to {simcom_port} at 9600 baud")
    except Exception as e:
        print(f"   ❌ Connection failed: {e}")
        print("   Check:")
        print("      - Port permissions (may need sudo)")
        print("      - Another program using the port")
        return False
    
    # Step 3: Test basic communication
    print()
    print("STEP 3: Testing Module Communication...")
    print("-" * 70)
    response = send_at_command(ser, "AT")
    if "OK" in response:
        print("   ✅ Module responding to AT commands")
    else:
        print(f"   ⚠️ Unexpected response: {response}")
        print("   Module may not be ready, continuing anyway...")
    
    # Step 4: Check SIM card status
    print()
    print("STEP 4: Checking SIM Card Status...")
    print("-" * 70)
    response = send_at_command(ser, "AT+CPIN?")
    print(f"   Response: {response}")
    
    sim_ready = False
    sim_status = "Unknown"
    
    if "+CPIN: READY" in response:
        print("   ✅ SIM card detected and ready (no PIN required)")
        sim_ready = True
        sim_status = "READY"
    elif "+CPIN: SIM PIN" in response:
        print("   ⚠️ SIM card requires PIN (locked)")
        print("   ⚠️ SMS will NOT work until PIN is entered")
        sim_status = "PIN_REQUIRED"
    elif "+CPIN: SIM PUK" in response:
        print("   ❌ SIM card is locked (PUK required)")
        print("   ❌ SMS will NOT work")
        sim_status = "PUK_REQUIRED"
    elif "CPIN: NOT INSERTED" in response or "NOT INSERTED" in response:
        print("   ❌ SIM card not inserted")
        print("   ❌ SMS will NOT work")
        sim_status = "NOT_INSERTED"
    else:
        print(f"   ⚠️ Unknown SIM status: {response}")
        sim_status = "UNKNOWN"
    
    # Step 5: Check network registration
    print()
    print("STEP 5: Checking Network Registration...")
    print("-" * 70)
    response = send_at_command(ser, "AT+CREG?")
    print(f"   Response: {response}")
    
    network_registered = False
    reg_status = "Unknown"
    
    if "+CREG:" in response:
        try:
            # Parse: +CREG: <n>,<stat>
            parts = response.split("+CREG:")[1].strip()
            parts = parts.split(",")
            if len(parts) >= 2:
                stat = int(parts[1].strip())
                if stat == 1:
                    print("   ✅ Registered on home network")
                    network_registered = True
                    reg_status = "HOME"
                elif stat == 2:
                    print("   ✅ Registered on roaming network")
                    network_registered = True
                    reg_status = "ROAMING"
                elif stat == 0:
                    print("   ⚠️ Not registered, searching...")
                    reg_status = "SEARCHING"
                elif stat == 3:
                    print("   ❌ Registration denied")
                    reg_status = "DENIED"
                elif stat == 4:
                    print("   ❌ Unknown registration status")
                    reg_status = "UNKNOWN"
                else:
                    print(f"   ⚠️ Registration status: {stat}")
                    reg_status = f"STATUS_{stat}"
        except (ValueError, IndexError) as e:
            print(f"   ⚠️ Could not parse registration: {e}")
    
    # Step 6: Check signal strength
    print()
    print("STEP 6: Checking Signal Strength...")
    print("-" * 70)
    response = send_at_command(ser, "AT+CSQ")
    print(f"   Response: {response}")
    
    signal_strength = 0
    signal_quality = "Unknown"
    
    if "+CSQ:" in response:
        try:
            # Parse: +CSQ: <rssi>,<ber>
            parts = response.split("+CSQ:")[1].strip()
            parts = parts.split(",")
            rssi = int(parts[0].strip())
            ber = int(parts[1].strip()) if len(parts) > 1 else 0
            
            if rssi == 99:
                print("   ❌ Signal strength: Unknown/Not detectable")
                signal_strength = 0
                signal_quality = "NO_SIGNAL"
            else:
                signal_strength = rssi
                if signal_strength == 0:
                    print(f"   ❌ Signal strength: {signal_strength}/31 (NO SIGNAL)")
                    signal_quality = "NO_SIGNAL"
                elif signal_strength <= 10:
                    print(f"   ⚠️ Signal strength: {signal_strength}/31 (Very weak)")
                    signal_quality = "VERY_WEAK"
                elif signal_strength <= 20:
                    print(f"   ⚠️ Signal strength: {signal_strength}/31 (Weak)")
                    signal_quality = "WEAK"
                else:
                    print(f"   ✅ Signal strength: {signal_strength}/31 (Good)")
                    signal_quality = "GOOD"
        except (ValueError, IndexError) as e:
            print(f"   ⚠️ Could not parse signal: {e}")
    else:
        print("   ❌ Could not check signal strength")
    
    # Step 7: Get network operator
    print()
    print("STEP 7: Checking Network Operator...")
    print("-" * 70)
    response = send_at_command(ser, "AT+COPS?")
    print(f"   Response: {response}")
    
    operator_name = "Unknown"
    if "+COPS:" in response:
        try:
            # Parse: +COPS: <mode>[,<format>,<oper>]
            parts = response.split("+COPS:")[1].strip()
            if "," in parts:
                oper = parts.split(",")[-1].strip().strip('"')
                operator_name = oper
                print(f"   ✅ Network operator: {operator_name}")
            else:
                print(f"   ⚠️ Could not parse operator: {response}")
        except Exception as e:
            print(f"   ⚠️ Error parsing operator: {e}")
    else:
        print("   ⚠️ Could not get operator information")
    
    # Step 8: Check SMS mode
    print()
    print("STEP 8: Checking SMS Configuration...")
    print("-" * 70)
    response = send_at_command(ser, "AT+CMGF?")
    if "+CMGF: 1" in response:
        print("   ✅ SMS text mode enabled")
    else:
        print(f"   ⚠️ SMS mode: {response}")
        print("   Setting SMS text mode...")
        response = send_at_command(ser, "AT+CMGF=1")
        if "OK" in response:
            print("   ✅ SMS text mode set")
        else:
            print(f"   ⚠️ Could not set SMS mode: {response}")
    
    # Step 9: Check service center number
    print()
    print("STEP 9: Checking SMS Service Center...")
    print("-" * 70)
    response = send_at_command(ser, "AT+CSCA?")
    if "+CSCA:" in response:
        try:
            sca = response.split("+CSCA:")[1].strip().strip('"')
            print(f"   ✅ Service center: {sca}")
        except:
            print(f"   Response: {response}")
    else:
        print(f"   ⚠️ Could not get service center: {response}")
    
    # Final Summary
    print()
    print("=" * 70)
    print("FINAL SUMMARY")
    print("=" * 70)
    print(f"Port: {simcom_port}")
    print(f"SIM Card Status: {sim_status}")
    print(f"Network Registration: {reg_status}")
    print(f"Signal Strength: {signal_strength}/31 ({signal_quality})")
    print(f"Network Operator: {operator_name}")
    print()
    
    # Status indicators
    all_ok = True
    if not sim_ready:
        print("❌ SIM CARD: Not ready - SMS will NOT work!")
        all_ok = False
    if not network_registered:
        print("❌ NETWORK: Not registered - SMS will NOT work!")
        all_ok = False
    if signal_strength == 0:
        print("❌ SIGNAL: No signal - SMS will NOT work!")
        all_ok = False
    
    if all_ok:
        print("✅ ALL CHECKS PASSED - SIMCOM is ready for SMS!")
    else:
        print("⚠️ SOME CHECKS FAILED - Fix issues above before using SMS")
    
    print("=" * 70)
    
    ser.close()
    return all_ok

if __name__ == "__main__":
    try:
        success = check_simcom_status()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️ Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

