# 🔍 Get Your Pi Unique ID

## Method 1: Check the ID file (if server has run)

SSH into your Raspberry Pi and run:

```bash
cat /home/justin/pillpal/pi_unique_id.txt
```

If the file exists, you'll see your Pi unique ID (a long string of letters and numbers).

## Method 2: Check server logs

If the server is running, check the logs:

```bash
journalctl -u pillpal -n 100 | grep "Pi unique ID"
```

Look for a line like:
```
🔑 Generated new Pi unique ID from serial: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

## Method 3: Restart the server (will generate ID automatically)

If the ID file doesn't exist, restart your Pi server and it will generate the ID automatically:

```bash
sudo systemctl restart pillpal
```

Then wait a few seconds and check the file:
```bash
cat /home/justin/pillpal/pi_unique_id.txt
```

## Method 4: Check from server logs after restart

After restarting, check the logs:

```bash
journalctl -u pillpal -n 50 | grep -i "pi unique id"
```

The ID will be shown in the logs when the server starts.


