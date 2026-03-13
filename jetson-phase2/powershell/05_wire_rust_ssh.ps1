# ==============================================================================
# Operator X02 - Phase 2: Wire Rust SSH Manager
# Script 05 of 08
# ==============================================================================
# Adds ssh_manager.rs to src-tauri/src/, updates Cargo.toml with ssh2 + chrono
# dependencies, and registers Tauri commands in main.rs.
# ==============================================================================
# Usage: .\05_wire_rust_ssh.ps1 [-ProjectRoot "C:\path\to\x02"]
# ==============================================================================

param(
    [string]$ProjectRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# -- Paths --
$srcTauri    = Join-Path $ProjectRoot "src-tauri"
$srcDir      = Join-Path $srcTauri "src"
$cargoToml   = Join-Path $srcTauri "Cargo.toml"
$mainRs      = Join-Path $srcDir "main.rs"
$targetFile  = Join-Path $srcDir "ssh_manager.rs"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Phase 2 - Script 05: Wire Rust SSH    " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# -- Validate project structure --
if (-not (Test-Path $srcTauri)) {
    Write-Host "[ERROR] src-tauri not found at: $srcTauri" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $cargoToml)) {
    Write-Host "[ERROR] Cargo.toml not found at: $cargoToml" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $mainRs)) {
    Write-Host "[ERROR] main.rs not found at: $mainRs" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Project structure validated" -ForegroundColor Green

# ==============================================================================
# Step 1: Copy ssh_manager.rs
# ==============================================================================

$sourceFile = Join-Path $PSScriptRoot "..\rust\ssh_manager.rs"
if (-not (Test-Path $sourceFile)) {
    # Try relative to script location
    $sourceFile = Join-Path (Split-Path $PSScriptRoot -Parent) "rust\ssh_manager.rs"
}

if (Test-Path $sourceFile) {
    Copy-Item $sourceFile $targetFile -Force
    Write-Host "[OK] Copied ssh_manager.rs to $srcDir" -ForegroundColor Green
} else {
    Write-Host "[WARN] ssh_manager.rs source not found, checking if already in place..." -ForegroundColor Yellow
    if (-not (Test-Path $targetFile)) {
        Write-Host "[ERROR] ssh_manager.rs not found anywhere. Place it at: $targetFile" -ForegroundColor Red
        exit 1
    }
}

Write-Host "[OK] ssh_manager.rs present at: $targetFile" -ForegroundColor Green

# ==============================================================================
# Step 2: Update Cargo.toml - Add dependencies
# ==============================================================================

Write-Host ""
Write-Host "-- Updating Cargo.toml dependencies --" -ForegroundColor Cyan

$cargoContent = Get-Content $cargoToml -Raw -Encoding UTF8

$depsToAdd = @(
    @{ Name = "ssh2";   Line = 'ssh2 = "0.9"' },
    @{ Name = "chrono"; Line = 'chrono = "0.4"' }
)

$modified = $false

foreach ($dep in $depsToAdd) {
    if ($cargoContent -match "(?m)^\s*$($dep.Name)\s*=") {
        Write-Host "  [SKIP] $($dep.Name) already in Cargo.toml" -ForegroundColor Gray
    } else {
        # Find [dependencies] section and append
        if ($cargoContent -match '(?m)^\[dependencies\]') {
            $cargoContent = $cargoContent -replace '(\[dependencies\][^\[]*)', "`$1$($dep.Line)`n"
            Write-Host "  [ADD]  $($dep.Line)" -ForegroundColor Green
            $modified = $true
        } else {
            Write-Host "  [ERROR] No [dependencies] section found in Cargo.toml" -ForegroundColor Red
            exit 1
        }
    }
}

if ($modified) {
    [System.IO.File]::WriteAllText($cargoToml, $cargoContent, [System.Text.UTF8Encoding]::new($false))
    Write-Host "[OK] Cargo.toml updated" -ForegroundColor Green
} else {
    Write-Host "[OK] Cargo.toml already up to date" -ForegroundColor Green
}

# ==============================================================================
# Step 3: Register module in main.rs
# ==============================================================================

Write-Host ""
Write-Host "-- Updating main.rs --" -ForegroundColor Cyan

$mainContent = Get-Content $mainRs -Raw -Encoding UTF8

# 3a: Add mod declaration
if ($mainContent -match 'mod ssh_manager') {
    Write-Host "  [SKIP] mod ssh_manager already declared" -ForegroundColor Gray
} else {
    # Add after other mod declarations, or at top of file
    if ($mainContent -match '(?m)(mod \w+;[^\n]*\n)') {
        $lastMod = [regex]::Matches($mainContent, '(?m)^mod \w+;') | Select-Object -Last 1
        $insertPos = $lastMod.Index + $lastMod.Length
        $mainContent = $mainContent.Insert($insertPos, "`nmod ssh_manager;")
        Write-Host "  [ADD]  mod ssh_manager; (after existing mods)" -ForegroundColor Green
    } else {
        $mainContent = "mod ssh_manager;`n" + $mainContent
        Write-Host "  [ADD]  mod ssh_manager; (at top)" -ForegroundColor Green
    }
}

# 3b: Add .manage(SshState) to Tauri builder
if ($mainContent -match 'ssh_manager::SshState') {
    Write-Host "  [SKIP] SshState already managed" -ForegroundColor Gray
} else {
    # Look for .manage( pattern and add our state
    if ($mainContent -match '\.manage\(') {
        $firstManage = [regex]::Match($mainContent, '\.manage\([^)]*\)')
        $insertPos = $firstManage.Index
        $mainContent = $mainContent.Insert($insertPos, ".manage(ssh_manager::SshState::new())`n        ")
        Write-Host "  [ADD]  .manage(ssh_manager::SshState::new())" -ForegroundColor Green
    } elseif ($mainContent -match '\.invoke_handler\(') {
        $invokePos = $mainContent.IndexOf('.invoke_handler(')
        $mainContent = $mainContent.Insert($invokePos, ".manage(ssh_manager::SshState::new())`n        ")
        Write-Host "  [ADD]  .manage(SshState) before invoke_handler" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] Could not find .manage() or .invoke_handler() in main.rs" -ForegroundColor Yellow
        Write-Host "  [INFO] Manually add: .manage(ssh_manager::SshState::new())" -ForegroundColor Yellow
    }
}

# 3c: Register all SSH commands in invoke_handler
$sshCommands = @(
    "ssh_manager::jetson_connect",
    "ssh_manager::jetson_disconnect",
    "ssh_manager::jetson_connection_status",
    "ssh_manager::jetson_execute",
    "ssh_manager::jetson_device_info",
    "ssh_manager::jetson_upload_file",
    "ssh_manager::jetson_upload_directory",
    "ssh_manager::jetson_deploy_and_run",
    "ssh_manager::jetson_start_monitoring",
    "ssh_manager::jetson_stop_monitoring",
    "ssh_manager::jetson_tegrastats_snapshot",
    "ssh_manager::jetson_save_profile",
    "ssh_manager::jetson_delete_profile",
    "ssh_manager::jetson_list_profiles",
    "ssh_manager::jetson_load_profiles",
    "ssh_manager::jetson_persist_profiles"
)

$commandsAdded = 0
foreach ($cmd in $sshCommands) {
    if ($mainContent -match [regex]::Escape($cmd)) {
        # Already registered
    } else {
        # Find the invoke_handler generate_handler! macro and add command
        if ($mainContent -match 'generate_handler!\[([^\]]*)\]') {
            $existingHandlers = $Matches[1]
            $newHandlers = "$existingHandlers,`n            $cmd"
            $mainContent = $mainContent -replace 'generate_handler!\[[^\]]*\]', "generate_handler![$newHandlers]"
            $commandsAdded++
        }
    }
}

if ($commandsAdded -gt 0) {
    Write-Host "  [ADD]  $commandsAdded Tauri commands registered" -ForegroundColor Green
} else {
    Write-Host "  [SKIP] All commands already registered" -ForegroundColor Gray
}

# Write main.rs
[System.IO.File]::WriteAllText($mainRs, $mainContent, [System.Text.UTF8Encoding]::new($false))
Write-Host "[OK] main.rs updated" -ForegroundColor Green

# ==============================================================================
# Summary
# ==============================================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Script 05 Complete                     " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Files modified:" -ForegroundColor White
Write-Host "  + $targetFile" -ForegroundColor Cyan
Write-Host "  ~ $cargoToml (ssh2, chrono deps)" -ForegroundColor Cyan
Write-Host "  ~ $mainRs (mod, state, 16 commands)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tauri commands registered:" -ForegroundColor White
foreach ($cmd in $sshCommands) {
    Write-Host "  - $cmd" -ForegroundColor Gray
}
Write-Host ""
Write-Host "Next: Run 06_wire_typescript_frontend.ps1" -ForegroundColor Yellow
