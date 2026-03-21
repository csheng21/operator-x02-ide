# Fix 1 CORRECTED - restore backup first, then inject into function body only
# The previous script hit "ReadFile" inside an interface declaration

$file = "C:\Users\hi\PycharmProjects\SVN_25\dev\App_Chatgpt\App_AI\src\ide\ideScriptBridge.ts"
$backup = "$file.fix1.bak"

# Restore clean backup first
if (Test-Path $backup) {
    Copy-Item $backup $file -Force
    Write-Host "Restored from backup" -ForegroundColor Green
} else {
    Write-Host "No backup found - working on current file" -ForegroundColor Yellow
}

$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
Write-Host "Loaded $([math]::Round($content.Length/1024))KB" -ForegroundColor Cyan

if ($content.Contains("BYPASS_MUTEX_READ")) {
    Write-Host "Already patched" -ForegroundColor Yellow
    exit 0
}

# Write bypass code to temp file to avoid PS parsing issues
$tempCode = "$env:TEMP\fix1_bypass.txt"
$lines = @(
    "",
    "      // BYPASS_MUTEX_READ - skip surgical bridge lock for read operations",
    "      if (args && (args.file_path || args.filePath)) {",
    "        try {",
    "          const fp = args.file_path || args.filePath;",
    "          const fs = (window as any).fileSystem;",
    "          if (fp && fs && typeof fs.readFile === 'function') {",
    "            const txt = await fs.readFile(fp);",
    "            return { success: true, content: txt, source: 'direct_bypass' };",
    "          }",
    "        } catch (_bypassErr) {",
    "          // fall through to normal path",
    "        }",
    "      }"
)
[System.IO.File]::WriteAllLines($tempCode, $lines, [System.Text.Encoding]::UTF8)
$bypass = [System.IO.File]::ReadAllText($tempCode, [System.Text.Encoding]::UTF8)
Remove-Item $tempCode -Force -ErrorAction SilentlyContinue

# ================================================================
# STRATEGY: find function/case blocks that handle 'readFile' command
# We need to match ONLY inside async function bodies, not interfaces
# Key: look for case 'readFile' or a function named executeReadFile etc
# that is INSIDE an async function (has 'await' nearby)
# ================================================================

Write-Host "Searching for correct injection point..." -ForegroundColor Cyan

# Show all lines containing readFile/ReadFile for diagnosis
$lines2 = $content -split "`n"
for ($i = 0; $i -lt $lines2.Count; $i++) {
    if ($lines2[$i] -match "readFile|ReadFile|read_file") {
        Write-Host "  Line $($i+1): $($lines2[$i].Trim())" -ForegroundColor Gray
    }
}

# ================================================================
# Try to find the executeScript / handleCommand function
# that contains the readFile case/branch
# ================================================================
$inserted = $false

# Pattern 1: switch case 'readFile':
$casePattern = "case 'readFile':"
$idx = $content.IndexOf($casePattern)
if ($idx -gt 0) {
    # Check it's inside a function (not interface) - verify there's 'async' within 500 chars before
    $before = $content.Substring([Math]::Max(0, $idx - 500), [Math]::Min(500, $idx))
    if ($before -match "async|function|=>") {
        $braceIdx = $content.IndexOf("{", $idx)
        if ($braceIdx -gt 0 -and ($braceIdx - $idx) -lt 50) {
            $content = $content.Substring(0, $braceIdx + 1) + $bypass + $content.Substring($braceIdx + 1)
            Write-Host "Injected after: $casePattern" -ForegroundColor Green
            $inserted = $true
        }
    }
}

# Pattern 2: case "readFile":
if (-not $inserted) {
    $casePattern2 = 'case "readFile":'
    $idx2 = $content.IndexOf($casePattern2)
    if ($idx2 -gt 0) {
        $braceIdx2 = $content.IndexOf("{", $idx2)
        if ($braceIdx2 -gt 0 -and ($braceIdx2 - $idx2) -lt 50) {
            $content = $content.Substring(0, $braceIdx2 + 1) + $bypass + $content.Substring($braceIdx2 + 1)
            Write-Host "Injected after: $casePattern2" -ForegroundColor Green
            $inserted = $true
        }
    }
}

# Pattern 3: look for the async function that processes script commands
# and has readFile in it - inject at the top
if (-not $inserted) {
    $funcPatterns = @(
        "async function executeIdeScript",
        "async function processScript",
        "async function runScript",
        "executeScript = async",
        "processCommand = async",
        "handleCommand = async",
        "const executeScript = async",
        "const handleScript = async"
    )
    foreach ($fp in $funcPatterns) {
        $idx3 = $content.IndexOf($fp)
        if ($idx3 -gt 0) {
            # Find the opening brace of this function
            $braceIdx3 = $content.IndexOf("{", $idx3)
            if ($braceIdx3 -gt 0 -and ($braceIdx3 - $idx3) -lt 200) {
                # Add fast-path for readFile at top of function
                $fastPath = @"

      // BYPASS_MUTEX_READ - fast path for readFile
      if ((command === 'readFile' || command === 'ide_read_file') && args) {
        try {
          const fp = args.file_path || args.filePath || args.path || '';
          const fs = (window as any).fileSystem;
          if (fp && fs && typeof fs.readFile === 'function') {
            const txt = await fs.readFile(fp);
            return { success: true, content: txt, source: 'bypass' };
          }
        } catch (_e) {}
      }
"@
                $content = $content.Substring(0, $braceIdx3 + 1) + $fastPath + $content.Substring($braceIdx3 + 1)
                Write-Host "Injected fast path at: $fp" -ForegroundColor Green
                $inserted = $true
                break
            }
        }
    }
}

# Pattern 4: find any async function containing 'readFile' string and inject there
if (-not $inserted) {
    Write-Host "Trying pattern 4 - async function scan..." -ForegroundColor Yellow
    $asyncMatches = [regex]::Matches($content, "async\s+function\s+\w+|const\s+\w+\s*=\s*async\s*\(")
    foreach ($am in $asyncMatches) {
        $fnStart = $am.Index
        $fnBrace = $content.IndexOf("{", $fnStart)
        if ($fnBrace -lt 0 -or ($fnBrace - $fnStart) -gt 200) { continue }
        # Find end of this function
        $depth = 0
        $fnEnd = -1
        for ($i = $fnBrace; $i -lt [Math]::Min($fnBrace + 5000, $content.Length); $i++) {
            if ($content[$i] -eq '{') { $depth++ }
            elseif ($content[$i] -eq '}') {
                $depth--
                if ($depth -eq 0) { $fnEnd = $i; break }
            }
        }
        if ($fnEnd -gt 0) {
            $fnBody = $content.Substring($fnBrace, $fnEnd - $fnBrace)
            if ($fnBody -match "readFile|read_file" -and $fnBody -match "command|script|execute") {
                $content = $content.Substring(0, $fnBrace + 1) + $bypass + $content.Substring($fnBrace + 1)
                $fnName = $am.Value.Substring(0, [Math]::Min(50, $am.Value.Length))
                Write-Host "Injected into async function: $fnName" -ForegroundColor Green
                $inserted = $true
                break
            }
        }
    }
}

if (-not $inserted) {
    Write-Host "Could not find safe injection point." -ForegroundColor Red
    Write-Host "Fix 1 is nice-to-have but not critical." -ForegroundColor Yellow
    Write-Host "Fix 2 and Fix 3 are already applied and give major speedup." -ForegroundColor Yellow
    exit 0
}

[System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
Write-Host "File saved" -ForegroundColor Green

$v = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
if ($v.Contains("BYPASS_MUTEX_READ")) {
    Write-Host "PASS: BYPASS_MUTEX_READ present" -ForegroundColor Green
    Write-Host "Done. Rebuild: npm run tauri dev" -ForegroundColor Green
} else {
    Write-Host "FAIL: verify failed" -ForegroundColor Red
}
