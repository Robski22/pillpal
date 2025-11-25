-- Update to use permanent tunnel URL
-- wss://departure-fin-wallace-steady.trycloudflare.com

UPDATE pi_connection_config
SET websocket_url = 'wss://departure-fin-wallace-steady.trycloudflare.com',
    updated_at = NOW();

-- Verify the update
SELECT * FROM pi_connection_config;



