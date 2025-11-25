-- Update the database with the current tunnel URL
UPDATE pi_connection_config
SET websocket_url = 'wss://defensive-southern-virginia-recommend.trycloudflare.com',
    updated_at = NOW();

-- Verify the update
SELECT websocket_url, updated_at FROM pi_connection_config;



