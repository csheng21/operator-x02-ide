# fix_surgicalBridge_contentguard.ps1
$f = (Get-ChildItem -Path "src" -Recurse -Filter "surgicalEditBridge.ts" | Sort-Object Length -Descending | Select-Object -First 1).FullName
$la = Get-Content $f -Encoding UTF8
Write-Host "Lines: $($la.Length)" -ForegroundColor Cyan

# Find line 390: return { success: false, message: 'Surgical mode not available' };
$targetIdx = -1
for ($i = 385; $i -le 400; $i++) {
    if ($la[$i] -match "Surgical mode not available") {
        $targetIdx = $i
        Write-Host "Found target at line $($i+1): $($la[$i].Trim())" -ForegroundColor Yellow
        break
    }
}

if ($targetIdx -lt 0) { Write-Host "ERROR: target not found" -ForegroundColor Red; exit }
if ($la[$targetIdx+2] -match "X02.*content.*sanity") { Write-Host "Already patched" -ForegroundColor Cyan; exit }

# The guard inserts after the closing brace of the canUseSurgicalMode check
# Find the closing } of that if block
$closeIdx = $targetIdx + 1
if ($la[$closeIdx] -match "^\s*\}") {
    Write-Host "Inserting guard after line $($closeIdx+1)" -ForegroundColor Yellow
} else {
    $closeIdx = $targetIdx
}

$guard = @'

  // X02: Content sanity check — reject patches that look like docs/marketing not code
  const getFileExt = (p: string) => p.split('.').pop()?.toLowerCase() || '';
  const isSuspiciousContent = (code: string, ext: string): boolean => {
    if (!code || code.length < 10) return false;
    const lines = code.split('\n');
    // Count lines that look like ASCII art / marketing (stars, boxes, centered text)
    const suspiciousLines = lines.filter((l: string) => {
      const t = l.trim();
      return t.startsWith('*') || t.startsWith('|') || t.startsWith('+') ||
             t.includes('OPERATOR X02') || t.includes('AI-Powered') ||
             t.includes('Coding is Art') || t.includes('www.operator');
    }).length;
    const ratio = suspiciousLines / Math.max(lines.length, 1);
    if (ratio > 0.4) return true; // more than 40% suspicious lines
    // For CSS files — must have at least one real CSS rule
    if (ext === 'css' || ext === 'scss') {
      const hasCSSRule = /[a-zA-Z#\.][^{]*\{[^}]*\}/.test(code);
      const onlyComments = lines.every((l: string) => l.trim().startsWith('*') || l.trim().startsWith('/*') || l.trim().startsWith('//') || l.trim() === '');
      if (onlyComments) return true;
      if (!hasCSSRule && code.length > 100) return true;
    }
    return false;
  };
  const currentFile = (window as any).tabManager?.getCurrentFile?.() || '';
  const fileExt = getFileExt(currentFile || filePath || '');
  if (isSuspiciousContent(newCode, fileExt)) {
    console.warn(`\u26A0\uFE0F [X02 ContentGuard] Rejected patch for ${currentFile} — content looks like documentation/marketing, not ${fileExt} code`);
    return { success: false, message: 'X02 ContentGuard: patch rejected — content does not look like valid code for this file type' };
  }
  // X02: end content sanity check

'@

$before = $la[0..$closeIdx]
$after  = $la[($closeIdx+1)..($la.Length-1)]
$newLines = $before + $guard.Split("`n") + $after
$newLines -join "`n" | Set-Content $f -NoNewline -Encoding UTF8
Write-Host "Saved: $((Get-Item $f).Length) bytes" -ForegroundColor Green

# Verify
$v = Get-Content $f -Encoding UTF8
for ($i = 0; $i -lt $v.Length; $i++) {
    if ($v[$i] -match "X02.*ContentGuard|X02.*content.*sanity") {
        Write-Host "Verified at line $($i+1): $($v[$i].Trim())" -ForegroundColor Cyan
    }
}