# 📝 How to Update Pi Connection URL in Database

## Step-by-Step Instructions

### Step 1: Open Supabase Dashboard

1. Go to **https://supabase.com/dashboard**
2. Log in with your account
3. Select your **PillPal project**

---

### Step 2: Open SQL Editor

1. In the left sidebar, click **"SQL Editor"** (it has a `</>` icon)
2. You'll see a text area where you can write SQL queries

---

### Step 3: Run the Update Query

1. **Copy this SQL query** (replace `YOUR_TUNNEL_URL_HERE` with your actual tunnel URL):

```sql
UPDATE pi_connection_config
SET websocket_url = 'wss://YOUR_TUNNEL_URL_HERE',
    updated_at = NOW()
WHERE id = 1;
```

2. **Paste it into the SQL Editor**

3. **Replace `YOUR_TUNNEL_URL_HERE`** with your actual tunnel URL:
   - Example: If your Cloudflare tunnel shows `https://abc123-def456.trycloudflare.com`
   - Change it to: `wss://abc123-def456.trycloudflare.com` (change `https` to `wss`)
   - Final query should look like:
   ```sql
   UPDATE pi_connection_config
   SET websocket_url = 'wss://abc123-def456.trycloudflare.com',
       updated_at = NOW()
   WHERE id = 1;
   ```

4. **Click the "Run" button** (or press `Ctrl+Enter` / `Cmd+Enter`)

---

### Step 4: Verify It Worked

1. Run this query to check:
```sql
SELECT * FROM pi_connection_config;
```

2. You should see your new `websocket_url` value

---

## ⚠️ Important Notes

- **Use `wss://` not `ws://`** for secure WebSocket connections
- **Change `https://` to `wss://`** from the tunnel URL
- **Keep the quotes** around the URL
- **Make sure the tunnel is running** on your Pi before updating

---

## 🆘 If You Get an Error

### Error: "relation pi_connection_config does not exist"
The table doesn't exist yet. Run this first:
```sql
CREATE TABLE IF NOT EXISTS pi_connection_config (
    id SERIAL PRIMARY KEY,
    websocket_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Then insert a record
INSERT INTO pi_connection_config (websocket_url)
VALUES ('wss://YOUR_TUNNEL_URL_HERE')
ON CONFLICT (id) DO UPDATE
SET websocket_url = EXCLUDED.websocket_url,
    updated_at = NOW();
```

### Error: "no rows to update"
The table exists but has no record with id=1. Use this instead:
```sql
INSERT INTO pi_connection_config (websocket_url, updated_at)
VALUES ('wss://YOUR_TUNNEL_URL_HERE', NOW())
ON CONFLICT (id) DO UPDATE
SET websocket_url = EXCLUDED.websocket_url,
    updated_at = NOW();
```

---

## 📸 Visual Guide

1. **Supabase Dashboard** → Your Project
2. **Left Sidebar** → Click "SQL Editor" (icon: `</>`)
3. **SQL Editor** → Paste your query
4. **Click "Run"** button (or press Ctrl+Enter)
5. **Check results** at the bottom

---

## ✅ After Updating

1. Refresh your web app
2. Click "Reconnect" button
3. Should show "Connected to Raspberry Pi" (green) ✅



