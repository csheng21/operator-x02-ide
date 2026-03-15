# fix_analysis_mode_final.ps1
# FINAL FIX: Move __analysisMode=false to AFTER addMessageToChat (with 500ms delay)
# Current wrong order: false reset BEFORE send -> observer fires with flag=false -> AutoApply runs
# Correct order: send -> false reset 500ms later -> observer fires with flag=true -> AutoApply skips

$f = Get-ChildItem -Path "src" -Recurse -Filter "projectFolderContextMenu.ts" | Sort-Object Length -Descending | Select-Object -First 1
$lines = Get-Content $f.FullName -Encoding UTF8
Write-Host "Loaded: $($lines.Length) lines" -ForegroundColor Cyan

# Show all __analysisMode lines
Write-Host "Current __analysisMode lines:" -ForegroundColor Yellow
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "__analysisMode") {
        Write-Host "  Line $($i+1): $($lines[$i].Trim())" -ForegroundColor Cyan
    }
}

# Step 1: Remove ALL existing __analysisMode lines (start clean)
$newLines = [System.Collections.Generic.List[string]]::new()
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "__analysisMode") {
        Write-Host "Removing line $($i+1): $($lines[$i].Trim())" -ForegroundColor Red
    } else {
        $newLines.Add($lines[$i])
    }
}
$lines = $newLines.ToArray()
Write-Host "After removal: $($lines.Length) lines" -ForegroundColor Yellow

# Step 2: Insert __analysisMode=true at function open (after line 710 = async function quickAnalyzeProject)
$funcIdx = -1
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "async function quickAnalyzeProject") { $funcIdx = $i; break }
}
# Find opening brace
$bodyIdx = -1
for ($i = $funcIdx; $i -le ($funcIdx+3); $i++) {
    if ($lines[$i] -match "\{") { $bodyIdx = $i; break }
}

$guardOn = '  (window as any).__analysisMode = true; // X02: block AutoApply during analysis'
$before = $lines[0..$bodyIdx]
$after  = $lines[($bodyIdx+1)..($lines.Length-1)]
$lines  = $before + $guardOn + $after
Write-Host "Inserted __analysisMode=true after line $($bodyIdx+1)" -ForegroundColor Green

# Step 3: Find addMessageToChat call inside quickAnalyzeProject (after line 710)
$addMsgIdx = -1
for ($i = $funcIdx; $i -lt [Math]::Min($funcIdx+500, $lines.Length); $i++) {
    if ($lines[$i] -match "addMessageToChat|addMsg\s*\(" -and $lines[$i] -notmatch "//") {
        $addMsgIdx = $i
        Write-Host "Found addMessageToChat at line $($i+1): $($lines[$i].Trim())" -ForegroundColor Yellow
        break
    }
}

if ($addMsgIdx -lt 0) {
    Write-Host "ERROR: addMessageToChat not found - showing lines 1100-1180:" -ForegroundColor Red
    for ($i = 1099; $i -le [Math]::Min(1179, $lines.Length-1); $i++) {
        Write-Host "  $($i+1): $($lines[$i])"
    }
    $lines -join "`n" | Set-Content $f.FullName -NoNewline -Encoding UTF8
    exit
}

# Step 4: Insert __analysisMode=false with 500ms delay AFTER addMessageToChat
$guardOff = '  setTimeout(() => { (window as any).__analysisMode = false; }, 500); // X02: delayed reset after send'
$before = $lines[0..$addMsgIdx]
$after  = $lines[($addMsgIdx+1)..($lines.Length-1)]
$lines  = $before + $guardOff + $after
Write-Host "Inserted delayed __analysisMode=false after addMessageToChat at line $($addMsgIdx+1)" -ForegroundColor Green

$lines -join "`n" | Set-Content $f.FullName -NoNewline -Encoding UTF8
Write-Host "SAVED: $((Get-Item $f.FullName).Length) bytes" -ForegroundColor Green

# Verify
Write-Host "" 
Write-Host "Final __analysisMode positions:" -ForegroundColor Cyan
$v = Get-Content $f.FullName -Encoding UTF8
for ($i = 0; $i -lt $v.Length; $i++) {
    if ($v[$i] -match "__analysisMode") {
        Write-Host "  Line $($i+1): $($v[$i].Trim())"
    }
}
