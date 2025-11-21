# How to Check SIMCOM and SIM Card Status

## Method 1: Via WebSocket (From Web App)

The server already has a `check_simcom_status` command built-in. You can check it from the web app or via WebSocket.

### From Web App (if implemented):
- Look for a "Check SIMCOM Status" button or similar
- Or check the connection status indicator

### Via WebSocket (Manual):
```javascript
// In browser console (F12) when web app is open
const ws = new WebSocket('ws://192.168.100.220:8765');
ws.onopen = () => {
    ws.send(JSON.stringify({
        type: 'check_simcom_status'
    }));
};
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'simcom_status') {
        console.log('SIMCOM Status:', data);
        // Should show:
        // {
        //   type: 'simcom_status',
        //   sim_inserted: true/false,
        //   signal_strength: 0-31,
        //   connected: true/false
        // }
    }
};
```

## Method 2: Direct Python Script (Recommended)

Create a test script to check SIMCOM status directly:

### Step 1: SSH into Raspberry Pi
```bash
ssh justin@192.168.100.220
cd /home/justin/pillpal
```

### Step 2: Create Test Script
```bash
cat > check_simcom.py << 'EOF'
#!/usr/bin/env python3
"""
Check SIMCOM module and SIM card status
"""
import serial
import serial.tools.list_ports
import time
import sys

def send_at_command(ser, command, timeout=3):
    """Send AT command and get response"""
    try:
        ser.reset_input_buffer()
        ser.write(f"{command}\r\n".encode())
        time.sleep(0.1)
        
        response = ""
        start_time = time.time()
        while time.time() - start_time < timeout:
            if ser.in_waiting > 0:
                response += ser.read(ser.in_waiting).decode('utf-8', errors='ignore')
                if 'OK' in response or 'ERROR' in response:
                    break
            time.sleep(0.1)
        
        return response.strip()
    except Exception as e:
        return f"ERROR: {e}"

def check_simcom_status():
    """Check SIMCOM module status"""
    print("=" * 50)
    print("SIMCOM Module Status Check")
    print("=" * 50)
    
    # Find SIMCOM port
    simcom_port = None
    common_ports = ['/dev/ttyUSB0', '/dev/ttyUSB1', '/dev/ttyAMA0', '/dev/ttyS0']
    
    print("\n1. Checking for SIMCOM module...")
    for port in common_ports:
        try:
            if os.path.exists(port):
                simcom_port = port
                print(f"   ✅ Found: {port}")
                break
        except:
            pass
    
    if not simcom_port:
        # Try to find USB serial devices
        ports = serial.tools.list_ports.comports()
        for port in ports:
            if 'USB' in port.device or 'ttyUSB' in port.device:
                simcom_port = port.device
                print(f"   ✅ Found: {simcom_port}")
                break
    
    if not simcom_port:
        print("   ❌ SIMCOM module not found!")
        print("   Check USB connection")
        return
    
    # Connect to SIMCOM
    print(f"\n2. Connecting to {simcom_port}...")
    try:
        ser = serial.Serial(
            port=simcom_port,
            baudrate=9600,
            timeout=3,
            writeTimeout=3
        )
        time.sleep(2)  # Wait for module to initialize
        print("   ✅ Connected")
    except Exception as e:
        print(f"   ❌ Connection failed: {e}")
        return
    
    # Test AT command
    print("\n3. Testing AT command...")
    response = send_at_command(ser, "AT")
    if "OK" in response:
        print("   ✅ Module responding")
    else:
        print(f"   ⚠️ Unexpected response: {response}")
    
    # Check SIM card status
    print("\n4. Checking SIM card status...")
    response = send_at_command(ser, "AT+CPIN?")
    if "READY" in response:
        print("   ✅ SIM card detected and ready")
        sim_ready = True
    elif "SIM PIN" in response:
        print("   ⚠️ SIM card requires PIN (locked)")
        sim_ready = False
    elif "SIM PUK" in response:
        print("   ❌ SIM card is locked (PUK required)")
        sim_ready = False
    else:
        print(f"   ❌ SIM card not detected: {response}")
        sim_ready = False
    
    # Check signal strength
    print("\n5. Checking signal strength...")
    response = send_at_command(ser, "AT+CSQ")
    if "+CSQ:" in response:
        try:
            # Parse: +CSQ: <rssi>,<ber>
            parts = response.split("+CSQ:")[1].split(",")[0].strip()
            rssi = int(parts)
            
            if rssi == 99:
                print("   ⚠️ Signal strength: Unknown/Not detectable (0)")
                signal = 0
            else:
                signal = rssi
                if signal == 0:
                    print(f"   ❌ Signal strength: {signal}/31 (NO SIGNAL)")
                elif signal <= 10:
                    print(f"   ⚠️ Signal strength: {signal}/31 (Very weak)")
                elif signal <= 20:
                    print(f"   ⚠️ Signal strength: {signal}/31 (Weak)")
                else:
                    print(f"   ✅ Signal strength: {signal}/31 (Good)")
        except ValueError:
            print(f"   ⚠️ Could not parse signal: {response}")
            signal = 0
    else:
        print(f"   ❌ Could not check signal: {response}")
        signal = 0
    
    # Check SMS text mode
    print("\n6. Checking SMS mode...")
    response = send_at_command(ser, "AT+CMGF?")
    if "CMGF: 1" in response:
        print("   ✅ SMS text mode enabled")
    else:
        print(f"   ⚠️ SMS mode: {response}")
    
    # Summary
    print("\n" + "=" * 50)
    print("SUMMARY")
    print("=" * 50)
    print(f"Port: {simcom_port}")
    print(f"SIM Card: {'✅ Ready' if sim_ready else '❌ Not Ready'}")
    print(f"Signal: {signal}/31 {'✅' if signal > 0 else '❌ NO SIGNAL'}")
    print(f"Module: ✅ Connected")
    
    if not sim_ready:
        print("\n⚠️ SIM card is not ready - SMS will NOT work!")
    if signal == 0:
        print("⚠️ No signal - SMS will NOT work!")
    
    ser.close()
    print("\n" + "=" * 50)

if __name__ == "__main__":
    import os
    check_simcom_status()
EOF

chmod +x check_simcom.py
```

### Step 3: Run the Script
```bash
python3 check_simcom.py
```

### Expected Output:
```
==================================================
SIMCOM Module Status Check
==================================================

1. Checking for SIMCOM module...
   ✅ Found: /dev/ttyUSB0

2. Connecting to /dev/ttyUSB0...
   ✅ Connected

3. Testing AT command...
   ✅ Module responding

4. Checking SIM card status...
   ✅ SIM card detected and ready

5. Checking signal strength...
   ✅ Signal strength: 25/31 (Good)

6. Checking SMS mode...
   ✅ SMS text mode enabled

==================================================
SUMMARY
==================================================
Port: /dev/ttyUSB0
SIM Card: ✅ Ready
Signal: 25/31 ✅
Module: ✅ Connected
==================================================
```

## Method 3: Quick AT Commands (Manual)

You can also use `minicom` or `screen` to send AT commands directly:

```bash
# Install minicom (if not installed)
sudo apt-get install minicom

# Connect to SIMCOM
sudo minicom -D /dev/ttyUSB0 -b 9600

# In minicom, type these commands:
AT              # Should respond: OK
AT+CPIN?        # Check SIM card status (should show: +CPIN: READY)
AT+CSQ          # Check signal strength (should show: +CSQ: 25,0)
AT+CMGF?        # Check SMS mode (should show: +CMGF: 1)

# Exit minicom: Ctrl+A, then X, then Enter
```

## Method 4: Check Server Logs

When the server starts, it automatically checks SIMCOM status. Look for these lines in the server logs:

```
📱 Connecting to SIMCOM module at /dev/ttyUSB0...
✅ SIM card detected and ready
📶 Signal strength: 25/31
✅ SIMCOM module initialized: SIM=Inserted, Signal=25
```

If you see:
- `❌ SIM card not inserted or not ready`: SIM card issue
- `⚠️ SIMCOM module not found`: USB connection issue
- `Signal: 0`: No signal (check antenna)

## Troubleshooting

### If SIMCOM not found:
1. Check USB connection: `ls -l /dev/ttyUSB*`
2. Try different USB port
3. Check if module is powered (LED should be on)

### If SIM card not ready:
1. Remove and reinsert SIM card
2. Check SIM card in a phone first
3. Check if SIM card is locked (PIN/PUK)

### If Signal = 0:
1. Check antenna connection
2. Move to area with better signal
3. Check if SIM card has active service

