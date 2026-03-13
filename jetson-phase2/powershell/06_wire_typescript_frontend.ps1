# ==============================================================================
# Operator X02 - Phase 2: Wire TypeScript Frontend Modules
# Script 06 of 08
# ==============================================================================
# Copies 3 TypeScript modules into the frontend source tree and creates
# the integration barrel file for unified imports.
# ==============================================================================
# Usage: .\06_wire_typescript_frontend.ps1 [-ProjectRoot "C:\path\to\x02"]
# ==============================================================================

param(
    [string]$ProjectRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# -- Paths --
$srcDir = Join-Path $ProjectRoot "src"

# Try common frontend source locations
$possibleDirs = @(
    (Join-Path $srcDir "services"),
    (Join-Path $srcDir "features\jetson"),
    (Join-Path $srcDir "modules\jetson"),
    (Join-Path $srcDir "jetson")
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Phase 2 - Script 06: Wire TypeScript  " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Verify src exists
if (-not (Test-Path $srcDir)) {
    Write-Host "[ERROR] src/ directory not found at: $srcDir" -ForegroundColor Red
    exit 1
}

# Determine target directory - use services/ if it exists, else create jetson/
$targetDir = $null
foreach ($dir in $possibleDirs) {
    if (Test-Path $dir) {
        $targetDir = $dir
        break
    }
}

if (-not $targetDir) {
    # Check if there's a features/ or modules/ dir to nest under
    $featuresDir = Join-Path $srcDir "features"
    $modulesDir  = Join-Path $srcDir "modules"

    if (Test-Path $featuresDir) {
        $targetDir = Join-Path $featuresDir "jetson"
    } elseif (Test-Path $modulesDir) {
        $targetDir = Join-Path $modulesDir "jetson"
    } else {
        $targetDir = Join-Path $srcDir "jetson"
    }
}

# Create target directory
if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    Write-Host "[OK] Created directory: $targetDir" -ForegroundColor Green
} else {
    Write-Host "[OK] Target directory exists: $targetDir" -ForegroundColor Green
}

# ==============================================================================
# Step 1: Copy TypeScript modules
# ==============================================================================

Write-Host ""
Write-Host "-- Copying TypeScript modules --" -ForegroundColor Cyan

$tsFiles = @(
    @{ Name = "sshConnectionManager.ts";  Desc = "SSH Connection Manager" },
    @{ Name = "remoteDeployRunner.ts";     Desc = "Remote Deploy & Run" },
    @{ Name = "jetsonLiveMonitor.ts";      Desc = "Live Tegrastats Monitor" }
)

$scriptParent = Split-Path $PSScriptRoot -Parent
$tsSourceDir  = Join-Path $scriptParent "typescript"

foreach ($file in $tsFiles) {
    $source = Join-Path $tsSourceDir $file.Name
    $target = Join-Path $targetDir $file.Name

    if (Test-Path $source) {
        Copy-Item $source $target -Force
        $lineCount = (Get-Content $target).Count
        $sizeKB = [math]::Round((Get-Item $target).Length / 1024, 1)
        Write-Host "  [OK] $($file.Name) ($lineCount lines, ${sizeKB}KB) - $($file.Desc)" -ForegroundColor Green
    } else {
        if (Test-Path $target) {
            Write-Host "  [SKIP] $($file.Name) already in place" -ForegroundColor Gray
        } else {
            Write-Host "  [WARN] Source not found: $source" -ForegroundColor Yellow
            Write-Host "         Place $($file.Name) manually at: $target" -ForegroundColor Yellow
        }
    }
}

# ==============================================================================
# Step 2: Create barrel index file
# ==============================================================================

Write-Host ""
Write-Host "-- Creating barrel index --" -ForegroundColor Cyan

$barrelContent = @"
// =============================================================================
// Operator X02 - Phase 2: Jetson Remote Integration
// =============================================================================
// Barrel export for all Phase 2 Jetson modules.
// Import everything from here: import { jetsonConnectionManager, ... } from './jetson'
// =============================================================================

// SSH Connection Manager
export {
    jetsonConnectionManager,
    createConnectionPanelHTML,
    createAddProfileFormHTML,
    connectionPanelCSS,
} from './sshConnectionManager';
export type {
    JetsonProfile,
    ConnectionStatus,
    JetsonDeviceInfo,
} from './sshConnectionManager';

// Remote Deploy & Run
export {
    remoteDeployRunner,
    createDeployPanelHTML,
    deployPanelCSS,
    getLanguageConfig,
    getSupportedExtensions,
} from './remoteDeployRunner';
export type {
    DeployConfig,
    DeployResult,
    RemoteExecutionResult,
    DeployStage,
    DeployProgress,
} from './remoteDeployRunner';

// Live Jetson Monitor
export {
    jetsonLiveMonitor,
    createMonitorDashboardHTML,
    monitorDashboardCSS,
    createStatusBarHTML,
} from './jetsonLiveMonitor';
export type {
    TegrastatsData,
    CpuCore,
    MonitorConfig,
    MonitorAlert,
} from './jetsonLiveMonitor';

// ---------------------------------------------------------------------------
// Convenience: Initialize all Phase 2 services
// ---------------------------------------------------------------------------
import { jetsonConnectionManager } from './sshConnectionManager';
import { remoteDeployRunner } from './remoteDeployRunner';
import { jetsonLiveMonitor } from './jetsonLiveMonitor';

export async function initializeJetsonPhase2(): Promise<void> {
    await jetsonConnectionManager.initialize();
    await remoteDeployRunner.initialize();

    // Auto-start monitoring when connected
    jetsonConnectionManager.onStatusChange(async (status) => {
        if (status.connected) {
            try {
                await jetsonLiveMonitor.startMonitoring();
            } catch {
                // Tegrastats may not be available
            }
        } else {
            await jetsonLiveMonitor.stopMonitoring();
        }
    });
}

export function disposeJetsonPhase2(): void {
    jetsonLiveMonitor.dispose();
    remoteDeployRunner.dispose();
    jetsonConnectionManager.dispose();
}
"@

$barrelFile = Join-Path $targetDir "index.ts"
[System.IO.File]::WriteAllText($barrelFile, $barrelContent, [System.Text.UTF8Encoding]::new($false))
Write-Host "  [OK] index.ts barrel created" -ForegroundColor Green

# ==============================================================================
# Step 3: Check for Phase 1 files and note integration points
# ==============================================================================

Write-Host ""
Write-Host "-- Checking Phase 1 integration --" -ForegroundColor Cyan

$phase1Files = @(
    "cudaLanguage.ts",
    "jetsonTemplates.ts",
    "jetsonAiContext.ts",
    "gpuStatusBar.ts"
)

$phase1Found = 0
$searchDirs = @($srcDir) + (Get-ChildItem -Path $srcDir -Directory -Recurse -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName)

foreach ($file in $phase1Files) {
    $found = $false
    foreach ($dir in $searchDirs) {
        $check = Join-Path $dir $file
        if (Test-Path $check) {
            Write-Host "  [OK] Phase 1: $file found" -ForegroundColor Gray
            $found = $true
            $phase1Found++
            break
        }
    }
    if (-not $found) {
        Write-Host "  [--] Phase 1: $file not found (run Phase 1 scripts first)" -ForegroundColor DarkGray
    }
}

if ($phase1Found -eq 4) {
    Write-Host "  [OK] All Phase 1 files present - full integration possible" -ForegroundColor Green
} elseif ($phase1Found -gt 0) {
    Write-Host "  [OK] $phase1Found/4 Phase 1 files found - partial integration" -ForegroundColor Yellow
} else {
    Write-Host "  [INFO] Phase 1 not detected - Phase 2 works standalone" -ForegroundColor Gray
}

# ==============================================================================
# Summary
# ==============================================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Script 06 Complete                     " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Files created in: $targetDir" -ForegroundColor White
Write-Host "  + sshConnectionManager.ts  (Connection UI & profiles)" -ForegroundColor Cyan
Write-Host "  + remoteDeployRunner.ts    (Deploy & Run workflow)" -ForegroundColor Cyan
Write-Host "  + jetsonLiveMonitor.ts     (Live tegrastats monitor)" -ForegroundColor Cyan
Write-Host "  + index.ts                 (Barrel exports)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Import in your app:" -ForegroundColor White
Write-Host "  import { initializeJetsonPhase2 } from './$((Split-Path $targetDir -Leaf))';" -ForegroundColor Gray
Write-Host "  await initializeJetsonPhase2();" -ForegroundColor Gray
Write-Host ""
Write-Host "Next: Run 07_wire_integration.ps1" -ForegroundColor Yellow
