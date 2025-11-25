#!/usr/bin/env python3
"""
Standalone script to generate Pi unique ID
Run this manually if the server hasn't generated it yet
"""

import hashlib
import os
import subprocess

def get_pi_unique_id() -> str:
    """
    Generate a unique ID for this Raspberry Pi based on CPU serial number.
    This ID is persistent across reboots and uniquely identifies the Pi.
    """
    PI_ID_FILE = "/home/justin/pillpal/pi_unique_id.txt"
    
    # Try to read existing ID from file
    if os.path.exists(PI_ID_FILE):
        try:
            with open(PI_ID_FILE, 'r') as f:
                existing_id = f.read().strip()
                if existing_id:
                    print(f"✅ Using existing Pi unique ID from file: {existing_id}")
                    return existing_id
        except Exception as e:
            print(f"⚠️ Could not read Pi ID file: {e}")
    
    # Generate new ID based on CPU serial number
    try:
        # Read CPU serial from /proc/cpuinfo
        with open('/proc/cpuinfo', 'r') as f:
            for line in f:
                if line.startswith('Serial'):
                    serial = line.split(':')[1].strip()
                    # Create hash from serial for consistent ID
                    pi_id = hashlib.md5(serial.encode()).hexdigest()
                    print(f"🔑 Generated new Pi unique ID from serial: {pi_id}")
                    
                    # Save to file for persistence
                    try:
                        os.makedirs(os.path.dirname(PI_ID_FILE), exist_ok=True)
                        with open(PI_ID_FILE, 'w') as f:
                            f.write(pi_id)
                        print(f"💾 Saved Pi unique ID to {PI_ID_FILE}")
                    except Exception as e:
                        print(f"⚠️ Could not save Pi ID to file: {e}")
                    
                    return pi_id
    except Exception as e:
        print(f"❌ Error generating Pi unique ID: {e}")
    
    # Fallback: use hostname + MAC address
    try:
        hostname = subprocess.check_output(['hostname'], text=True).strip()
        try:
            mac_result = subprocess.check_output(['cat', '/sys/class/net/eth0/address'], text=True).strip()
        except:
            try:
                mac_result = subprocess.check_output(['cat', '/sys/class/net/wlan0/address'], text=True).strip()
            except:
                mac_result = "fallback"
        fallback_id = hashlib.md5(f"{hostname}{mac_result}".encode()).hexdigest()
        print(f"⚠️ Using fallback Pi unique ID: {fallback_id}")
        
        # Save to file
        try:
            os.makedirs(os.path.dirname(PI_ID_FILE), exist_ok=True)
            with open(PI_ID_FILE, 'w') as f:
                f.write(fallback_id)
            print(f"💾 Saved Pi unique ID to {PI_ID_FILE}")
        except Exception as e:
            print(f"⚠️ Could not save Pi ID to file: {e}")
        
        return fallback_id
    except Exception as e:
        print(f"❌ Error generating fallback Pi ID: {e}")
        # Last resort: random ID (not ideal, but better than nothing)
        import random
        random_id = hashlib.md5(str(random.random()).encode()).hexdigest()
        print(f"❌ Using random Pi ID (not persistent): {random_id}")
        return random_id

if __name__ == "__main__":
    pi_id = get_pi_unique_id()
    print(f"\n✅ Your Pi Unique ID is: {pi_id}")
    print(f"\n📋 Copy this ID to register your Pi in Supabase:")
    print(f"   INSERT INTO pi_registration (pi_unique_id, registered_email)")
    print(f"   VALUES ('{pi_id}', 'your-email@gmail.com');")


