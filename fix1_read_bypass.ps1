# ================================================================
# FIX 1: ide_read_file bypass surgical mutex (60s -> instant)
# Target: src/ide/ideScriptBridge.ts
# ================================================================

$file = "C:\Users\hi\PycharmProjects\SVN_25\dev\App_Chatgpt\App_AI\src\ide\ideScriptBridge.ts"

if (-not (Test-Path $file)) {
    Write-Host "[ERROR] File not found: $file" -ForegroundColor Red
    Write-Host "Searching for ideScriptBridge.ts..." -ForegroundColor Yellow
    $found = Get-ChildItem -Path "C:\Users\hi\PycharmProjects\SVN_25\dev\App_Chatgpt\App_AI\src" -Recurse -Filter "ideScriptBridge.ts" 2>$null
    if ($found) { Write-Host "Found at: $($found.FullName)" -ForegroundColor Green }
    exit 1
}

$backup = "$file.fix1.bak"
Copy-Item $file $backup -Force
Write-Host "[OK] Backup: $backup" -ForegroundColor Green

$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
Write-Host "[OK] Loaded: $([math]::Round($content.Length/1024))KB" -ForegroundColor Cyan

if ($content -match "BYPASS_MUTEX_READ") {
    Write-Host "[SKIP] Already patched." -ForegroundColor Yellow
    exit 0
}

# ================================================================
# The fix: find the readFile case and inject a direct Tauri bypass
# that skips the surgical bridge queue entirely
# ================================================================

$anchors = @(
    "case 'readFile':",
    "'readFile':",
    "readFile:",
    "ide_read_file",
    "readfile",
    "ReadFile"
)

$found = $false
foreach ($anchor in $anchors) {
    $m = [regex]::Match($content, [regex]::Escape($anchor))
    if ($m.Success) {
        Write-Host "[OK] Found anchor: '$anchor' at index $($m.Index)" -ForegroundColor Green

        # Find the next opening brace after anchor to insert bypass at top of case body
        $braceIdx = $content.IndexOf("{", $m.Index)
        if ($braceIdx -gt 0 -and ($braceIdx - $m.Index) -lt 200) {
            $bypass = @'

      // BYPASS_MUTEX_READ — skip surgical bridge lock for read operations
      if (args && (args.file_path || args.filePath)) {
        try {
          const fp = args.file_path || args.filePath;
          const fs = (window as any).fileSystem;
          if (fs && typeof fs.readFile === 'function') {
            const txt = await fs.readFile(fp);
            return { success: true, content: txt, source: 'direct_bypass' };
          }
        } catch (bypassErr: any) {
          // fall through to normal path
        }
      }
'@
            $content = $content.Substring(0, $braceIdx + 1) + $bypass + $content.Substring($braceIdx + 1)
            $found = $true
            break
        }
    }
}

if (-not $found) {
    Write-Host "[WARN] readFile anchor not found. Trying function-level injection..." -ForegroundColor Yellow

    # Alternative: wrap the entire executeScript function to add a fast-path for readFile
    $funcAnchors = @("async function executeIdeScript", "executeIdeScript = async", "export async function executeScript", "async executeScript")
    foreach ($fa in $funcAnchors) {
        $m = [regex]::Match($content, $fa)
        if ($m.Success) {
            $braceIdx = $content.IndexOf("{", $m.Index)
            if ($braceIdx -gt 0) {
                $fastPath = @'

  // BYPASS_MUTEX_READ — fast path for readFile, skips bridge queue
  if (command === 'readFile' || command === 'ide_read_file') {
    try {
      const fp = args?.file_path || args?.filePath || args?.path || '';
      const fs = (window as any).fileSystem;
      if (fp && fs && typeof fs.readFile === 'function') {
        const txt = await fs.readFile(fp);
        return { success: true, content: txt, source: 'direct_bypass' };
      }
    } catch (_) { /* fall through */ }
  }
'@
                $content = $content.Substring(0, $braceIdx + 1) + $fastPath + $content.Substring($braceIdx + 1)
                Write-Host "[OK] Function-level fast path injected at: $fa" -ForegroundColor Green
                $found = $true
                break
            }
        }
    }
}

if (-not $found) {
    Write-Host "[FAIL] Could not find injection point in ideScriptBridge.ts" -ForegroundColor Red
    Write-Host "Manual fix: add direct fileSystem.readFile bypass before the bridge queue for readFile commands" -ForegroundColor Yellow
    exit 1
}

[System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
Write-Host "[OK] File saved." -ForegroundColor Green

# Verify
$v = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
if ($v.Contains("BYPASS_MUTEX_READ")) {
    Write-Host "[PASS] BYPASS_MUTEX_READ injected." -ForegroundColor Green
    Write-Host "[DONE] Fix 1 complete. ide_read_file now bypasses surgical lock." -ForegroundColor Green
} else {
    Write-Host "[FAIL] Verify failed." -ForegroundColor Red
}
