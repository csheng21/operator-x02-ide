// =============================================================================
// Operator X02 - Phase 2: SSH Connection Manager
// =============================================================================
// Manages Jetson SSH connections with profile storage, connection UI panel,
// and status bar integration. Provides the "Connect to Jetson" experience.
// =============================================================================

import { invoke } from '@tauri-apps/api/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JetsonProfile {
    id: string;
    name: string;
    host: string;
    port: number;
    username: string;
    authMethod: 'password' | 'key';
    password?: string;
    keyPath?: string;
    lastConnected?: string;
    jetpackVersion?: string;
    deviceModel?: string;
}

export interface ConnectionStatus {
    connected: boolean;
    profileId?: string;
    profileName?: string;
    host?: string;
    uptime?: string;
    error?: string;
}

export interface JetsonDeviceInfo {
    model: string;
    jetpack_version: string;
    l4t_version: string;
    cuda_version: string;
    ram_total_mb: number;
    storage_total_gb: number;
    storage_used_gb: number;
    nvcc_available: boolean;
    tegrastats_available: boolean;
}

type ConnectionListener = (status: ConnectionStatus) => void;

// ---------------------------------------------------------------------------
// Connection Manager Service
// ---------------------------------------------------------------------------

class JetsonConnectionManager {
    private listeners: ConnectionListener[] = [];
    private pollInterval: ReturnType<typeof setInterval> | null = null;
    private currentStatus: ConnectionStatus = { connected: false };
    private profiles: JetsonProfile[] = [];

    // -- Lifecycle --

    async initialize(): Promise<void> {
        try {
            const loaded = await invoke<JetsonProfile[]>('jetson_load_profiles');
            this.profiles = loaded;
        } catch {
            this.profiles = [];
        }
        this.startStatusPolling();
    }

    dispose(): void {
        this.stopStatusPolling();
        this.listeners = [];
    }

    // -- Profile Management --

    getProfiles(): JetsonProfile[] {
        return [...this.profiles];
    }

    async saveProfile(profile: JetsonProfile): Promise<JetsonProfile[]> {
        if (!profile.id) {
            profile.id = `jetson-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        }
        this.profiles = await invoke<JetsonProfile[]>('jetson_save_profile', { profile: this.toRustProfile(profile) });
        await invoke('jetson_persist_profiles');
        return this.profiles;
    }

    async deleteProfile(profileId: string): Promise<JetsonProfile[]> {
        this.profiles = await invoke<JetsonProfile[]>('jetson_delete_profile', { profileId });
        await invoke('jetson_persist_profiles');
        return this.profiles;
    }

    // -- Connection --

    async connect(profile: JetsonProfile, password?: string): Promise<ConnectionStatus> {
        try {
            const status = await invoke<ConnectionStatus>('jetson_connect', {
                host: profile.host,
                port: profile.port,
                username: profile.username,
                authMethod: profile.authMethod,
                password: password || profile.password || null,
                keyPath: profile.keyPath || null,
                profileId: profile.id,
            });

            this.currentStatus = status;

            // Update last connected timestamp
            profile.lastConnected = new Date().toISOString();
            await this.saveProfile(profile);

            // Fetch device info after connection
            try {
                const info = await this.getDeviceInfo();
                profile.deviceModel = info.model;
                profile.jetpackVersion = info.jetpack_version;
                await this.saveProfile(profile);
            } catch {
                // Non-critical, continue
            }

            this.notifyListeners(status);
            return status;
        } catch (err) {
            const errorStatus: ConnectionStatus = {
                connected: false,
                error: String(err),
            };
            this.currentStatus = errorStatus;
            this.notifyListeners(errorStatus);
            throw err;
        }
    }

    async connectByProfileId(profileId: string, password?: string): Promise<ConnectionStatus> {
        const profile = this.profiles.find(p => p.id === profileId);
        if (!profile) throw new Error(`Profile not found: ${profileId}`);
        return this.connect(profile, password);
    }

    async disconnect(): Promise<ConnectionStatus> {
        const status = await invoke<ConnectionStatus>('jetson_disconnect', { profileId: null });
        this.currentStatus = status;
        this.notifyListeners(status);
        return status;
    }

    async getStatus(): Promise<ConnectionStatus> {
        const status = await invoke<ConnectionStatus>('jetson_connection_status');
        this.currentStatus = status;
        return status;
    }

    isConnected(): boolean {
        return this.currentStatus.connected;
    }

    getActiveProfileId(): string | undefined {
        return this.currentStatus.profileId ?? undefined;
    }

    // -- Device Info --

    async getDeviceInfo(): Promise<JetsonDeviceInfo> {
        return invoke<JetsonDeviceInfo>('jetson_device_info');
    }

    // -- Listeners --

    onStatusChange(listener: ConnectionListener): () => void {
        this.listeners.push(listener);
        // Immediately call with current status
        listener(this.currentStatus);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    // -- Internal --

    private notifyListeners(status: ConnectionStatus): void {
        this.listeners.forEach(l => {
            try { l(status); } catch { /* swallow */ }
        });
    }

    private startStatusPolling(): void {
        this.pollInterval = setInterval(async () => {
            try {
                const status = await this.getStatus();
                if (status.connected !== this.currentStatus.connected) {
                    this.currentStatus = status;
                    this.notifyListeners(status);
                }
                this.currentStatus = status;
            } catch {
                // Connection check failed
            }
        }, 5000);
    }

    private stopStatusPolling(): void {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    private toRustProfile(profile: JetsonProfile): Record<string, unknown> {
        return {
            id: profile.id,
            name: profile.name,
            host: profile.host,
            port: profile.port,
            username: profile.username,
            auth_method: profile.authMethod,
            password: profile.password || null,
            key_path: profile.keyPath || null,
            last_connected: profile.lastConnected || null,
            jetpack_version: profile.jetpackVersion || null,
            device_model: profile.deviceModel || null,
        };
    }
}

// ---------------------------------------------------------------------------
// Connection Panel UI Builder
// ---------------------------------------------------------------------------

export function createConnectionPanelHTML(profiles: JetsonProfile[], status: ConnectionStatus): string {
    const profileRows = profiles.map(p => `
        <div class="jetson-profile-row ${status.profileId === p.id ? 'active' : ''}"
             data-profile-id="${p.id}">
            <div class="profile-icon">${status.profileId === p.id && status.connected ? '🟢' : '⬜'}</div>
            <div class="profile-info">
                <div class="profile-name">${escapeHtml(p.name)}</div>
                <div class="profile-detail">${escapeHtml(p.username)}@${escapeHtml(p.host)}:${p.port}</div>
                ${p.deviceModel ? `<div class="profile-device">${escapeHtml(p.deviceModel)}</div>` : ''}
            </div>
            <div class="profile-actions">
                ${status.profileId === p.id && status.connected
                    ? '<button class="btn-disconnect" title="Disconnect">Disconnect</button>'
                    : '<button class="btn-connect" title="Connect">Connect</button>'}
                <button class="btn-delete" title="Delete profile">✕</button>
            </div>
        </div>
    `).join('');

    return `
        <div class="jetson-connection-panel">
            <div class="panel-header">
                <h3>Jetson Connections</h3>
                <button class="btn-add-profile" title="Add new Jetson profile">+ Add Jetson</button>
            </div>
            ${status.connected ? `
                <div class="connection-banner connected">
                    <span class="status-dot green"></span>
                    Connected to ${escapeHtml(status.host || 'Jetson')}
                    <span class="uptime">${status.uptime || ''}</span>
                </div>
            ` : `
                <div class="connection-banner disconnected">
                    <span class="status-dot grey"></span>
                    Not connected
                </div>
            `}
            <div class="profiles-list">
                ${profiles.length > 0 ? profileRows : `
                    <div class="no-profiles">
                        <p>No Jetson profiles yet.</p>
                        <p>Click <strong>+ Add Jetson</strong> to connect to your first device.</p>
                    </div>
                `}
            </div>
        </div>
    `;
}

export function createAddProfileFormHTML(): string {
    return `
        <div class="jetson-add-profile-form">
            <h3>Add Jetson Device</h3>
            <div class="form-group">
                <label>Name</label>
                <input type="text" id="jetson-profile-name" placeholder="My Jetson Orin Nano" />
            </div>
            <div class="form-group">
                <label>Host (IP Address)</label>
                <input type="text" id="jetson-host" placeholder="192.168.1.100" />
            </div>
            <div class="form-group">
                <label>Port</label>
                <input type="number" id="jetson-port" value="22" min="1" max="65535" />
            </div>
            <div class="form-group">
                <label>Username</label>
                <input type="text" id="jetson-username" placeholder="nvidia" value="nvidia" />
            </div>
            <div class="form-group">
                <label>Authentication</label>
                <select id="jetson-auth-method">
                    <option value="password">Password</option>
                    <option value="key">SSH Key</option>
                </select>
            </div>
            <div class="form-group auth-password">
                <label>Password</label>
                <input type="password" id="jetson-password" placeholder="Enter password" />
            </div>
            <div class="form-group auth-key" style="display:none">
                <label>Key File Path</label>
                <input type="text" id="jetson-key-path" placeholder="~/.ssh/id_rsa" />
            </div>
            <div class="form-actions">
                <button class="btn-cancel">Cancel</button>
                <button class="btn-test-connection">Test Connection</button>
                <button class="btn-save-profile">Save & Connect</button>
            </div>
        </div>
    `;
}

// ---------------------------------------------------------------------------
// Connection Panel CSS
// ---------------------------------------------------------------------------

export const connectionPanelCSS = `
.jetson-connection-panel {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    background: #1a1a2e;
    color: #e0e0e0;
    border-radius: 6px;
    overflow: hidden;
}

.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: #16213e;
    border-bottom: 1px solid #0f3460;
}

.panel-header h3 {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: #76b900;
}

.btn-add-profile {
    background: #76b900;
    color: #000;
    border: none;
    border-radius: 4px;
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
}
.btn-add-profile:hover { background: #8acb00; }

.connection-banner {
    padding: 8px 14px;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
}
.connection-banner.connected { background: rgba(118,185,0,0.1); }
.connection-banner.disconnected { background: rgba(255,255,255,0.03); }

.status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
}
.status-dot.green { background: #76b900; box-shadow: 0 0 6px #76b900; }
.status-dot.grey { background: #555; }

.uptime { margin-left: auto; color: #888; font-size: 11px; }

.profiles-list {
    max-height: 300px;
    overflow-y: auto;
}

.jetson-profile-row {
    display: flex;
    align-items: center;
    padding: 8px 14px;
    gap: 10px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    transition: background 0.15s;
}
.jetson-profile-row:hover { background: rgba(255,255,255,0.04); }
.jetson-profile-row.active { background: rgba(118,185,0,0.08); border-left: 3px solid #76b900; }

.profile-icon { font-size: 14px; flex-shrink: 0; }
.profile-info { flex: 1; min-width: 0; }
.profile-name { font-size: 12px; font-weight: 600; color: #fff; }
.profile-detail { font-size: 11px; color: #888; margin-top: 2px; }
.profile-device { font-size: 10px; color: #76b900; margin-top: 2px; }

.profile-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
}

.btn-connect, .btn-disconnect {
    padding: 3px 10px;
    border-radius: 3px;
    border: none;
    font-size: 11px;
    cursor: pointer;
    font-weight: 500;
}
.btn-connect { background: #76b900; color: #000; }
.btn-connect:hover { background: #8acb00; }
.btn-disconnect { background: #c0392b; color: #fff; }
.btn-disconnect:hover { background: #e74c3c; }

.btn-delete {
    background: transparent;
    border: none;
    color: #666;
    cursor: pointer;
    font-size: 12px;
    padding: 3px 6px;
}
.btn-delete:hover { color: #c0392b; }

.no-profiles {
    padding: 20px 14px;
    text-align: center;
    color: #666;
    font-size: 12px;
}
.no-profiles p { margin: 4px 0; }

/* Add Profile Form */
.jetson-add-profile-form {
    padding: 14px;
    background: #1a1a2e;
}
.jetson-add-profile-form h3 {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: #76b900;
}
.form-group {
    margin-bottom: 10px;
}
.form-group label {
    display: block;
    font-size: 11px;
    color: #aaa;
    margin-bottom: 4px;
    font-weight: 500;
}
.form-group input, .form-group select {
    width: 100%;
    padding: 6px 10px;
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 4px;
    color: #e0e0e0;
    font-size: 12px;
    font-family: inherit;
    box-sizing: border-box;
}
.form-group input:focus, .form-group select:focus {
    border-color: #76b900;
    outline: none;
}
.form-actions {
    display: flex;
    gap: 8px;
    margin-top: 14px;
    justify-content: flex-end;
}
.form-actions button {
    padding: 6px 14px;
    border-radius: 4px;
    border: none;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
}
.btn-cancel { background: #333; color: #ccc; }
.btn-cancel:hover { background: #444; }
.btn-test-connection { background: #2d333b; color: #76b900; border: 1px solid #76b900; }
.btn-test-connection:hover { background: #76b900; color: #000; }
.btn-save-profile { background: #76b900; color: #000; }
.btn-save-profile:hover { background: #8acb00; }
`;

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Singleton Export
// ---------------------------------------------------------------------------

export const jetsonConnectionManager = new JetsonConnectionManager();
export default jetsonConnectionManager;
