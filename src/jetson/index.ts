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

// Demo Tab - Dedicated Jetson Panel (Ctrl+Shift+G)
export {
    openJetsonDemoTab,
    closeTab as closeJetsonDemoTab,
    registerJetsonTabShortcut,
} from './jetsonDemoTab';

export { initJetsonTabBridge } from './jetsonTabBridge';

// Advanced Feature Pack
export { openJetsonTerminal }     from './jetsonTerminal';
export { openJetsonFileBrowser }  from './jetsonFileBrowser';
export { openJetsonPerfGraph }    from './jetsonPerfGraph';
export { openJetsonPowerManager } from './jetsonPowerManager';
export { openJetsonMultiDevice }  from './jetsonMultiDevice';
export { openJetsonDevTools }     from './jetsonDevTools';