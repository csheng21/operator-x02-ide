# Option B - Grouped Professional context menu with animations
# Finds and replaces the Monaco editor right-click menu registration

$mainFile = "C:\Users\hi\PycharmProjects\SVN_25\dev\App_Chatgpt\App_AI\src\main.ts"
$c = [System.IO.File]::ReadAllText($mainFile, [System.Text.Encoding]::UTF8)

# Find the context menu CSS injection point
$cssAnchor = "context-menu"
$idx = $c.IndexOf($cssAnchor)
Write-Host "context-menu found at: $idx" -ForegroundColor Cyan

# Find addAction or contextmenu registration
$actionAnchor = "addAction"
$idx2 = $c.IndexOf($actionAnchor)
Write-Host "addAction found at: $idx2" -ForegroundColor Cyan

# Show snippet around context menu area
if ($idx -gt 0) {
    Write-Host "Snippet: $($c.Substring([Math]::Max(0,$idx-100), [Math]::Min(300, $c.Length-$idx)))" -ForegroundColor Gray
}
