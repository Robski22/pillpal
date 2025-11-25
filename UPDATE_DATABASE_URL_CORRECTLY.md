# 🔄 Update Database URL Correctly

## Current Issue
The UPDATE query returned "Success. No rows returned" - this means no rows were updated. This usually happens when:
1. There's no WHERE clause and the table is empty
2. The WHERE clause doesn't match any rows
3. There's a permission issue

## Step 1: Check Current Data

First, check what's in the table:

```sql
SELECT * FROM pi_connection_config;
```

This will show you:
- The `id` column (needed for WHERE clause)
- Current `websocket_url`
- `updated_at` timestamp

## Step 2: Update with WHERE Clause

If there's a row with `id = 1`:

```sql
UPDATE pi_connection_config 
SET websocket_url = 'wss://kenny-spas-basically-fancy.trycloudflare.com',
    updated_at = NOW()
WHERE id = 1;
```

If you don't know the ID, update by checking if URL exists:

```sql
UPDATE pi_connection_config 
SET websocket_url = 'wss://kenny-spas-basically-fancy.trycloudflare.com',
    updated_at = NOW()
WHERE websocket_url IS NOT NULL;
```

Or update ALL rows (if you only have one):

```sql
UPDATE pi_connection_config 
SET websocket_url = 'wss://kenny-spas-basically-fancy.trycloudflare.com',
    updated_at = NOW();
```

## Step 3: Verify the Update

```sql
SELECT websocket_url, updated_at FROM pi_connection_config;
```

Should show:
- `websocket_url`: `wss://kenny-spas-basically-fancy.trycloudflare.com` (NO trailing slash)
- `updated_at`: Current timestamp

## Step 4: How the Web App Gets the URL

The web app automatically fetches the URL from the database via the `/api/pi-url` route. 

**No need to update the web app manually!** Just:
1. Update the database (as shown above)
2. Refresh your web app page (F5 or Ctrl+R)
3. The app will automatically fetch the new URL from the database

## Important Notes

- **Use `wss://` not `https://`** (WebSocket Secure)
- **NO trailing slash** - the URL should be `wss://kenny-spas-basically-fancy.trycloudflare.com` not `wss://kenny-spas-basically-fancy.trycloudflare.com/`
- The app normalizes the URL automatically, but it's better to store it correctly in the database

## If Table is Empty

If the SELECT returns no rows, you need to INSERT instead:

```sql
INSERT INTO pi_connection_config (websocket_url, updated_at)
VALUES ('wss://kenny-spas-basically-fancy.trycloudflare.com', NOW());
```


