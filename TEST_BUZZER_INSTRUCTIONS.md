# Test Buzzer on GPIO6 - Instructions

## Step 1: Copy the test script to Raspberry Pi

From your Windows command prompt (PowerShell or CMD), run:

```bash
scp C:\Users\Feitan\PillApp\pillpal\test_buzzer.py justin@192.168.100.220:/home/justin/pillpal/test_buzzer.py
```

Enter the password when prompted.

## Step 2: SSH into Raspberry Pi

```bash
ssh justin@192.168.100.220
```

Enter the password when prompted.

## Step 3: Navigate to the pillpal directory

```bash
cd /home/justin/pillpal
```

## Step 4: Make the script executable (optional)

```bash
chmod +x test_buzzer.py
```

## Step 5: Run the test script

```bash
python3 test_buzzer.py
```

Or if you need sudo (some GPIO operations require it):

```bash
sudo python3 test_buzzer.py
```

## What the script does:

1. **Single beep** - 0.5 seconds
2. **Double beep** - Two quick beeps
3. **Triple beep** - Three quick beeps
4. **Long beep** - 1 second continuous
5. **Rapid beeps** - 10 very quick beeps

## Troubleshooting:

- **No sound**: Check wiring, buzzer might need a resistor, or it might be a passive buzzer that needs PWM
- **Permission error**: Try with `sudo`
- **GPIO already in use**: Make sure no other program is using GPIO6

## Alternative: Quick one-liner test

If you just want a quick test without the script:

```bash
python3 -c "import RPi.GPIO as GPIO; import time; GPIO.setmode(GPIO.BCM); GPIO.setup(6, GPIO.OUT); GPIO.output(6, GPIO.HIGH); time.sleep(0.5); GPIO.output(6, GPIO.LOW); GPIO.cleanup(); print('Beep!')"
```

## For Passive Buzzer (if active buzzer doesn't work)

If the buzzer is passive (needs PWM for different tones), use this version:

```bash
python3 -c "import RPi.GPIO as GPIO; import time; GPIO.setmode(GPIO.BCM); GPIO.setup(6, GPIO.OUT); pwm = GPIO.PWM(6, 1000); pwm.start(50); time.sleep(0.5); pwm.stop(); GPIO.cleanup(); print('Beep!')"
```

