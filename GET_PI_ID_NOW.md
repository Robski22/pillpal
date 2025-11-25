# 🔍 Get Your Pi Unique ID - Quick Guide

The Pi unique ID file wasn't generated. Here's how to fix it:

## Option 1: Manual Script (Easiest)

1. **Copy the script to your Pi** (or create it directly on the Pi):
   - File: `pi-server/generate_pi_id.py`

2. **Run the script**:
   ```bash
   cd /home/justin/pillpal
   python3 pi-server/generate_pi_id.py
   ```

3. **The script will**:
   - Generate the Pi unique ID
   - Save it to `/home/justin/pillpal/pi_unique_id.txt`
   - Display the ID on screen

4. **Copy the ID** and use it to register your Pi in Supabase.

## Option 2: Update Server Code (Automatic)

The server code has been updated to generate the ID on startup. 

1. **Upload the updated `pi_websocket_server_PCA9685.py`** to your Pi

2. **Restart the service**:
   ```bash
   sudo systemctl restart pillpal
   ```

3. **Check the logs**:
   ```bash
   journalctl -u pillpal -n 50 | grep "Pi Unique ID"
   ```

4. **Check the file**:
   ```bash
   cat /home/justin/pillpal/pi_unique_id.txt
   ```

## Option 3: Manual Bash Command

If you can't use Python, run these commands:

```bash
# Get CPU serial
SERIAL=$(cat /proc/cpuinfo | grep Serial | awk '{print $3}')

# Generate MD5 hash (requires md5sum or md5 command)
if command -v md5sum > /dev/null; then
    PI_ID=$(echo -n "$SERIAL" | md5sum | cut -d' ' -f1)
elif command -v md5 > /dev/null; then
    PI_ID=$(echo -n "$SERIAL" | md5 | cut -d' ' -f1)
else
    echo "Error: md5sum or md5 command not found"
    exit 1
fi

# Create directory and save ID
mkdir -p /home/justin/pillpal/
echo "$PI_ID" > /home/justin/pillpal/pi_unique_id.txt
chmod 644 /home/justin/pillpal/pi_unique_id.txt
chown justin:justin /home/justin/pillpal/pi_unique_id.txt

# Display the ID
echo "Your Pi Unique ID is: $PI_ID"
cat /home/justin/pillpal/pi_unique_id.txt
```

## After Getting the ID

Once you have your Pi unique ID, register it in Supabase:

1. **Open** `register_pi.sql` in Supabase SQL Editor
2. **Replace** `YOUR_PI_UNIQUE_ID_HERE` with your actual ID
3. **Replace** `your-email@gmail.com` with `estaciomark03@gmail.com`
4. **Run** the query

Example:
```sql
INSERT INTO pi_registration (pi_unique_id, registered_email)
VALUES ('a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', 'estaciomark03@gmail.com')
ON CONFLICT (pi_unique_id) DO UPDATE 
SET registered_email = EXCLUDED.registered_email, last_seen = NOW();
```


