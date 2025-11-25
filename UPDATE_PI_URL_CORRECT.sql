-- Update pi_connection_config with correct UUID handling
-- The id column is UUID type, not integer

-- First, check what records exist
SELECT * FROM pi_connection_config;

-- Option 1: Update all records (if you only have one record)
UPDATE pi_connection_config
SET websocket_url = 'wss://references-thin-organisms-indirect.trycloudflare.com',
    updated_at = NOW();

-- Option 2: Update by specific UUID (replace with actual UUID from SELECT above)
-- UPDATE pi_connection_config
-- SET websocket_url = 'wss://references-thin-organisms-indirect.trycloudflare.com',
--     updated_at = NOW()
-- WHERE id = 'YOUR-UUID-HERE';

-- Option 3: Insert if no record exists, update if it does
INSERT INTO pi_connection_config (websocket_url, updated_at)
VALUES ('wss://references-thin-organisms-indirect.trycloudflare.com', NOW())
ON CONFLICT (id) DO UPDATE
SET websocket_url = EXCLUDED.websocket_url,
    updated_at = EXCLUDED.updated_at;

-- Verify the update
SELECT * FROM pi_connection_config;



