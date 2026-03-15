# fix_aiChatFileIntegration_docguard.ps1
# Adds a guard to skip documentation/diagram blocks from being written as files

$f = (Get-ChildItem -Path "src" -Recurse -Filter "aiChatFileIntegration.ts" | Select-Object -First 1).FullName
$la = Get-Content $f -Encoding UTF8
Write-Host "Lines: $($la.Length)" -ForegroundColor Cyan

# Find line 253: console.log(`Found ${codeBlocks.length} code block(s)`);
$targetIdx = -1
for ($i = 248; $i -le 260; $i++) {
    if ($la[$i] -match "Found.*code block") {
        $targetIdx = $i
        Write-Host "Found target at line $($i+1): $($la[$i].Trim())" -ForegroundColor Yellow
        break
    }
}

if ($targetIdx -lt 0) { Write-Host "ERROR: target not found" -ForegroundColor Red; exit }
if ($la[$targetIdx+1] -match "X02.*doc.*guard") { Write-Host "Already patched" -ForegroundColor Cyan; exit }

$guard = @'
    // X02: Skip documentation/diagram blocks — not real code to write to disk
    const isDocBlock = (content: string): boolean => {
      if (!content) return true;
      if (content.includes('\u251C\u2500\u2500') || content.includes('\u2514\u2500\u2500') || content.includes('\u2502')) return true; // file tree chars
      if (content.includes('Direct Imports:') || content.includes('Runtime Dependencies:')) return true; // dependency analysis
      if (content.includes('Dependency Analysis') || content.includes('Import Graph')) return true;
      const lines = content.split('\n').filter((l: string) => l.trim()).length;
      if (lines < 4 && content.length < 200) return true; // too short to be real code
      return false;
    };
    const realCodeBlocks = codeBlocks.filter((b: any) => !isDocBlock(b.content || b.code || String(b)));
    if (realCodeBlocks.length === 0) {
      console.log('\u26A0\uFE0F [X02 Doc Guard] All blocks are documentation/diagrams, skipping file creation');
      return;
    }
    // X02: end doc guard
'@

$before = $la[0..$targetIdx]
$after  = $la[($targetIdx+1)..($la.Length-1)]

# Also replace codeBlocks with realCodeBlocks in the lines that follow
$newLines = $before + $guard.Split("`n") + $after
# Replace subsequent uses of codeBlocks with realCodeBlocks (lines after guard, up to end of function)
for ($i = $targetIdx + 20; $i -le [Math]::Min($la.Length-1, $targetIdx+60); $i++) {
    if ($newLines[$i] -match "codeBlocks" -and $newLines[$i] -notmatch "extractCodeBlocks|codeBlocks\.length === 0|Found.*code block") {
        $newLines[$i] = $newLines[$i] -replace "codeBlocks", "realCodeBlocks"
        Write-Host "  Replaced codeBlocks->realCodeBlocks at new line $($i+1)" -ForegroundColor Green
    }
}

$newLines -join "`n" | Set-Content $f -NoNewline -Encoding UTF8
Write-Host "Saved: $((Get-Item $f).Length) bytes" -ForegroundColor Green

# Verify
$v = Get-Content $f -Encoding UTF8
for ($i = 0; $i -lt $v.Length; $i++) {
    if ($v[$i] -match "X02.*Doc Guard|X02.*doc.*guard") {
        Write-Host "Verified at line $($i+1): $($v[$i].Trim())" -ForegroundColor Cyan
    }
}