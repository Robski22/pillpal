-- Update database with the found tunnel URL
-- URL: wss://threatening-tires-premiere-bloomberg.trycloudflare.com

-- First, check if record exists
SELECT * FROM pi_connection_config;

-- Update existing record (if id = 1 exists)
UPDATE pi_connection_config
SET websocket_url = 'wss://threatening-tires-premiere-bloomberg.trycloudflare.com',
    updated_at = NOW()
WHERE id = 1;

-- If no record exists, insert one:
INSERT INTO pi_connection_config (websocket_url, updated_at)
VALUES ('wss://threatening-tires-premiere-bloomberg.trycloudflare.com', NOW())
ON CONFLICT (id) DO UPDATE
SET websocket_url = EXCLUDED.websocket_url,
    updated_at = NOW();

-- Verify it was updated
SELECT * FROM pi_connection_config;




