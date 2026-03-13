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
        const hostInfo = status.host ? ' (' + status.host + ')' : '';
        console.log('[X02] Jetson connected:', status.host);
        window.dispatchEvent(new CustomEvent('x02-notification', {
            detail: {
                type: 'success',
                message: 'Connected to Jetson' + hostInfo,
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
