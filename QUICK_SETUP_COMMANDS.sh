#!/bin/bash
# Quick setup commands to run on your Pi
# Copy and paste these commands one by one

echo "=== Step 1: Configure Passwordless Sudo ==="
echo "Run: sudo visudo"
echo "Add this line at the end:"
echo "justin ALL=(ALL) NOPASSWD: /usr/bin/journalctl"
echo ""
echo "Press Enter when done..."
read

echo "=== Step 2: Update Script ==="
echo "The script needs to be updated with the fixed version"
echo "Edit: nano ~/scripts/update_tunnel_url.sh"
echo "Or copy update_tunnel_url_fixed.sh to ~/scripts/update_tunnel_url.sh"
echo ""
echo "Press Enter when done..."
read

echo "=== Step 3: Make Script Executable ==="
chmod +x ~/scripts/update_tunnel_url.sh
echo "✅ Script is now executable"

echo "=== Step 4: Verify Service Configuration ==="
echo "Check: cat /etc/systemd/system/update-tunnel-url.service"
echo ""
cat /etc/systemd/system/update-tunnel-url.service
echo ""
echo "Press Enter to continue..."
read

echo "=== Step 5: Reload and Enable Service ==="
sudo systemctl daemon-reload
sudo systemctl enable update-tunnel-url.service
echo "✅ Service enabled"

echo "=== Step 6: Test Script ==="
echo "Testing script manually..."
bash -x ~/scripts/update_tunnel_url.sh

echo ""
echo "=== Step 7: Test Service ==="
echo "Restarting service..."
sudo systemctl restart update-tunnel-url.service
echo "Checking logs..."
sudo journalctl -u update-tunnel-url.service -n 20

echo ""
echo "=== Setup Complete! ==="
echo "Check Supabase to verify URL was updated"
echo "Then test your web app - it should auto-connect!"


