# SMS Sender Number Configuration Guide

## Understanding SMS Sender Numbers

The **sender number** in SMS is controlled by:
1. **The SIM card's phone number** (primary)
2. **Carrier/Network operator** (cannot be changed)
3. **Carrier policies** (varies by network)

## Important Limitation

⚠️ **You CANNOT change the SMS sender number to a different number via software.**

The sender number is determined by the SIM card inserted in the SIMCOM module. If you want `+639762549485` to appear as the sender, you need to:

### Option 1: Use SIM Card with That Number (Recommended)

1. Get a SIM card with phone number `+639762549485`
2. Insert it into the SIMCOM module
3. The sender will automatically be `+639762549485`

### Option 2: Use SMS Gateway Service (Paid)

Use a commercial SMS gateway service that allows custom sender IDs:
- Twilio
- Nexmo/Vonage
- Globe Labs API
- Smart Communications API

These services allow you to set custom sender numbers but require API integration.

### Option 3: Message Prefix (Current Implementation)

The current system adds `"PillPal: "` prefix to all SMS messages:

```
PillPal: The Aspirin for Morning is ready to dispense.
```

This ensures "PillPal" appears in the message even if the sender number shows differently.

## Current Implementation

The system already:
- ✅ Adds "PillPal: " prefix to all messages
- ✅ Formats phone numbers correctly
- ✅ Handles network registration
- ✅ Sends SMS via SIMCOM module

## Testing Current Sender

To check what number is currently sending SMS:

1. Run the test script:
```bash
python3 set_sms_sender_number.py
```

2. Check the SIM card number:
```bash
# On Raspberry Pi, connect via minicom or serial
minicom -D /dev/ttyS0 -b 115200
# Then type: AT+CNUM
```

## Recommendation

**Best Solution**: Insert a SIM card with number `+639762549485` into the SIMCOM module.

**Alternative**: Keep the current implementation with "PillPal: " prefix, which clearly identifies the sender in the message body.

## Files

- `set_sms_sender_number.py` - Script to check/configure sender settings
- This guide explains the limitations and solutions

