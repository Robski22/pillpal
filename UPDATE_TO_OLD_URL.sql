-- Update to use the old tunnel URL
-- wss://location-oxide-surround-atlas.trycloudflare.com

-- Update all records
UPDATE pi_connection_config
SET websocket_url = 'wss://location-oxide-surround-atlas.trycloudflare.com',
    updated_at = NOW();

-- Verify the update
SELECT * FROM pi_connection_config;




