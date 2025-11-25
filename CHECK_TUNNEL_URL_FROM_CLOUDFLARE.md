# 🔍 How to Check Your Cloudflare Tunnel URL

## Method 1: Check on Raspberry Pi (Easiest)

If your tunnel is running on your Raspberry Pi, check it directly:

### If Tunnel is Running as a Service:

```bash
# Check the tunnel service logs
sudo journalctl -u cloudflared-quick-tunnel -n 50 | grep trycloudflare

# Or view all recent logs
sudo journalctl -u cloudflared-quick-tunnel -n 100

# Or follow logs in real-time
sudo journalctl -u cloudflared-quick-tunnel -f
```

Look for a line like:
```
https://kenny-spas-basically-fancy.trycloudflare.com
```

### If Tunnel is Running Manually:

If you started it with `cloudflared tunnel --url http://localhost:8765`, the URL is shown in the terminal output when it starts. Look for:

```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created!                                                      |
+--------------------------------------------------------------------------------------------+
|  Visit the following URL to access your tunnel:                                            |
+  https://kenny-spas-basically-fancy.trycloudflare.com                                     |
+--------------------------------------------------------------------------------------------+
```

### Check Running Processes:

```bash
# See if cloudflared is running
ps aux | grep cloudflared

# Check what URL it's using
sudo journalctl -u cloudflared* -n 100 | grep -i "trycloudflare\|tunnel\|url"
```

---

## Method 2: Check Cloudflare Dashboard (For Named Tunnels Only)

**Note:** This only works if you set up a **named tunnel** (permanent tunnel). If you're using a **quick tunnel** (temporary), you can't see it in the dashboard.

### Steps:

1. **Go to Cloudflare Dashboard:**
   - Visit: https://one.dash.cloudflare.com/
   - Log in to your account

2. **Navigate to Tunnels:**
   - Click **"Networks"** in the left sidebar
   - Click **"Tunnels"**

3. **View Your Tunnel:**
   - You'll see a list of your tunnels
   - Click on your tunnel name (e.g., `pillpal-tunnel`)
   - You'll see the tunnel status, configuration, and endpoints

4. **Check Public Hostname:**
   - In the tunnel details, look for **"Public Hostname"** or **"Ingress"** section
   - This shows your public URL (e.g., `pillpal.yourdomain.com`)

---

## Method 3: Check from Your Pi Scripts

If you have the auto-update script running:

```bash
# Check the update script log
cat ~/scripts/update_tunnel_url.log

# Or check the service logs
sudo journalctl -u update-tunnel-url -n 50
```

This will show what URL was found and sent to the database.

---

## Method 4: Test the Tunnel URL Directly

Once you have the URL, test if it's working:

```bash
# Test WebSocket connection (replace with your actual URL)
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  https://kenny-spas-basically-fancy.trycloudflare.com
```

Or test from your browser console:

```javascript
// Test WebSocket connection
const ws = new WebSocket('wss://kenny-spas-basically-fancy.trycloudflare.com');
ws.onopen = () => console.log('✅ Connected!');
ws.onerror = (e) => console.error('❌ Error:', e);
```

---

## Method 5: Check Database (What Your App is Using)

Check what URL your app is currently using:

```sql
SELECT websocket_url, updated_at FROM pi_connection_config;
```

This shows what URL is stored in your database (which your app fetches).

---

## Quick Tunnel vs Named Tunnel

### Quick Tunnel (Temporary):
- URL changes every time you restart: `https://xxxxx-xxxxx.trycloudflare.com`
- **Cannot** be viewed in Cloudflare dashboard
- Must check on Raspberry Pi (logs or terminal output)
- Free, but URL changes

### Named Tunnel (Permanent):
- Permanent URL: `https://pillpal.yourdomain.com`
- **Can** be viewed in Cloudflare dashboard
- Requires your own domain
- URL never changes

---

## Most Common Method (For Quick Tunnels):

Since you're using a quick tunnel (`kenny-spas-basically-fancy.trycloudflare.com`), use **Method 1**:

```bash
# SSH into your Pi
ssh justin@your-pi-ip

# Check tunnel logs
sudo journalctl -u cloudflared-quick-tunnel -n 50 | grep trycloudflare
```

This will show you the current tunnel URL.

---

## If Tunnel is Not Running:

If you can't find the URL, the tunnel might not be running:

```bash
# Check if tunnel service is running
sudo systemctl status cloudflared-quick-tunnel

# If not running, start it
sudo systemctl start cloudflared-quick-tunnel

# Then check logs for the URL
sudo journalctl -u cloudflared-quick-tunnel -n 50
```


