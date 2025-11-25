# 🔍 How to Get Tunnel URL from Service

## Method 1: View Service Logs (Recommended)

```bash
# View recent logs (shows tunnel URL)
sudo journalctl -u cloudflared-tunnel -n 100

# Or follow logs in real-time
sudo journalctl -u cloudflared-tunnel -f
```

Look for a line like:
```
Your quick Tunnel has been created! Visit it at: https://xxxxx.trycloudflare.com
```

---

## Method 2: Filter for URL

```bash
# Search logs for "tunnel" or "https"
sudo journalctl -u cloudflared-tunnel | grep -i "tunnel\|https\|trycloudflare"
```

---

## Method 3: View All Logs Since Service Started

```bash
# View all logs since service started
sudo journalctl -u cloudflared-tunnel --since "5 minutes ago"
```

---

## Method 4: Check Process Output

```bash
# Check what the process is doing
ps aux | grep cloudflared

# View full command
ps aux | grep cloudflared | grep -v grep
```

---

## Quick Command to Get URL

```bash
# This will show the tunnel URL
sudo journalctl -u cloudflared-tunnel -n 200 | grep -i "tunnel\|https" | head -5
```




