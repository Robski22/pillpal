# Fix File Permissions - VS Code Method

## Step 2 Alternative: Check File Permissions in VS Code

Since VS Code doesn't have a "Properties" option, here's how to check/fix permissions:

---

## ✅ Method 1: Check in Windows File Explorer

1. **Open Windows File Explorer** (not VS Code)
2. Navigate to: `C:\Users\Feitan\PillApp\pillpal\app\`
3. **Right-click** on `page.tsx`
4. Click **"Properties"**
5. At the bottom, check **"Read-only"** - make sure it's **UNCHECKED**
6. Click **OK**

---

## ✅ Method 2: Fix All Files at Once (PowerShell)

1. **Open PowerShell** (not VS Code terminal)
   - Press `Win + X` → Select "Windows PowerShell" or "Terminal"

2. **Navigate to project:**
   ```powershell
   cd C:\Users\Feitan\PillApp\pillpal
   ```

3. **Remove read-only from all files:**
   ```powershell
   Get-ChildItem -Recurse | ForEach-Object { $_.IsReadOnly = $false }
   ```

4. **Press Enter** - This removes read-only from all files in the project

---

## ✅ Method 3: Check in VS Code (Visual Check)

1. In VS Code, look at the file tab
2. If you see a **lock icon** 🔒 or **"Read-only"** text, the file is read-only
3. If you see a **white dot** (unsaved changes), file is writable ✅

---

## ✅ Method 4: Test by Editing

**Quick test:**
1. Open `app/page.tsx` in VS Code
2. Make a small change (add a space, then delete it)
3. Try to save (`Ctrl+S`)
4. **If it saves** → File is writable ✅
5. **If error** → File is read-only ❌

---

## 🔧 If File is Read-Only

### Option A: Fix Single File
1. Open **Windows File Explorer**
2. Go to: `C:\Users\Feitan\PillApp\pillpal\app\`
3. Right-click `page.tsx` → **Properties**
4. Uncheck **"Read-only"**
5. Click **OK**

### Option B: Fix Entire Folder
1. Open **Windows File Explorer**
2. Go to: `C:\Users\Feitan\PillApp\pillpal\`
3. Right-click the **`pillpal` folder** → **Properties**
4. Uncheck **"Read-only"**
5. Click **"Apply to all subfolders and files"**
6. Click **OK**

### Option C: PowerShell (Fastest)
```powershell
cd C:\Users\Feitan\PillApp\pillpal
Get-ChildItem -Recurse | ForEach-Object { $_.IsReadOnly = $false }
```

---

## ✅ Quick Test

After fixing permissions:

1. **Open** `app/page.tsx` in VS Code
2. **Make a change** (add a comment: `// test`)
3. **Save** (`Ctrl+S`)
4. **If it saves without error** → ✅ Permissions fixed!

---

## 📋 Updated Step 2

**Instead of "Properties" in VS Code:**

1. **Open Windows File Explorer** (separate window)
2. Navigate to your project folder
3. Right-click file → Properties
4. Uncheck "Read-only"
5. Or use PowerShell method (faster for all files)

---

## 🎯 Summary

**VS Code doesn't have Properties menu** - that's a Windows File Explorer feature.

**To fix permissions:**
- Use Windows File Explorer (right-click → Properties)
- Or use PowerShell command (removes read-only from all files)

**Then:**
- Files will be writable
- I can edit them directly
- Auto-save will work ✅




