# Copy Updated Python Server to Pi

## Option 1: Use SCP (Recommended)

**From your Windows PowerShell:**
```powershell
cd C:\Users\Feitan\PillApp\pillpal\pi-server
scp -o KexAlgorithms=+diffie-hellman-group1-sha1 -o HostKeyAlgorithms=+ssh-dss pi_websocket_server_PCA9685.py justin@192.168.100.68:/home/justin/pillpal/pi_websocket_server.py
```

**This will overwrite the old file with the new one.**

## Option 2: Check What Changed

The key change is in the `handle_dispense` function around line 520-545.

**Old code returned:**
```python
"servo2_moved": True,
```

**New code returns:**
```python
"servo2_ready": True,
```

## Option 3: Manual Edit in Nano

If you want to edit manually, find this section in `/home/justin/pillpal/pi_websocket_server.py`:

**Around line 533-545, change:**
```python
            return {
                "status": "success",
                "servo_id": servo_id,
                "medication": medication,
                "message": f"{medication} dispensed successfully",
                "servo2_moved": True,  # OLD - CHANGE THIS
                "requires_confirmation": True
            }
```

**To:**
```python
            return {
                "status": "success",
                "servo_id": servo_id,
                "medication": medication,
                "message": f"{medication} dispensed successfully",
                "servo2_ready": True,  # NEW - CHANGED
                "requires_confirmation": True
            }
```

## After Copying

1. **Test syntax:**
   ```bash
   python3 -m py_compile /home/justin/pillpal/pi_websocket_server.py
   ```

2. **Stop old server:**
   ```bash
   sudo systemctl stop pillpal.service
   pkill -9 -f "pi_websocket_server"
   ```

3. **Start new server:**
   ```bash
   cd /home/justin/pillpal
   python3 pi_websocket_server.py
   ```

