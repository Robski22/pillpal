-- Update with current Cloudflare tunnel URL
-- Note: This is a temporary quick tunnel - URL will change on restart
-- For permanent solution, use ngrok (see SETUP_PERMANENT_TUNNEL_VERCEL.md)

UPDATE pi_connection_config
SET websocket_url = 'wss://bicycle-miscellaneous-bridal-portion.trycloudflare.com',
    updated_at = NOW();

-- Note: Change https:// to wss:// for WebSocket connection
-- If the URL format is different, adjust accordingly



