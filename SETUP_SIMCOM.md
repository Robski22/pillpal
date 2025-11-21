# SIMCOM Module Setup Instructions

## Prerequisites

1. **Install pyserial** on Raspberry Pi:
```bash
pip3 install pyserial
```

2. **Check SIMCOM module connection**:
```bash
# List all serial devices
ls -l /dev/tty*

# Common ports for SIMCOM modules:
# - /dev/ttyUSB0 (USB-to-Serial adapter)
# - /dev/ttyUSB1
# - /dev/ttyAMA0 (GPIO serial)
```

## Wiring

SIMCOM modules (SIM800L/SIM900A) typically connect via:
- **VCC** → 5V (or 3.7V-4.2V for SIM800L)
- **GND** → GND
- **TXD** → Raspberry Pi RX (GPIO15/UART)
- **RXD** → Raspberry Pi TX (GPIO14/UART)

Or via USB-to-Serial adapter:
- Connect to USB port
- Usually appears as `/dev/ttyUSB0`

## Configuration

The server automatically detects the SIMCOM module port. If it's not detected, you can specify it in the code:

```python
sms_controller = SMSController(
    demo_mode=False,
    serial_port='/dev/ttyUSB0',  # Change to your port
    baudrate=9600  # Common baudrates: 9600, 115200
)
```

## Testing

### 1. Check SIMCOM Status

The server will automatically check:
- ✅ SIM card insertion
- ✅ Signal strength
- ✅ Module connection

Check logs when server starts:
```
✅ SIMCOM module initialized: SIM=Inserted, Signal=25
```

### 2. Test SMS Sending

When you dispense medication, SMS will be sent automatically before the confirmation dialog.

Message format:
- Single medicine: "The Aspirin for Morning is ready to dispense."
- Multiple medicines: "The Aspirin, Paracetamol for Afternoon are ready to dispense."

### 3. Manual Test (via WebSocket)

You can test SMS manually by sending:
```json
{
  "type": "send_sms",
  "phone_numbers": ["09171234567"],
  "message": "Test message"
}
```

### 4. Check Status

Send status check:
```json
{
  "type": "check_simcom_status"
}
```

Response:
```json
{
  "status": "success",
  "type": "simcom_status",
  "sim_inserted": true,
  "signal_strength": 25,
  "connected": true
}
```

## Troubleshooting

### No SIM detected
- Check SIM card is inserted correctly
- Check SIM card is not locked (PIN/PUK)
- Try: `AT+CPIN?` command manually

### No signal
- Check antenna is connected
- Move to area with better coverage
- Check: `AT+CSQ` command (should return 0-31, not 99)

### Module not found
- Check USB connection
- Check permissions: `sudo chmod 666 /dev/ttyUSB0`
- Try different port: `/dev/ttyUSB1`, `/dev/ttyAMA0`

### SMS not sending
- Check phone number format (should start with +63 or 0)
- Check SIM has load/credit
- Check signal strength (should be > 0)
- Check logs for error messages

## Phone Number Format

The system automatically normalizes phone numbers:
- `09171234567` → `+639171234567`
- `9171234567` → `09171234567` → `+639171234567`
- `+639171234567` → `+639171234567` (unchanged)

## Demo Mode

To test without SIMCOM module, set:
```python
sms_controller = SMSController(demo_mode=True)
```

This will log SMS messages without actually sending them.

