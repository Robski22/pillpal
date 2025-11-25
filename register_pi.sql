-- Register the Pi (replace with actual values)
-- Get the Pi unique ID from: /home/justin/pillpal/pi_unique_id.txt on your Raspberry Pi
-- Or check the server logs: journalctl -u pillpal -n 50 | grep "Pi unique ID"

INSERT INTO pi_registration (pi_unique_id, registered_email)
VALUES ('YOUR_PI_UNIQUE_ID_HERE', 'your-email@gmail.com')
ON CONFLICT (pi_unique_id) DO UPDATE 
SET registered_email = EXCLUDED.registered_email, last_seen = NOW();


