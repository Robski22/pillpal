# Quick Setup: Enable Direct File Editing

## 🎯 Goal
Let me edit files directly without you having to manually apply changes.

---

## ⚡ Quick Steps (5 minutes)

### Step 1: Enable Auto-Save in VS Code
1. Press `Ctrl+,` (Settings)
2. Type: `auto save`
3. Set **"Files: Auto Save"** to **"afterDelay"**
4. Set delay to **1000ms** (1 second)

**OR** Press `Ctrl+Shift+P` → Type: `auto save` → Select **"afterDelay"**

### Step 2: Check File Permissions
1. Right-click on `app/page.tsx`
2. Click **Properties**
3. Make sure **"Read-only"** is **UNCHECKED**
4. Click **OK**

### Step 3: Trust Workspace (if prompted)
- If VS Code shows "Restricted Mode" → Click **"Trust"**

### Step 4: Start Dev Server
```bash
# In VS Code Terminal (Ctrl+`)
cd PillApp\pillpal
npm run dev
```

### Step 5: Open Browser
- Go to: `http://localhost:3000`
- Keep it open

---

## ✅ Test It Works

**Tell me:** "Change the title in page.tsx to 'Test Title'"

**I should:**
1. Edit the file directly
2. Save automatically (with auto-save)
3. Browser refreshes
4. You see "Test Title" ✅

---

## 🔧 For Servo System Files

### Local Files (Web App):
- ✅ `app/page.tsx` - Already accessible
- ✅ `src/lib/pi-websocket.ts` - Already accessible
- Just need auto-save enabled (Step 1)

### Raspberry Pi Files (Server):
If you want me to edit Pi files directly:

1. **Connect Remote SSH:**
   - `Ctrl+Shift+P` → "Remote-SSH: Connect to Host"
   - Connect to your Pi

2. **Fix Pi Permissions:**
   ```bash
   # On Pi terminal (via Remote SSH):
   chmod 644 /home/pi/pillpal/pi_websocket_server.py
   ```

3. **Enable Auto-Save:**
   - Same as Step 1 (works in Remote SSH too)

---

## 🚨 Common Issues

### "File is read-only"
**Fix:**
```powershell
# PowerShell in project folder:
Get-ChildItem -Recurse | ForEach-Object { $_.IsReadOnly = $false }
```

### "Cannot save file"
- Check if file is open elsewhere
- Check disk space
- Restart VS Code

### Changes not appearing
- Make sure dev server is running
- Hard refresh browser: `Ctrl+Shift+R`

---

## 📋 Checklist

Before asking me to edit files:

- [ ] Auto-save enabled in VS Code
- [ ] Files not read-only
- [ ] Dev server running (`npm run dev`)
- [ ] Browser open (`http://localhost:3000`)
- [ ] Workspace trusted (if prompted)

---

## 🎉 After Setup

**You say:** "Change the servo reset behavior"

**I do:**
1. Edit `pi_websocket_server.py` directly
2. Save automatically
3. Changes are live!

**You:**
- Just refresh browser (or it auto-refreshes)
- See changes immediately ✅

**No manual copying, no manual editing needed!**

---

## 💡 Pro Tip

Keep VS Code terminal open showing:
```
▲ Next.js running on http://localhost:3000
```

This confirms:
- Dev server is running
- Files are being watched
- Changes will appear automatically

---

## ✅ Ready?

Once you complete these steps, I can edit any file directly:
- ✅ Web app files (`app/page.tsx`, etc.)
- ✅ Pi server files (if Remote SSH connected)
- ✅ Config files
- ✅ Everything!

Just tell me what to change, and I'll do it! 🚀




