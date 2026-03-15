# fix_project_analyze_guard.ps1
$root = Get-Location

# Find where Quick/Deep analyze is implemented
Write-Host "=== Files containing 'Quick' + 'analysis' ===" -ForegroundColor Cyan
Get-ChildItem -Path $root -Recurse -Filter "*.ts" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules" } |
    ForEach-Object {
        $content = [System.IO.File]::ReadAllText($_.FullName)
        if ($content -match "\[Quick\]" -or $content -match "quick analysis" -or $content -match "quickAnalyz") {
            Write-Host "$($_.FullName)" -ForegroundColor Yellow
        }
    }

Write-Host "`n=== Files containing 'Deep' + 'analyz' ===" -ForegroundColor Cyan
Get-ChildItem -Path $root -Recurse -Filter "*.ts" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules" } |
    ForEach-Object {
        $content = [System.IO.File]::ReadAllText($_.FullName)
        if ($content -match "deepAnalyz|Deep.*analyz" -or $content -match "\[Deep\]") {
            Write-Host "$($_.FullName)" -ForegroundColor Yellow
        }
    }

Write-Host "`n=== Files with 'startQuickAnalysis' or 'startDeepAnalysis' ===" -ForegroundColor Cyan
Get-ChildItem -Path $root -Recurse -Filter "*.ts" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules" } |
    ForEach-Object {
        $content = [System.IO.File]::ReadAllText($_.FullName)
        if ($content -match "startQuick|startDeep|Quick Analyze|Deep Analyze") {
            Write-Host "$($_.FullName)" -ForegroundColor Yellow
        }
    }
