# 🔧 Troubleshoot Pi Unique ID Generation

## Step 1: Check if the service is running

```bash
sudo systemctl status pillpal
```

Look for:
- Status should be "active (running)"
- Check if there are any errors

## Step 2: Check the server logs

```bash
journalctl -u pillpal -n 100
```

Look for:
- Any errors about file permissions
- Messages about "Pi unique ID"
- Any Python errors

## Step 3: Check if the directory exists

```bash
ls -la /home/justin/pillpal/
```

If the directory doesn't exist, create it:
```bash
mkdir -p /home/justin/pillpal/
chown justin:justin /home/justin/pillpal/
```

## Step 4: Check if the server is calling the function

Check the logs specifically for Pi ID:
```bash
journalctl -u pillpal -n 100 | grep -i "pi.*unique\|unique.*id\|generated.*id"
```

## Step 5: Manually generate the ID (temporary solution)

If the server isn't generating it, we can manually generate it:

```bash
# Get the CPU serial number
cat /proc/cpuinfo | grep Serial | awk '{print $3}'

# Generate a hash from it (if serial exists)
SERIAL=$(cat /proc/cpuinfo | grep Serial | awk '{print $3}')
if [ ! -z "$SERIAL" ]; then
  echo -n "$SERIAL" | md5sum | cut -d' ' -f1
fi
```

Or use hostname and MAC address:
```bash
HOSTNAME=$(hostname)
MAC=$(cat /sys/class/net/eth0/address 2>/dev/null || cat /sys/class/net/wlan0/address 2>/dev/null || echo "fallback")
echo -n "${HOSTNAME}${MAC}" | md5sum | cut -d' ' -f1
```

## Step 6: Manually create the ID file

Once you have the ID, create the file:

```bash
# Replace YOUR_PI_ID_HERE with the actual ID from Step 5
mkdir -p /home/justin/pillpal/
echo "YOUR_PI_ID_HERE" > /home/justin/pillpal/pi_unique_id.txt
chmod 644 /home/justin/pillpal/pi_unique_id.txt
chown justin:justin /home/justin/pillpal/pi_unique_id.txt
```

Then verify:
```bash
cat /home/justin/pillpal/pi_unique_id.txt
```

## Step 7: Check Python server code

Make sure the Python server has the `get_pi_unique_id()` function. Check the logs to see if there are import errors or syntax errors.


