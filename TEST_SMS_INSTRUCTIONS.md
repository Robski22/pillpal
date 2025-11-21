# SMS Sending Test Instructions

## Quick Test

### Step 1: Copy test script
```bash
scp C:\Users\Feitan\PillApp\pillpal\test_sms_send.py justin@192.168.100.220:/home/justin/pillpal/
```

### Step 2: Run test
```bash
ssh justin@192.168.100.220
cd /home/justin/pillpal
sudo python3 test_sms_send.py
```

### Step 3: Enter details
- **Phone number**: Enter the number to send test SMS to
  - Format: `+639123456789` (with country code)
  - Or: `09123456789` (local format, will auto-add +63)
- **Message**: Enter test message (or press Enter for default)

## Phone Number Format

### For Philippines (Globe):
- **With country code**: `+639123456789`
- **Local format**: `09123456789` (script will auto-convert to +639123456789)

### For other countries:
- **With country code**: `+1234567890` (include + and country code)

## Expected Output

### ✅ Success:
```
Sending SMS to +639123456789...
Message: Test SMS from PillPal - Network is working!
----------------------------------------------------------------------
1. Setting SMS text mode...
   ✅ SMS text mode set
2. Setting recipient number: +639123456789...
3. Sending message...
4. Waiting for confirmation...
   Response: +CMGS: 123
   OK
   ✅ SMS sent successfully!

✅ SMS TEST SUCCESSFUL!
   Check the recipient phone to verify SMS was received.
```

### ❌ Failure:
```
❌ SMS sending failed!
   Check:
   - Network registration (should be registered)
   - Signal strength (should be > 0)
   - Phone number format (should include country code)
   - SMS service center is configured
```

## Troubleshooting

### If SMS fails:

1. **Check network registration**:
   ```bash
   python3 test_network_registration.py
   ```
   Should show: `✅ REGISTERED (HOME)`

2. **Check signal strength**:
   - Your signal is 15/31 (weak but should work)
   - If signal is 0, SMS will fail
   - Try moving to better location

3. **Check phone number format**:
   - Must include country code
   - For Philippines: `+639123456789`
   - No spaces or dashes

4. **Check SMS service center**:
   - Run the test script - it will show service center
   - Should be configured automatically by Globe

5. **Wait a bit**:
   - Sometimes SMS takes 10-30 seconds to send
   - Check recipient phone after 1 minute

### If SMS service center is missing:

Set it manually:
```bash
sudo minicom -D /dev/ttyS0 -b 115200
```

Then type:
```
AT+CSCA="+639170000130"
```

(Globe's SMS service center - check with Globe if this is correct)

## Test from Server

The server also has SMS functionality. You can test it from the web app:

1. **Open web app** in browser
2. **Set up medication schedule**
3. **When dispense happens**, SMS should be sent automatically
4. **Check recipient phone** for SMS

## Manual SMS Test (Advanced)

If you want to test manually with minicom:

```bash
sudo minicom -D /dev/ttyS0 -b 115200
```

Then type:
```
AT+CMGF=1
AT+CMGS="+639123456789"
> Test message from PillPal
```
(Press `Ctrl+Z` to send, not Enter)

Wait for response:
```
+CMGS: 123
OK
```

## Integration with PillPal

The server automatically sends SMS when:
- Medication dispense is triggered
- User confirms dispense (Yes/No dialog)
- Force dispense happens

SMS is sent to:
- Patient's phone number (from profile)
- Caregiver's phone number (if caregiver is set)

Make sure phone numbers are set in the profile page!

