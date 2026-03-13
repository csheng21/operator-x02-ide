# ==============================================================================
# Operator X02 - Phase 2: Wire Integration Bridge
# Script 07 of 08
# ==============================================================================
# Creates the integration bridge that connects Phase 2 services with
# existing Phase 1 features (GPU status bar, AI context) and hooks into
# the app initialization lifecycle.
# ==============================================================================
# Usage: .\07_wire_integration.ps1 [-ProjectRoot "C:\path\to\x02"]
# ==============================================================================

param(
    [string]$ProjectRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$srcDir = Join-Path $ProjectRoot "src"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Phase 2 - Script 07: Integration      " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Find the jetson directory from Script 06
$jetsonDir = $null
$searchPaths = @(
    (Join-Path $srcDir "jetson"),
    (Join-Path $srcDir "features\jetson"),
    (Join-Path $srcDir "modules\jetson"),
    (Join-Path $srcDir "services")
)

foreach ($path in $searchPaths) {
    if ((Test-Path $path) -and (Test-Path (Join-Path $path "sshConnectionManager.ts"))) {
        $jetsonDir = $path
        break
    }
}

if (-not $jetsonDir) {
    Write-Host "[ERROR] Phase 2 TypeScript files not found. Run 06_wire_typescript_frontend.ps1 first." -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Phase 2 modules found at: $jetsonDir" -ForegroundColor Green

# ==============================================================================
# Step 1: Create Phase 2 Integration Bridge
# ==============================================================================

Write-Host ""
Write-Host "-- Creating integration bridge --" -ForegroundColor Cyan

$bridgeContent = @"
// =============================================================================
// Operator X02 - Phase 2: Integration Bridge
// =============================================================================
// Connects Phase 2 SSH/Deploy/Monitor with Phase 1 features and the
// main application lifecycle. This is the single entry point for all
// Jetson remote functionality.
// =============================================================================

import {
    jetsonConnectionManager,
    remoteDeployRunner,
    jetsonLiveMonitor,
    initializeJetsonPhase2,
    disposeJetsonPhase2,
    createStatusBarHTML,
    createMonitorDashboardHTML,
    createConnectionPanelHTML,
    createDeployPanelHTML,
} from './index';
import type {
    ConnectionStatus,
    TegrastatsData,
    DeployProgress,
    MonitorAlert,
} from './index';

// ---------------------------------------------------------------------------
// Integration State
// ---------------------------------------------------------------------------

interface JetsonIntegrationState {
    initialized: boolean;
    connected: boolean;
    monitoring: boolean;
    activeProfileName: string | null;
    lastDeployFile: string | null;
    statusBarElement: HTMLElement | null;
    dashboardContainer: HTMLElement | null;
    connectionPanelContainer: HTMLElement | null;
    deployPanelContainer: HTMLElement | null;
}

const state: JetsonIntegrationState = {
    initialized: false,
    connected: false,
    monitoring: false,
    activeProfileName: null,
    lastDeployFile: null,
    statusBarElement: null,
    dashboardContainer: null,
    connectionPanelContainer: null,
    deployPanelContainer: null,
};

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Initialize all Jetson Phase 2 services and wire them into the IDE.
 * Call this once during app startup, after Phase 1 init.
 */
export async function initializeJetsonRemote(): Promise<void> {
    if (state.initialized) return;

    // Initialize core services
    await initializeJetsonPhase2();

    // Wire connection status to status bar
    jetsonConnectionManager.onStatusChange(handleConnectionChange);

    // Wire monitor data to status bar and dashboard
    jetsonLiveMonitor.onData(handleTegrastatsUpdate);

    // Wire monitor alerts
    jetsonLiveMonitor.onAlert(handleMonitorAlert);

    // Wire deploy progress to terminal
    remoteDeployRunner.onProgress(handleDeployProgress);
    remoteDeployRunner.onOutput(handleDeployOutput);

    state.initialized = true;
    console.log('[X02] Jetson Phase 2 initialized');
}

/**
 * Cleanup all Jetson Phase 2 services.
 * Call this during app shutdown.
 */
export function disposeJetsonRemote(): void {
    disposeJetsonPhase2();
    state.initialized = false;
    console.log('[X02] Jetson Phase 2 disposed');
}

// ---------------------------------------------------------------------------
// Status Bar Integration
// ---------------------------------------------------------------------------

/**
 * Mount the Jetson status bar widget into the IDE's status bar.
 * @param container - The status bar container element
 */
export function mountStatusBarWidget(container: HTMLElement): void {
    // Create wrapper element
    const wrapper = document.createElement('div');
    wrapper.id = 'jetson-statusbar-widget';
    wrapper.style.display = 'none'; // Hidden until connected
    wrapper.style.cursor = 'pointer';
    wrapper.addEventListener('click', toggleDashboard);
    container.appendChild(wrapper);
    state.statusBarElement = wrapper;
}

function updateStatusBar(data: TegrastatsData | null): void {
    if (!state.statusBarElement) return;

    if (data) {
        state.statusBarElement.innerHTML = createStatusBarHTML(data);
        state.statusBarElement.style.display = 'flex';
    } else if (state.connected) {
        // Connected but no tegrastats data yet
        state.statusBarElement.innerHTML =
            '<div class="jetson-statusbar-item"><span class="sb-label">Jetson</span> Connected</div>';
        state.statusBarElement.style.display = 'flex';
    } else {
        state.statusBarElement.style.display = 'none';
    }
}

// ---------------------------------------------------------------------------
// Dashboard Panel
// ---------------------------------------------------------------------------

/**
 * Mount the Jetson monitor dashboard into a panel container.
 * @param container - Panel container element
 */
export function mountDashboard(container: HTMLElement): void {
    state.dashboardContainer = container;
    refreshDashboard();
}

function refreshDashboard(): void {
    if (!state.dashboardContainer) return;
    const data = jetsonLiveMonitor.getLatest();
    const history = jetsonLiveMonitor.getHistory();
    state.dashboardContainer.innerHTML = createMonitorDashboardHTML(data, history);
}

function toggleDashboard(): void {
    // Emit custom event for the IDE to handle panel toggle
    window.dispatchEvent(new CustomEvent('x02-toggle-panel', {
        detail: { panel: 'jetson-monitor' }
    }));
}

// ---------------------------------------------------------------------------
// Connection Panel
// ---------------------------------------------------------------------------

/**
 * Mount the connection panel into a container.
 * @param container - Panel container element
 */
export function mountConnectionPanel(container: HTMLElement): void {
    state.connectionPanelContainer = container;
    refreshConnectionPanel();
}

function refreshConnectionPanel(): void {
    if (!state.connectionPanelContainer) return;
    const profiles = jetsonConnectionManager.getProfiles();
    const status: ConnectionStatus = {
        connected: state.connected,
        profileId: jetsonConnectionManager.getActiveProfileId(),
        host: undefined,
    };
    state.connectionPanelContainer.innerHTML = createConnectionPanelHTML(profiles, status);
}

// ---------------------------------------------------------------------------
// Deploy Panel
// ---------------------------------------------------------------------------

/**
 * Mount the deploy panel into a container.
 * @param container - Panel container element
 */
export function mountDeployPanel(container: HTMLElement): void {
    state.deployPanelContainer = container;
    refreshDeployPanel();
}

function refreshDeployPanel(): void {
    if (!state.deployPanelContainer) return;
    const lastDeploy = remoteDeployRunner.getLastDeploy();
    state.deployPanelContainer.innerHTML = createDeployPanelHTML(
        state.lastDeployFile,
        lastDeploy?.result || null,
        'idle'
    );
}

// ---------------------------------------------------------------------------
// Quick Actions (for keyboard shortcuts / command palette)
// ---------------------------------------------------------------------------

/** Open Jetson connection dialog */
export function actionConnectJetson(): void {
    window.dispatchEvent(new CustomEvent('x02-toggle-panel', {
        detail: { panel: 'jetson-connect' }
    }));
}

/** Deploy current file to connected Jetson */
export async function actionDeployCurrentFile(filePath: string): Promise<void> {
    if (!state.connected) {
        console.warn('[X02] Cannot deploy: not connected to Jetson');
        window.dispatchEvent(new CustomEvent('x02-notification', {
            detail: {
                type: 'warning',
                message: 'Connect to a Jetson device first',
                action: { label: 'Connect', handler: 'jetson-connect' }
            }
        }));
        return;
    }

    state.lastDeployFile = filePath;
    try {
        await remoteDeployRunner.quickDeploy(filePath);
    } catch (err) {
        console.error('[X02] Deploy failed:', err);
    }
}

/** Toggle live monitor on/off */
export async function actionToggleMonitor(): Promise<void> {
    if (jetsonLiveMonitor.isMonitoring()) {
        await jetsonLiveMonitor.stopMonitoring();
    } else if (state.connected) {
        await jetsonLiveMonitor.startMonitoring();
    }
}

/** Execute arbitrary command on connected Jetson */
export async function actionRemoteExecute(command: string): Promise<string> {
    const result = await remoteDeployRunner.executeCommand(command);
    return result.stdout + result.stderr;
}

// ---------------------------------------------------------------------------
// Event Handlers
// ---------------------------------------------------------------------------

function handleConnectionChange(status: ConnectionStatus): void {
    const wasConnected = state.connected;
    state.connected = status.connected;
    state.activeProfileName = status.profileName || null;

    updateStatusBar(null); // Will show "Connected" text until tegrastats kicks in
    refreshConnectionPanel();
    refreshDeployPanel();

    // Emit IDE event for other components
    window.dispatchEvent(new CustomEvent('x02-jetson-connection', {
        detail: status
    }));

    if (status.connected && !wasConnected) {
        console.log('[X02] Jetson connected:', status.host);
        window.dispatchEvent(new CustomEvent('x02-notification', {
            detail: {
                type: 'success',
                message: 'Connected to Jetson' + (status.host ? ` (${status.host})` : ''),
            }
        }));
    } else if (!status.connected && wasConnected) {
        console.log('[X02] Jetson disconnected');
    }
}

function handleTegrastatsUpdate(data: TegrastatsData): void {
    updateStatusBar(data);
    refreshDashboard();
}

function handleMonitorAlert(alert: MonitorAlert): void {
    window.dispatchEvent(new CustomEvent('x02-notification', {
        detail: {
            type: alert.type === 'critical' ? 'error' : 'warning',
            message: alert.message,
        }
    }));
}

function handleDeployProgress(progress: DeployProgress): void {
    refreshDeployPanel();

    // Update status bar with deploy stage
    if (state.statusBarElement && progress.stage !== 'idle') {
        const stageIcons: Record<string, string> = {
            uploading: '📤',
            compiling: '🔨',
            running: '▶️',
            complete: '✅',
            error: '❌',
        };
        const icon = stageIcons[progress.stage] || '';
        // Briefly show deploy status in status bar
        const existing = state.statusBarElement.innerHTML;
        state.statusBarElement.setAttribute('data-original', existing);
        state.statusBarElement.innerHTML =
            '<div class="jetson-statusbar-item">' +
            '<span class="sb-label">Jetson</span> ' +
            icon + ' ' + progress.message +
            '</div>';

        if (progress.stage === 'complete' || progress.stage === 'error') {
            setTimeout(() => {
                const original = state.statusBarElement?.getAttribute('data-original');
                if (original && state.statusBarElement) {
                    state.statusBarElement.innerHTML = original;
                }
            }, 3000);
        }
    }
}

function handleDeployOutput(output: string): void {
    // Forward to IDE terminal
    window.dispatchEvent(new CustomEvent('x02-terminal-output', {
        detail: { source: 'jetson-deploy', text: output }
    }));
}

// ---------------------------------------------------------------------------
// Command Palette Registration Helper
// ---------------------------------------------------------------------------

export interface JetsonCommand {
    id: string;
    label: string;
    category: string;
    shortcut?: string;
    handler: () => void | Promise<void>;
    when?: () => boolean;
}

export function getJetsonCommands(): JetsonCommand[] {
    return [
        {
            id: 'jetson.connect',
            label: 'Connect to Jetson',
            category: 'Jetson',
            shortcut: 'Ctrl+Shift+J',
            handler: actionConnectJetson,
        },
        {
            id: 'jetson.disconnect',
            label: 'Disconnect from Jetson',
            category: 'Jetson',
            handler: () => jetsonConnectionManager.disconnect(),
            when: () => state.connected,
        },
        {
            id: 'jetson.deploy',
            label: 'Deploy & Run on Jetson',
            category: 'Jetson',
            shortcut: 'Ctrl+Shift+R',
            handler: () => {
                // IDE should provide current file path
                window.dispatchEvent(new CustomEvent('x02-request-current-file', {
                    detail: {
                        callback: (path: string) => actionDeployCurrentFile(path)
                    }
                }));
            },
            when: () => state.connected,
        },
        {
            id: 'jetson.monitor.toggle',
            label: 'Toggle Jetson Monitor',
            category: 'Jetson',
            handler: actionToggleMonitor,
            when: () => state.connected,
        },
        {
            id: 'jetson.dashboard',
            label: 'Show Jetson Dashboard',
            category: 'Jetson',
            handler: toggleDashboard,
            when: () => state.connected,
        },
    ];
}
"@

$bridgeFile = Join-Path $jetsonDir "jetsonIntegration.ts"
[System.IO.File]::WriteAllText($bridgeFile, $bridgeContent, [System.Text.UTF8Encoding]::new($false))
$lineCount = ($bridgeContent -split "`n").Count
Write-Host "  [OK] jetsonIntegration.ts ($lineCount lines)" -ForegroundColor Green

# ==============================================================================
# Step 2: Create combined CSS file
# ==============================================================================

Write-Host ""
Write-Host "-- Creating combined CSS --" -ForegroundColor Cyan

$cssContent = @"
/* =============================================================================
   Operator X02 - Phase 2: Jetson Remote Styles
   Combined CSS for Connection Panel, Deploy Panel, and Monitor Dashboard.
   Import in your app: import './jetsonStyles.css'
   ============================================================================= */

/* --- NVIDIA Green Theme Variables --- */
:root {
    --jetson-green: #76b900;
    --jetson-green-light: #8acb00;
    --jetson-bg-primary: #1a1a2e;
    --jetson-bg-secondary: #16213e;
    --jetson-bg-input: #0d1117;
    --jetson-border: #0f3460;
    --jetson-border-subtle: #21262d;
    --jetson-text: #e0e0e0;
    --jetson-text-dim: #888;
    --jetson-text-bright: #fff;
    --jetson-warning: #f39c12;
    --jetson-critical: #e74c3c;
    --jetson-success: #2ecc71;
    --jetson-font-mono: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace;
}

/* --- Scrollbar Styling --- */
.jetson-connection-panel ::-webkit-scrollbar,
.jetson-deploy-panel ::-webkit-scrollbar,
.jetson-monitor-dashboard ::-webkit-scrollbar {
    width: 6px;
}
.jetson-connection-panel ::-webkit-scrollbar-track,
.jetson-deploy-panel ::-webkit-scrollbar-track,
.jetson-monitor-dashboard ::-webkit-scrollbar-track {
    background: transparent;
}
.jetson-connection-panel ::-webkit-scrollbar-thumb,
.jetson-deploy-panel ::-webkit-scrollbar-thumb,
.jetson-monitor-dashboard ::-webkit-scrollbar-thumb {
    background: #333;
    border-radius: 3px;
}

/* --- Animations --- */
@keyframes jetson-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

@keyframes jetson-slide-in {
    from { transform: translateY(-10px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}

.jetson-statusbar-item {
    animation: jetson-slide-in 0.2s ease-out;
}

.status-dot.green {
    animation: jetson-pulse 2s ease-in-out infinite;
}

/* --- Deploy Stage Animations --- */
.deploy-stage {
    transition: all 0.3s ease;
}

.stat-bar-fill {
    transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.core-fill {
    transition: height 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

/* --- Responsive Grid for Monitor --- */
@media (max-width: 500px) {
    .monitor-grid {
        grid-template-columns: 1fr 1fr !important;
    }
}

@media (max-width: 350px) {
    .monitor-grid {
        grid-template-columns: 1fr !important;
    }
}
"@

$cssFile = Join-Path $jetsonDir "jetsonStyles.css"
[System.IO.File]::WriteAllText($cssFile, $cssContent, [System.Text.UTF8Encoding]::new($false))
Write-Host "  [OK] jetsonStyles.css created" -ForegroundColor Green

# ==============================================================================
# Step 3: Update barrel index to include integration bridge
# ==============================================================================

Write-Host ""
Write-Host "-- Updating barrel index --" -ForegroundColor Cyan

$indexFile = Join-Path $jetsonDir "index.ts"
if (Test-Path $indexFile) {
    $indexContent = Get-Content $indexFile -Raw -Encoding UTF8

    $integrationExport = @"

// Integration Bridge
export {
    initializeJetsonRemote,
    disposeJetsonRemote,
    mountStatusBarWidget,
    mountDashboard,
    mountConnectionPanel,
    mountDeployPanel,
    actionConnectJetson,
    actionDeployCurrentFile,
    actionToggleMonitor,
    actionRemoteExecute,
    getJetsonCommands,
} from './jetsonIntegration';
export type { JetsonCommand } from './jetsonIntegration';
"@

    if ($indexContent -match 'jetsonIntegration') {
        Write-Host "  [SKIP] Integration exports already in index.ts" -ForegroundColor Gray
    } else {
        $indexContent += "`n" + $integrationExport
        [System.IO.File]::WriteAllText($indexFile, $indexContent, [System.Text.UTF8Encoding]::new($false))
        Write-Host "  [OK] Added integration exports to index.ts" -ForegroundColor Green
    }
}

# ==============================================================================
# Summary
# ==============================================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Script 07 Complete                     " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Files created:" -ForegroundColor White
Write-Host "  + jetsonIntegration.ts  (Integration bridge)" -ForegroundColor Cyan
Write-Host "  + jetsonStyles.css      (Combined styles)" -ForegroundColor Cyan
Write-Host "  ~ index.ts              (Updated exports)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Quick start in your app:" -ForegroundColor White
Write-Host '  import { initializeJetsonRemote, mountStatusBarWidget } from "./jetson";' -ForegroundColor Gray
Write-Host '  await initializeJetsonRemote();' -ForegroundColor Gray
Write-Host '  mountStatusBarWidget(document.getElementById("statusbar")!);' -ForegroundColor Gray
Write-Host ""
Write-Host "Keyboard shortcuts registered:" -ForegroundColor White
Write-Host "  Ctrl+Shift+J  - Connect to Jetson" -ForegroundColor Gray
Write-Host "  Ctrl+Shift+R  - Deploy & Run on Jetson" -ForegroundColor Gray
Write-Host ""
Write-Host "Next: Run 08_verify_phase2.ps1" -ForegroundColor Yellow
