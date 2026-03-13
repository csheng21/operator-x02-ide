// ============================================================================
// 🍓 RASPBERRY PI PANEL — Operator X02 IDE
// src/ide/pi/pi_panel.ts
//
// Features: Device Manager, Remote File Explorer, Terminal, GPIO Designer,
//           Service Manager, System Monitor
// ============================================================================

import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// TYPES
// ============================================================================

interface PiDeviceConfig {
    id: string;
    name: string;
    host: string;
    port: number;
    user: string;
    auth_type: 'password' | 'key';
    password?: string;
    key_path?: string;
}

interface PiDeviceInfo extends PiDeviceConfig {
    status: 'connected' | 'disconnected' | 'error';
    model?: string;
    os?: string;
    memory_total?: string;
    memory_free?: string;
    cpu_temp?: string;
    uptime?: string;
    ip_address?: string;
    gpio_available: boolean;
    camera_available: boolean;
    python_version?: string;
}

interface PiFileEntry {
    name: string;
    path: string;
    is_dir: boolean;
    size?: number;
    permissions?: string;
}

interface PiCommandOutput {
    success: boolean;
    stdout: string;
    stderr: string;
    exit_code?: number;
}

interface PiServiceEntry {
    name: string;
    description: string;
    status: string;
    enabled: boolean;
}

interface GpioPinAssignment {
    bcm: number;
    label: string;
    component: string;
    mode: string;
}

// GPIO pin map for Pi 4B (BCM → Physical)
const GPIO_PINS = [
    { bcm: 2,  phys: 3,  name: 'GP2',  functions: ['I2C SDA'] },
    { bcm: 3,  phys: 5,  name: 'GP3',  functions: ['I2C SCL'] },
    { bcm: 4,  phys: 7,  name: 'GP4',  functions: [] },
    { bcm: 14, phys: 8,  name: 'GP14', functions: ['UART TX'] },
    { bcm: 15, phys: 10, name: 'GP15', functions: ['UART RX'] },
    { bcm: 17, phys: 11, name: 'GP17', functions: [] },
    { bcm: 18, phys: 12, name: 'GP18', functions: ['PWM0'] },
    { bcm: 27, phys: 13, name: 'GP27', functions: [] },
    { bcm: 22, phys: 15, name: 'GP22', functions: [] },
    { bcm: 23, phys: 16, name: 'GP23', functions: [] },
    { bcm: 24, phys: 18, name: 'GP24', functions: [] },
    { bcm: 10, phys: 19, name: 'GP10', functions: ['SPI MOSI'] },
    { bcm: 9,  phys: 21, name: 'GP9',  functions: ['SPI MISO'] },
    { bcm: 25, phys: 22, name: 'GP25', functions: [] },
    { bcm: 11, phys: 23, name: 'GP11', functions: ['SPI CLK'] },
    { bcm: 8,  phys: 24, name: 'GP8',  functions: ['SPI CE0'] },
    { bcm: 7,  phys: 26, name: 'GP7',  functions: ['SPI CE1'] },
    { bcm: 5,  phys: 29, name: 'GP5',  functions: [] },
    { bcm: 6,  phys: 31, name: 'GP6',  functions: [] },
    { bcm: 12, phys: 32, name: 'GP12', functions: ['PWM0'] },
    { bcm: 13, phys: 33, name: 'GP13', functions: ['PWM1'] },
    { bcm: 19, phys: 35, name: 'GP19', functions: ['PWM1', 'SPI1 MISO'] },
    { bcm: 16, phys: 36, name: 'GP16', functions: ['SPI1 CE0'] },
    { bcm: 26, phys: 37, name: 'GP26', functions: [] },
    { bcm: 20, phys: 38, name: 'GP20', functions: ['SPI1 MOSI'] },
    { bcm: 21, phys: 40, name: 'GP21', functions: ['SPI1 CLK'] },
];

const COMPONENTS = ['LED', 'Button', 'Servo', 'Buzzer', 'Relay', 'DHT22', 'HC-SR04', 'I2C Device', 'PWM Motor', 'Custom'];

// ============================================================================
// STATE
// ============================================================================

let panel: HTMLElement | null = null;
let activeConnectionId: string | null = null;
let activeTab: string = 'devices';
let savedDevices: PiDeviceConfig[] = [];
let connectedDevices: Map<string, PiDeviceInfo> = new Map();
let currentRemotePath: string = '/home/pi';
let gpioAssignments: Map<number, GpioPinAssignment> = new Map();
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

// ============================================================================
// PANEL INIT
// ============================================================================


// â”€â”€ Pi Panel Tab Fix (injected) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function attachPiTabDelegation(panelEl: HTMLElement): void {
    // Remove any stale listeners by replacing node
    const tabs = panelEl.querySelectorAll<HTMLElement>('.pi-tab-btn, [data-tab]');
    const contents = panelEl.querySelectorAll<HTMLElement>('.pi-tab-content, [data-content]');

    function activateTab(name: string) {
        tabs.forEach(t => {
            const isActive = (t.dataset.tab === name || t.getAttribute('data-tab') === name);
            t.classList.toggle('active', isActive);
            if (isActive) {
                t.style.borderBottom = '2px solid #ff6b6b';
                t.style.color = '#ffffff';
            } else {
                t.style.borderBottom = '';
                t.style.color = '';
            }
        });
        contents.forEach(c => {
            const show = (c.dataset.content === name || c.id === `pi-content-${name}`);
            c.style.display = show ? 'block' : 'none';
        });
        console.log(`[Pi] Tab activated: ${name}`);
    }

    // Use event delegation on the panel container
    panelEl.addEventListener('click', (e: MouseEvent) => {
        const t = (e.target as HTMLElement).closest<HTMLElement>('.pi-tab-btn, [data-tab]');
        if (!t) return;
        const name = t.dataset.tab || t.getAttribute('data-tab') || '';
        if (name) activateTab(name);
    }, true); // capture phase for reliability

    // Activate first tab by default
    if (tabs.length > 0) {
        const firstName = tabs[0].dataset.tab || tabs[0].getAttribute('data-tab') || 'devices';
        activateTab(firstName);
    }
    console.log('[Pi] Tab delegation ready -', tabs.length, 'tabs found');
}
// â”€â”€ End Pi Panel Tab Fix â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


// Pi Menu Button - placed next to GPU button
// Pi Menu Button - MutationObserver keeps it pinned to end of menu bar
// Pi Menu Button - inserted before x02-plugin-btn
function insertPiMenuButton(): void {
    // Remove old button if exists (always re-insert fresh)
    const old = document.getElementById('pi-menu-btn');
    if (old) old.remove();

    const btn = document.createElement('button');
    btn.id = 'pi-menu-btn';
    btn.textContent = 'ðŸ“ Pi Panel';
    btn.style.cssText = 'background:transparent;border:none;color:#ccc;padding:0 10px;height:100%;cursor:pointer;font-size:13px;white-space:nowrap;';
    btn.title = 'Raspberry Pi Panel (Ctrl+Shift+B)';
    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        e.preventDefault();
        togglePiPanel();
    }, true);

    const plugin = document.getElementById('x02-plugin-btn');
    if (plugin && plugin.parentElement) {
        plugin.parentElement.insertBefore(btn, plugin);
        console.log('[Pi] Button inserted before Plugin btn');
        return;
    }
    // Fallback
    const mb = document.querySelector('.menu-bar') as HTMLElement;
    if (mb) { mb.appendChild(btn); console.log('[Pi] Button appended to menu-bar'); }
    else { setTimeout(insertPiMenuButton, 500); setTimeout(insertPiMenuButton, 2500); }
}
// End Pi Menu Button
// End Pi Menu Button
// End Pi Menu Button
export function initPiPanel() {
    // Register keyboard shortcut Ctrl+Shift+B (for Pi/Board)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'B') {
            e.preventDefault();
            togglePiPanel();
        }
    });

    // Add to View menu

    loadSavedDevices();
}

function togglePiPanel() {
    if (panel) {
        panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
    } else {
        createPanel();
    }
}

// ============================================================================
// PANEL CREATION
// ============================================================================


// â”€â”€ navigateDirectory stub (injected fix) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function navigateDirectory(path: string, contentEl: HTMLElement): Promise<void> {
    if (!contentEl) return;
    contentEl.innerHTML = `
        <div style="padding:12px; color:#ccc; font-family:monospace; font-size:13px;">
            <div style="color:#ff6b6b; margin-bottom:8px;">ðŸ“ ${path || '/'}</div>
            <div style="color:#888; font-size:11px;">
                Connect to a Raspberry Pi device first via the <strong>Devices</strong> tab,
                then file browsing will be available here.
            </div>
        </div>`;
}
// â”€â”€ End navigateDirectory stub â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function createPanel() {
    panel = document.createElement('div');
    panel.id = 'pi-panel';
    panel.style.cssText = `
        position: fixed;
        right: 20px;
        top: 80px;
        width: 420px;
        height: 55vh;
        min-width: 340px;
        min-height: 300px;
        max-height: 90vh;
        background: #1e1e2e;
        border: 1px solid #3a3a5c;
        border-radius: 10px;
        display: flex;
        flex-direction: column;
        z-index: 9999;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        font-family: 'Segoe UI', system-ui, sans-serif;
        font-size: 12px;
        resize: both;
        overflow: hidden;
    `;

    panel.innerHTML = `
        <!-- Header -->
        <div id="pi-panel-header" style="
            display:flex; align-items:center; padding:8px 12px;
            background:#252540; border-bottom:1px solid #3a3a5c;
            border-radius:10px 10px 0 0; cursor:grab; user-select:none; flex-shrink:0;
        ">
            <span style="font-size:16px; margin-right:8px;">🍓</span>
            <span style="font-weight:600; color:#e2e2f0; flex:1; font-size:13px;">Raspberry Pi</span>
            ${activeConnectionId ? `
                <span id="pi-conn-indicator" style="
                    width:8px; height:8px; border-radius:50%; background:#50fa7b;
                    margin-right:8px; box-shadow:0 0 6px #50fa7b;
                "></span>
            ` : ''}
            <button onclick="window.showPiHelp()" style="${btnStyle('#6272a4')}">❓</button>
            <button id="pi-close-btn" style="${btnStyle('#44475a')}">✕</button>
        </div>

        <!-- Tabs -->
        <div id="pi-tabs" style="
            display:flex; background:#1a1a2e; border-bottom:1px solid #3a3a5c; flex-shrink:0;
        ">
            ${['devices','files','terminal','gpio','services','monitor'].map(tab => `
                <button class="pi-tab" data-tab="${tab}" style="${tabStyle(tab === activeTab)}" onclick="window.switchPiTab('${tab}')">
                    ${tabIcon(tab)} ${tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
            `).join('')}
        </div>

        <!-- Content -->
        <div id="pi-content" style="flex:1; overflow:auto; display:flex; flex-direction:column;">
        </div>
    `;

    document.body.appendChild(panel);
    initDrag();
    document.getElementById('pi-close-btn')!.onclick = () => { panel!.style.display = 'none'; };

    // Expose globals
    window.switchPiTab = switchTab;
    window.showPiHelp = showHelp;
    window.piConnectDevice = connectToDevice;
    window.piDisconnect = disconnectDevice;
    window.piScanNetwork = scanNetwork;
    window.piShowAddDevice = showAddDeviceForm;
    window.piNavigate = navigateDirectory;
    window.piOpenFile = openRemoteFile;
    window.piRunCommand = runCommand;
    window.piServiceControl = serviceControl;
    window.piAssignGpioPin = assignGpioPin;
    window.piGenerateGpioCode = generateGpioCode;

    renderTab(activeTab);
}

function btnStyle(bg: string) {
    return `background:${bg}; border:none; color:#cdd6f4; padding:3px 7px; border-radius:4px; cursor:pointer; margin-left:4px; font-size:11px;`;
}

function tabStyle(active: boolean) {
    return `background:${active ? '#2d2d50' : 'transparent'}; border:none; color:${active ? '#bd93f9' : '#888'}; padding:7px 10px; cursor:pointer; font-size:11px; border-bottom:2px solid ${active ? '#bd93f9' : 'transparent'}; transition:all 0.15s;`;
}

function tabIcon(tab: string): string {
    return { devices:'📡', files:'📂', terminal:'⬛', gpio:'🔌', services:'⚙️', monitor:'📊' }[tab] || '•';
}

function switchTab(tab: string) {
    activeTab = tab;
    document.querySelectorAll('.pi-tab').forEach(btn => {
        const t = (btn as HTMLElement).dataset.tab;
        (btn as HTMLElement).style.cssText = tabStyle(t === tab);
        (btn as HTMLElement).className = 'pi-tab';
        (btn as HTMLElement).dataset.tab = t!;
    });
    renderTab(tab);
}

function renderTab(tab: string) {
    const content = document.getElementById('pi-content');
    if (!content) return;
    switch (tab) {
        case 'devices':  renderDevicesTab(content); break;
        case 'files':    renderFilesTab(content); break;
        case 'terminal': renderTerminalTab(content); break;
        case 'gpio':     renderGpioTab(content); break;
        case 'services': renderServicesTab(content); break;
        case 'monitor':  renderMonitorTab(content); break;
    }
}

// ============================================================================
// DEVICES TAB
// ============================================================================

function renderDevicesTab(content: HTMLElement) {
    content.innerHTML = `
        <div style="padding:12px; display:flex; flex-direction:column; gap:10px; height:100%; box-sizing:border-box;">
            <!-- Toolbar -->
            <div style="display:flex; gap:6px; flex-shrink:0;">
                <button onclick="window.piShowAddDevice()" style="${actionBtnStyle('#6272a4')}">+ Add Pi</button>
                <button onclick="window.piScanNetwork()" style="${actionBtnStyle('#44475a')}">🔍 Scan Network</button>
            </div>

            <!-- Device List -->
            <div id="pi-device-list" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:6px;">
                ${renderDeviceCards()}
            </div>

            <!-- Scan Results -->
            <div id="pi-scan-results" style="display:none; flex-shrink:0;"></div>

            <!-- Add Device Form -->
            <div id="pi-add-form" style="display:none; background:#252540; border-radius:8px; padding:12px; flex-shrink:0;">
                ${renderAddDeviceForm()}
            </div>
        </div>
    `;
}

function renderDeviceCards(): string {
    if (savedDevices.length === 0) {
        return `
            <div style="text-align:center; color:#6272a4; padding:30px 20px; flex:1;">
                <div style="font-size:32px; margin-bottom:8px;">🍓</div>
                <div style="font-size:13px; margin-bottom:6px; color:#888;">No Pi devices added yet</div>
                <div style="font-size:11px; color:#6272a4;">Click "+ Add Pi" or "🔍 Scan Network"</div>
            </div>
        `;
    }

    return savedDevices.map(device => {
        const info = connectedDevices.get(device.id);
        const isConnected = !!info && info.status === 'connected';
        const statusColor = isConnected ? '#50fa7b' : '#6272a4';

        return `
            <div style="background:#252540; border-radius:8px; padding:10px 12px; border:1px solid #3a3a5c;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:${isConnected ? '8px' : '0'};">
                    <span style="font-size:16px;">🍓</span>
                    <div style="flex:1;">
                        <div style="font-weight:600; color:#e2e2f0; font-size:12px;">${device.name}</div>
                        <div style="color:#888; font-size:10px;">${device.user}@${device.host}:${device.port}</div>
                    </div>
                    <span style="width:8px; height:8px; border-radius:50%; background:${statusColor}; ${isConnected ? 'box-shadow:0 0 5px ' + statusColor : ''}; display:inline-block;"></span>
                    ${isConnected
                        ? `<button onclick="window.piDisconnect('${device.id}')" style="${actionBtnStyle('#ff5555')}">Disconnect</button>`
                        : `<button onclick="window.piConnectDevice('${device.id}')" style="${actionBtnStyle('#50fa7b', '#1a3a1a')}">Connect</button>`
                    }
                </div>
                ${isConnected && info ? `
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px; font-size:10px; color:#8be9fd; border-top:1px solid #3a3a5c; padding-top:6px;">
                        <span>💻 ${info.model?.replace('Raspberry Pi', 'Pi') || 'Unknown'}</span>
                        <span>🌡️ ${info.cpu_temp || 'N/A'}</span>
                        <span>💾 ${info.memory_free || '?'} kB free</span>
                        <span>⏱️ ${info.uptime?.replace('up ', '') || 'N/A'}</span>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function renderAddDeviceForm(): string {
    return `
        <div style="font-weight:600; color:#bd93f9; margin-bottom:10px; font-size:12px;">➕ Add Raspberry Pi</div>
        <div style="display:flex; flex-direction:column; gap:6px;">
            <input id="pi-f-name" placeholder="Device name (e.g. Workshop Pi)" style="${inputStyle()}">
            <div style="display:grid; grid-template-columns:1fr auto; gap:6px;">
                <input id="pi-f-host" placeholder="IP address (e.g. 192.168.1.50)" style="${inputStyle()}">
                <input id="pi-f-port" placeholder="Port" value="22" style="${inputStyle()} width:55px;">
            </div>
            <input id="pi-f-user" placeholder="Username (default: pi)" value="pi" style="${inputStyle()}">
            <select id="pi-f-auth" onchange="window.piToggleAuth(this.value)" style="${inputStyle()}">
                <option value="password">Password auth</option>
                <option value="key">SSH key auth</option>
            </select>
            <input id="pi-f-secret" type="password" placeholder="Password" style="${inputStyle()}">
            <div style="display:flex; gap:6px; margin-top:4px;">
                <button onclick="window.piSaveDevice()" style="${actionBtnStyle('#50fa7b', '#1a3a1a')}">💾 Save & Connect</button>
                <button onclick="document.getElementById('pi-add-form').style.display='none'" style="${actionBtnStyle('#44475a')}">Cancel</button>
            </div>
        </div>
    `;
}

function inputStyle() {
    return `background:#1a1a2e; border:1px solid #3a3a5c; border-radius:5px; color:#cdd6f4; padding:5px 8px; font-size:11px; width:100%; box-sizing:border-box; outline:none;`;
}

function actionBtnStyle(bg: string, textColor: string = '#fff') {
    return `background:${bg}; border:none; color:${textColor}; padding:5px 10px; border-radius:5px; cursor:pointer; font-size:11px; font-weight:500;`;
}

function showAddDeviceForm() {
    const form = document.getElementById('pi-add-form');
    if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
    window.piToggleAuth = (val: string) => {
        const secretInput = document.getElementById('pi-f-secret') as HTMLInputElement;
        if (secretInput) {
            secretInput.placeholder = val === 'password' ? 'Password' : 'Path to private key file';
            secretInput.type = val === 'password' ? 'password' : 'text';
        }
    };
    window.piSaveDevice = async () => {
        const name = (document.getElementById('pi-f-name') as HTMLInputElement)?.value.trim();
        const host = (document.getElementById('pi-f-host') as HTMLInputElement)?.value.trim();
        const port = parseInt((document.getElementById('pi-f-port') as HTMLInputElement)?.value || '22');
        const user = (document.getElementById('pi-f-user') as HTMLInputElement)?.value.trim() || 'pi';
        const authType = (document.getElementById('pi-f-auth') as HTMLSelectElement)?.value;
        const secret = (document.getElementById('pi-f-secret') as HTMLInputElement)?.value;

        if (!name || !host) { alert('Name and host are required'); return; }

        const config: PiDeviceConfig = {
            id: `pi_${Date.now()}`,
            name, host, port, user,
            auth_type: authType as 'password' | 'key',
            password: authType === 'password' ? secret : undefined,
            key_path: authType === 'key' ? secret : undefined,
        };

        savedDevices.push(config);
        document.getElementById('pi-add-form')!.style.display = 'none';
        renderTab('devices');
        connectToDevice(config.id);
    };
}

async function connectToDevice(deviceId: string) {
    const config = savedDevices.find(d => d.id === deviceId);
    if (!config) return;

    const listEl = document.getElementById('pi-device-list');
    if (listEl) listEl.innerHTML = `<div style="text-align:center; color:#8be9fd; padding:20px;">🔄 Connecting to ${config.name}...</div>`;

    try {
        const info = await invoke<PiDeviceInfo>('pi_connect', { config });
        connectedDevices.set(deviceId, info);
        activeConnectionId = deviceId;
        currentRemotePath = `/home/${config.user}`;
        renderTab('devices');
    } catch (err) {
        connectedDevices.delete(deviceId);
        if (listEl) {
            listEl.innerHTML = `
                <div style="background:#2d1a1a; border:1px solid #ff5555; border-radius:8px; padding:12px; color:#ff5555; font-size:11px;">
                    ❌ Failed to connect to ${config.name}<br>
                    <span style="color:#888; font-size:10px;">${err}</span>
                </div>
            `;
            setTimeout(() => renderTab('devices'), 3000);
        }
    }
}

async function disconnectDevice(deviceId: string) {
    try {
        await invoke('pi_disconnect', { connectionId: deviceId });
    } catch (_) {}
    connectedDevices.delete(deviceId);
    if (activeConnectionId === deviceId) activeConnectionId = null;
    renderTab('devices');
}

async function scanNetwork() {
    const resultsEl = document.getElementById('pi-scan-results');
    if (!resultsEl) return;
    resultsEl.style.display = 'block';
    resultsEl.innerHTML = `
        <div style="background:#1a2a1a; border:1px solid #50fa7b; border-radius:8px; padding:10px; color:#50fa7b; font-size:11px;">
            🔍 Scanning network for Raspberry Pi devices...
        </div>
    `;

    try {
        const devices = await invoke<any[]>('pi_scan_network', { subnet: null });
        const piDevices = devices.filter(d => d.is_pi || d.ssh_open);

        if (piDevices.length === 0) {
            resultsEl.innerHTML = `<div style="background:#252540; border-radius:8px; padding:10px; color:#888; font-size:11px; border:1px solid #3a3a5c;">No Raspberry Pi devices found on network.</div>`;
        } else {
            resultsEl.innerHTML = `
                <div style="background:#252540; border-radius:8px; padding:10px; border:1px solid #3a3a5c;">
                    <div style="color:#50fa7b; font-size:11px; font-weight:600; margin-bottom:8px;">
                        🍓 Found ${piDevices.length} device${piDevices.length !== 1 ? 's' : ''}:
                    </div>
                    ${piDevices.map(d => `
                        <div style="display:flex; align-items:center; gap:8px; padding:5px 0; border-bottom:1px solid #3a3a5c;">
                            <span style="color:${d.is_pi ? '#ff79c6' : '#888'};">${d.is_pi ? '🍓' : '💻'}</span>
                            <span style="color:#cdd6f4; flex:1; font-size:11px;">${d.ip}</span>
                            <button onclick="window.piQuickAdd('${d.ip}')" style="${actionBtnStyle('#6272a4')}">+ Add</button>
                        </div>
                    `).join('')}
                </div>
            `;

            window.piQuickAdd = (ip: string) => {
                showAddDeviceForm();
                (document.getElementById('pi-f-host') as HTMLInputElement).value = ip;
                (document.getElementById('pi-f-name') as HTMLInputElement).value = `Pi @ ${ip}`;
            };
        }
    } catch (err) {
        resultsEl.innerHTML = `<div style="color:#ff5555; font-size:11px; padding:8px;">Scan failed: ${err}</div>`;
    }
}

// ============================================================================
// FILES TAB
// ============================================================================

function renderFilesTab(content: HTMLElement) {
    if (!activeConnectionId) {
        renderNoConnection(content, 'files');
        return;
    }

    content.innerHTML = `
        <div style="display:flex; flex-direction:column; height:100%;">
            <!-- Path bar -->
            <div style="display:flex; align-items:center; gap:6px; padding:8px 12px; background:#1a1a2e; border-bottom:1px solid #3a3a5c; flex-shrink:0;">
                <button onclick="window.piNavigate('..')" style="background:#44475a; border:none; color:#cdd6f4; padding:3px 7px; border-radius:4px; cursor:pointer; font-size:11px;">↑</button>
                <input id="pi-path-input" value="${currentRemotePath}" style="${inputStyle()} flex:1;"
                    onkeydown="if(event.key==='Enter') window.piNavigate(this.value)">
                <button onclick="window.piRefreshFiles()" style="background:#44475a; border:none; color:#cdd6f4; padding:3px 7px; border-radius:4px; cursor:pointer; font-size:11px;">🔄</button>
            </div>
            <!-- File List -->
            <div id="pi-file-list" style="flex:1; overflow-y:auto; padding:8px;">
                <div style="color:#8be9fd; text-align:center; padding:20px; font-size:11px;">Loading...</div>
            </div>
        </div>
    `;

    window.piRefreshFiles = () => loadDirectory(currentRemotePath);
    window.piNavigate = (path: string) => {
        if (path === '..') {
            const parts = currentRemotePath.split('/').filter(Boolean);
            parts.pop();
            path = '/' + parts.join('/') || '/';
        }
        loadDirectory(path);
    };

    loadDirectory(currentRemotePath);
}

async function loadDirectory(path: string) {
    const listEl = document.getElementById('pi-file-list');
    const pathInput = document.getElementById('pi-path-input') as HTMLInputElement;
    if (!listEl || !activeConnectionId) return;

    currentRemotePath = path;
    if (pathInput) pathInput.value = path;

    try {
        const entries = await invoke<PiFileEntry[]>('pi_list_directory', {
            connectionId: activeConnectionId,
            path
        });

        listEl.innerHTML = entries.map(e => `
            <div style="display:flex; align-items:center; gap:6px; padding:5px 6px; border-radius:4px; cursor:pointer; transition:background 0.1s;"
                 onmouseover="this.style.background='#252540'" onmouseout="this.style.background='transparent'"
                 ondblclick="window.${e.is_dir ? 'piNavigate' : 'piOpenFile'}('${e.path.replace(/'/g, "\\'")}')">
                <span style="font-size:14px;">${e.is_dir ? '📁' : fileIcon(e.name)}</span>
                <span style="color:${e.is_dir ? '#8be9fd' : '#f8f8f2'}; flex:1; font-size:11px;">${e.name}</span>
                ${!e.is_dir && e.size !== undefined ? `<span style="color:#6272a4; font-size:10px;">${formatBytes(e.size)}</span>` : ''}
            </div>
        `).join('') || `<div style="color:#6272a4; text-align:center; padding:20px; font-size:11px;">Empty directory</div>`;

    } catch (err) {
        listEl.innerHTML = `<div style="color:#ff5555; padding:10px; font-size:11px;">Error: ${err}</div>`;
    }
}

async function openRemoteFile(path: string) {
    if (!activeConnectionId) return;
    try {
        const content = await invoke<string>('pi_read_file', {
            connectionId: activeConnectionId,
            path
        });
        // Open in Monaco editor via existing IDE API
        if (window.openFileInEditor) {
            window.openFileInEditor(path, content, 'pi-remote');
        } else {
            console.log('[Pi] Remote file content:', content);
        }
    } catch (err) {
        alert(`Cannot open file: ${err}`);
    }
}

function fileIcon(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase();
    const icons: Record<string, string> = {
        py: '🐍', js: '📜', ts: '📘', json: '📋', txt: '📄',
        md: '📝', sh: '⚙️', yml: '⚙️', yaml: '⚙️', cfg: '⚙️',
        jpg: '🖼️', png: '🖼️', gif: '🖼️', mp4: '🎬',
    };
    return icons[ext || ''] || '📄';
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1048576) return `${(bytes/1024).toFixed(1)}KB`;
    return `${(bytes/1048576).toFixed(1)}MB`;
}

// ============================================================================
// TERMINAL TAB
// ============================================================================

function renderTerminalTab(content: HTMLElement) {
    if (!activeConnectionId) {
        renderNoConnection(content, 'terminal');
        return;
    }

    content.innerHTML = `
        <div style="display:flex; flex-direction:column; height:100%; background:#0d0d1a;">
            <div id="pi-terminal-output" style="
                flex:1; overflow-y:auto; padding:10px; font-family:'Cascadia Code','Consolas',monospace;
                font-size:11px; color:#50fa7b; line-height:1.6;
            ">
                <span style="color:#bd93f9;">Connected to Pi. Type commands below.</span><br>
                <span style="color:#6272a4;">${currentRemotePath} $</span> <br>
            </div>
            <div style="display:flex; gap:6px; padding:8px; background:#1a1a2e; border-top:1px solid #3a3a5c; flex-shrink:0;">
                <span style="color:#50fa7b; font-size:11px; font-family:monospace; padding-top:4px;">$</span>
                <input id="pi-terminal-input" placeholder="Enter command..." style="
                    ${inputStyle()} flex:1; font-family:monospace; font-size:11px; background:#0d0d1a;
                " onkeydown="if(event.key==='Enter') window.piRunCommand()">
                <button onclick="window.piRunCommand()" style="${actionBtnStyle('#50fa7b', '#0d1a0d')}">▶</button>
            </div>
        </div>
    `;

    const input = document.getElementById('pi-terminal-input') as HTMLInputElement;
    input?.focus();
}

async function runCommand() {
    const input = document.getElementById('pi-terminal-input') as HTMLInputElement;
    const output = document.getElementById('pi-terminal-output');
    if (!input || !output || !activeConnectionId) return;

    const cmd = input.value.trim();
    if (!cmd) return;
    input.value = '';

    output.innerHTML += `<span style="color:#f1fa8c;">${currentRemotePath} $ ${escapeHtml(cmd)}</span><br>`;

    try {
        const result = await invoke<PiCommandOutput>('pi_execute', {
            connectionId: activeConnectionId,
            command: cmd
        });
        if (result.stdout) output.innerHTML += `<span style="color:#f8f8f2;">${escapeHtml(result.stdout)}</span><br>`;
        if (result.stderr) output.innerHTML += `<span style="color:#ff5555;">${escapeHtml(result.stderr)}</span><br>`;
    } catch (err) {
        output.innerHTML += `<span style="color:#ff5555;">Error: ${err}</span><br>`;
    }

    output.scrollTop = output.scrollHeight;
}

// ============================================================================
// GPIO DESIGNER TAB
// ============================================================================

function renderGpioTab(content: HTMLElement) {
    content.innerHTML = `
        <div style="display:flex; flex-direction:column; height:100%; padding:10px; gap:8px; overflow-y:auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
                <div style="font-weight:600; color:#ff79c6; font-size:12px;">🔌 GPIO Pin Designer — Pi 4B</div>
                <div style="display:flex; gap:5px;">
                    <button onclick="window.piGenerateGpioCode()" style="${actionBtnStyle('#50fa7b', '#0d1a0d')}">📋 Generate Code</button>
                    <button onclick="window.piClearGpio()" style="${actionBtnStyle('#44475a')}">🗑️ Clear</button>
                </div>
            </div>

            <!-- GPIO Grid -->
            <div style="background:#1a1a2e; border-radius:8px; padding:10px; border:1px solid #3a3a5c;">
                <div style="text-align:center; color:#6272a4; font-size:10px; margin-bottom:8px;">Click any GPIO pin to assign a component</div>
                <div id="gpio-grid" style="display:grid; grid-template-columns:1fr; gap:3px;">
                    ${GPIO_PINS.map(pin => {
                        const assigned = gpioAssignments.get(pin.bcm);
                        const color = assigned ? '#50fa7b' : '#3a3a5c';
                        const bg = assigned ? '#1a3a1a' : '#252540';
                        return `
                            <div style="display:flex; align-items:center; gap:6px; padding:4px 8px; background:${bg}; border:1px solid ${color}; border-radius:5px; cursor:pointer; transition:all 0.1s;"
                                 onclick="window.piAssignGpioPin(${pin.bcm})"
                                 title="BCM ${pin.bcm} / Physical pin ${pin.phys}">
                                <span style="color:#6272a4; font-size:10px; width:28px; flex-shrink:0;">P${pin.phys}</span>
                                <span style="color:#8be9fd; font-size:10px; font-weight:600; width:40px; flex-shrink:0;">${pin.name}</span>
                                ${pin.functions.length ? `<span style="color:#f1fa8c; font-size:9px; flex:1;">${pin.functions[0]}</span>` : '<span style="flex:1;"></span>'}
                                ${assigned
                                    ? `<span style="color:#50fa7b; font-size:10px;">✓ ${assigned.label} (${assigned.component})</span>`
                                    : `<span style="color:#44475a; font-size:10px;">unassigned</span>`
                                }
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- Assignment Dialog (hidden) -->
            <div id="gpio-assign-dialog" style="display:none; background:#252540; border:1px solid #bd93f9; border-radius:8px; padding:12px; flex-shrink:0;">
                <div style="color:#bd93f9; font-weight:600; font-size:12px; margin-bottom:8px;">Assign Pin <span id="gpio-assign-pin-label"></span></div>
                <div style="display:flex; flex-direction:column; gap:6px;">
                    <input id="gpio-label-input" placeholder="Label (e.g. Red LED)" style="${inputStyle()}">
                    <select id="gpio-component-select" style="${inputStyle()}">
                        ${COMPONENTS.map(c => `<option value="${c.toLowerCase().replace(/ /g,'_')}">${c}</option>`).join('')}
                    </select>
                    <div style="display:flex; gap:6px; margin-top:4px;">
                        <button onclick="window.piSaveGpioPin()" style="${actionBtnStyle('#50fa7b', '#0d1a0d')}">✓ Assign</button>
                        <button onclick="document.getElementById('gpio-assign-dialog').style.display='none'" style="${actionBtnStyle('#44475a')}">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    window.piClearGpio = () => { gpioAssignments.clear(); renderTab('gpio'); };
}

function assignGpioPin(bcm: number) {
    const dialog = document.getElementById('gpio-assign-dialog')!;
    const pinLabel = document.getElementById('gpio-assign-pin-label')!;
    const pin = GPIO_PINS.find(p => p.bcm === bcm);
    pinLabel.textContent = `${pin?.name || 'BCM' + bcm} (Physical ${pin?.phys || '?'})`;
    dialog.style.display = 'block';

    const existing = gpioAssignments.get(bcm);
    if (existing) {
        (document.getElementById('gpio-label-input') as HTMLInputElement).value = existing.label;
    }

    window.piSaveGpioPin = () => {
        const label = (document.getElementById('gpio-label-input') as HTMLInputElement).value.trim();
        const component = (document.getElementById('gpio-component-select') as HTMLSelectElement).value;
        if (!label) { alert('Label is required'); return; }
        gpioAssignments.set(bcm, { bcm, label, component, mode: 'output' });
        dialog.style.display = 'none';
        renderTab('gpio');
    };
}

async function generateGpioCode() {
    if (gpioAssignments.size === 0) {
        alert('No GPIO pins assigned yet. Click pins to assign components first.');
        return;
    }

    try {
        const assignments = Array.from(gpioAssignments.values());
        const code = await invoke<string>('pi_generate_gpio_code', {
            assignments,
            projectName: 'my_project'
        });

        // Open in editor
        if (window.openFileInEditor) {
            window.openFileInEditor('gpio_main.py', code, 'new');
        } else {
            console.log(code);
        }
    } catch (err) {
        alert(`Code generation failed: ${err}`);
    }
}

// ============================================================================
// SERVICES TAB
// ============================================================================

function renderServicesTab(content: HTMLElement) {
    if (!activeConnectionId) {
        renderNoConnection(content, 'services');
        return;
    }

    content.innerHTML = `
        <div style="display:flex; flex-direction:column; height:100%; padding:10px; gap:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
                <div style="font-weight:600; color:#ffb86c; font-size:12px;">⚙️ Service Manager</div>
                <button onclick="window.piLoadServices()" style="${actionBtnStyle('#44475a')}">🔄 Refresh</button>
            </div>
            <div id="pi-services-list" style="flex:1; overflow-y:auto; font-size:11px;">
                <div style="color:#8be9fd; text-align:center; padding:20px;">Loading services...</div>
            </div>
        </div>
    `;

    window.piLoadServices = loadServices;
    window.piServiceControl = serviceControl;
    loadServices();
}

async function loadServices() {
    const listEl = document.getElementById('pi-services-list');
    if (!listEl || !activeConnectionId) return;

    try {
        const services = await invoke<PiServiceEntry[]>('pi_service_list', {
            connectionId: activeConnectionId
        });

        const statusColor: Record<string, string> = {
            active: '#50fa7b', inactive: '#6272a4', failed: '#ff5555',
            running: '#50fa7b', dead: '#6272a4', exited: '#f1fa8c',
        };

        listEl.innerHTML = services.map(svc => `
            <div style="background:#252540; border-radius:6px; padding:8px 10px; margin-bottom:5px; border:1px solid #3a3a5c;">
                <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                    <span style="width:7px; height:7px; border-radius:50%; background:${statusColor[svc.status] || '#888'}; flex-shrink:0;"></span>
                    <span style="color:#f8f8f2; font-weight:600; flex:1; font-size:11px;">${svc.name}</span>
                    <span style="color:${statusColor[svc.status] || '#888'}; font-size:10px;">${svc.status}</span>
                </div>
                <div style="color:#6272a4; font-size:10px; margin-bottom:5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${svc.description || '—'}</div>
                <div style="display:flex; gap:4px;">
                    <button onclick="window.piServiceControl('${svc.name}','start')" style="background:#1a3a1a; border:1px solid #50fa7b; color:#50fa7b; padding:2px 7px; border-radius:3px; cursor:pointer; font-size:10px;">▶</button>
                    <button onclick="window.piServiceControl('${svc.name}','stop')" style="background:#3a1a1a; border:1px solid #ff5555; color:#ff5555; padding:2px 7px; border-radius:3px; cursor:pointer; font-size:10px;">■</button>
                    <button onclick="window.piServiceControl('${svc.name}','restart')" style="background:#3a2a1a; border:1px solid #ffb86c; color:#ffb86c; padding:2px 7px; border-radius:3px; cursor:pointer; font-size:10px;">↺</button>
                    <button onclick="window.piViewServiceLogs('${svc.name}')" style="${actionBtnStyle('#44475a')} font-size:10px; padding:2px 7px;">📋 Logs</button>
                </div>
            </div>
        `).join('');

        window.piViewServiceLogs = async (name: string) => {
            try {
                const result = await invoke<PiCommandOutput>('pi_service_logs', {
                    connectionId: activeConnectionId,
                    serviceName: name,
                    lines: 30
                });
                alert(result.stdout || result.stderr);
            } catch (err) {
                alert(`Log error: ${err}`);
            }
        };

    } catch (err) {
        listEl.innerHTML = `<div style="color:#ff5555; padding:10px; font-size:11px;">Failed to load services: ${err}</div>`;
    }
}

async function serviceControl(name: string, action: string) {
    if (!activeConnectionId) return;
    try {
        const result = await invoke<PiCommandOutput>('pi_service_control', {
            connectionId: activeConnectionId,
            serviceName: name,
            action
        });
        loadServices();
        if (!result.success && result.stderr) {
            console.warn('[Pi Service]', result.stderr);
        }
    } catch (err) {
        console.error('[Pi Service Control]', err);
    }
}

// ============================================================================
// MONITOR TAB
// ============================================================================

function renderMonitorTab(content: HTMLElement) {
    if (!activeConnectionId) {
        renderNoConnection(content, 'monitor');
        return;
    }

    content.innerHTML = `
        <div style="padding:12px; display:flex; flex-direction:column; gap:8px; height:100%; box-sizing:border-box; overflow-y:auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
                <div style="font-weight:600; color:#8be9fd; font-size:12px;">📊 System Monitor</div>
                <button onclick="window.piRefreshMonitor()" style="${actionBtnStyle('#44475a')}">🔄 Refresh</button>
            </div>
            <div id="pi-monitor-content" style="display:flex; flex-direction:column; gap:8px;">
                <div style="color:#8be9fd; text-align:center; padding:20px; font-size:11px;">Loading system info...</div>
            </div>
        </div>
    `;

    window.piRefreshMonitor = loadMonitor;
    loadMonitor();
}

async function loadMonitor() {
    const el = document.getElementById('pi-monitor-content');
    if (!el || !activeConnectionId) return;

    try {
        const info = await invoke<Record<string, string>>('pi_get_system_info', {
            connectionId: activeConnectionId
        });

        const memTotal = parseInt(info.mem_total || '0');
        const memFree = parseInt(info.mem_free || '0');
        const memUsed = memTotal - memFree;
        const memPct = memTotal > 0 ? Math.round((memUsed / memTotal) * 100) : 0;

        el.innerHTML = `
            <!-- Model + OS -->
            <div style="background:#252540; border-radius:8px; padding:10px; border:1px solid #3a3a5c;">
                <div style="color:#ff79c6; font-size:10px; font-weight:600; margin-bottom:5px;">DEVICE</div>
                <div style="color:#f8f8f2; font-size:11px; font-weight:600;">${info.model || 'Unknown Pi'}</div>
                <div style="color:#888; font-size:10px;">${info.os || 'Unknown OS'} • ${info.arch || ''} • ${info.kernel || ''}</div>
                <div style="color:#8be9fd; font-size:10px; margin-top:4px;">⏱️ ${info.uptime || 'N/A'}</div>
            </div>

            <!-- Metrics Grid -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                ${metricCard('🌡️ CPU Temp', info.cpu_temp || 'N/A', info.cpu_temp ? tempColor(info.cpu_temp) : '#888')}
                ${metricCard('⚡ CPU Usage', info.cpu_usage ? info.cpu_usage + '%' : 'N/A', '#f1fa8c')}
                ${metricCard('💾 Disk Total', info.disk_total || 'N/A', '#8be9fd')}
                ${metricCard('💿 Disk Free', info.disk_free || 'N/A', '#50fa7b')}
                ${metricCard('🌐 IP Address', info.ip || 'N/A', '#bd93f9')}
                ${metricCard('🐍 Python', info.python3?.replace('Python ', '') || 'N/A', '#50fa7b')}
            </div>

            <!-- Memory Bar -->
            <div style="background:#252540; border-radius:8px; padding:10px; border:1px solid #3a3a5c;">
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <span style="color:#888; font-size:10px;">RAM Usage</span>
                    <span style="color:#f8f8f2; font-size:10px;">${memPct}% used</span>
                </div>
                <div style="background:#1a1a2e; border-radius:4px; height:8px; overflow:hidden;">
                    <div style="background:${memPct > 80 ? '#ff5555' : memPct > 60 ? '#f1fa8c' : '#50fa7b'}; width:${memPct}%; height:100%; border-radius:4px; transition:width 0.5s;"></div>
                </div>
                <div style="color:#6272a4; font-size:10px; margin-top:4px;">${Math.round(memUsed/1024)}MB / ${Math.round(memTotal/1024)}MB</div>
            </div>

            <!-- Features -->
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                ${featureBadge('GPIO', info.gpio_avail === 'yes')}
                ${featureBadge('Camera', info.camera_avail === 'yes')}
                ${featureBadge('pip3', info.pip3 !== '')}
            </div>
        `;
    } catch (err) {
        el.innerHTML = `<div style="color:#ff5555; font-size:11px; padding:10px;">Failed to load: ${err}</div>`;
    }
}

function metricCard(label: string, value: string, color: string): string {
    return `
        <div style="background:#252540; border-radius:8px; padding:10px; border:1px solid #3a3a5c; text-align:center;">
            <div style="color:#6272a4; font-size:10px; margin-bottom:3px;">${label}</div>
            <div style="color:${color}; font-size:13px; font-weight:600;">${value}</div>
        </div>
    `;
}

function featureBadge(label: string, available: boolean): string {
    return `<span style="background:${available ? '#1a3a1a' : '#2a2a2a'}; border:1px solid ${available ? '#50fa7b' : '#44475a'}; color:${available ? '#50fa7b' : '#6272a4'}; padding:3px 8px; border-radius:20px; font-size:10px;">${available ? '✓' : '✗'} ${label}</span>`;
}

function tempColor(temp: string): string {
    const val = parseFloat(temp);
    if (val > 75) return '#ff5555';
    if (val > 60) return '#f1fa8c';
    return '#50fa7b';
}

// ============================================================================
// SHARED UTILITIES
// ============================================================================

function renderNoConnection(content: HTMLElement, tab: string) {
    content.innerHTML = `
        <div style="text-align:center; padding:40px 20px; color:#6272a4;">
            <div style="font-size:36px; margin-bottom:12px;">🍓</div>
            <div style="color:#888; font-size:13px; margin-bottom:8px;">No Pi connected</div>
            <div style="font-size:11px; margin-bottom:16px;">Connect to a Raspberry Pi first</div>
            <button onclick="window.switchPiTab('devices')" style="${actionBtnStyle('#6272a4')}">
                Go to Devices
            </button>
        </div>
    `;
}

function escapeHtml(s: string): string {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ============================================================================
// DRAG SUPPORT
// ============================================================================

function initDrag() {
    const header = document.getElementById('pi-panel-header');
    if (!header || !panel) return;

    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        const rect = panel!.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        header.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging || !panel) return;
        panel.style.left = `${e.clientX - dragOffsetX}px`;
        panel.style.top = `${e.clientY - dragOffsetY}px`;
        panel.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        if (header) header.style.cursor = 'grab';
    });
}

// ============================================================================
// HELP OVERLAY
// ============================================================================

function showHelp() {
    const overlay = document.createElement('div'); overlay.id = 'pi-guide-overlay';
    overlay.style.cssText = `
        position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:99999;
        display:flex; align-items:center; justify-content:center;
    `;
    if (!document.getElementById('pi-guide-styles')) { const _s = document.createElement('style'); _s.id='pi-guide-styles'; _s.textContent=`@keyframes _pgIn{from{opacity:0;transform:translateY(20px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}@keyframes _pgFade{from{opacity:0}to{opacity:1}}#pi-guide-overlay{animation:_pgFade 0.2s ease both}#pi-guide-modal{animation:_pgIn 0.3s cubic-bezier(0.34,1.3,0.64,1) both}#pi-guide-close-btn:hover{background:#bd93f9 !important;border-color:#bd93f9 !important;transform:rotate(90deg)}`; document.head.appendChild(_s); }
    overlay.innerHTML = `
        <div id="pi-guide-modal" style="background:#1e1e2e; border:1px solid #3a3a5c; border-radius:12px; padding:24px; max-width:500px; width:90%; max-height:80vh; overflow-y:auto; color:#cdd6f4;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <div style="font-size:18px; font-weight:700; color:#ff79c6;">🍓 Raspberry Pi Panel Guide</div>
                <button id="pi-guide-close-btn" style="background:transparent; border:1px solid #44475a; color:#cdd6f4; width:28px; height:28px; border-radius:6px; cursor:pointer; font-size:16px; display:flex; align-items:center; justify-content:center; transition:all 0.2s; flex-shrink:0;">&#x2715;</button>
            </div>
            <div style="font-size:12px; line-height:1.8;">
                <b style="color:#8be9fd;">⚡ Quick Start</b><br>
                1. Click <b>+ Add Pi</b> and enter IP, user, password<br>
                2. Click <b>Connect</b> — IDE will SSH in directly<br>
                3. Browse files, run terminal commands, manage services<br>
                4. Use GPIO Designer to build your pin layout + generate Python code<br><br>
                <b style="color:#8be9fd;">📡 Devices Tab</b> — Manage Pi connections. Auto-scans network for Pis.<br>
                <b style="color:#8be9fd;">📂 Files Tab</b> — Browse + open remote files. Double-click to edit in Monaco.<br>
                <b style="color:#8be9fd;">⬛ Terminal Tab</b> — Run SSH commands directly. Output streamed live.<br>
                <b style="color:#8be9fd;">🔌 GPIO Tab</b> — Visual pin designer. Click pins to assign. Generate gpiozero code.<br>
                <b style="color:#8be9fd;">⚙️ Services Tab</b> — View/control systemd services. See logs. Deploy scripts as services.<br>
                <b style="color:#8be9fd;">📊 Monitor Tab</b> — CPU temp, memory, disk, uptime at a glance.<br><br>
                <b style="color:#50fa7b;">✅ Requirements</b><br>
                • SSH enabled on Pi (sudo raspi-config → Interface Options → SSH)<br>
                • Python 3 with gpiozero (pre-installed on Raspberry Pi OS)<br>
                • Same WiFi/LAN network<br><br>
                <b style="color:#ffb86c;">⚠️ Notes</b><br>
                • Zero installation needed on the Pi itself<br>
                • Passwords are never saved to disk (reconnect required after restart)<br>
                • GPIO Designer works offline — connect to test pins live<br>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('pi-guide-close-btn')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
}

// ============================================================================
// PERSISTENCE
// ============================================================================

async function loadSavedDevices() {
    try {
        const configDir = await invoke<string>('get_config_path');
        savedDevices = await invoke<PiDeviceConfig[]>('pi_load_devices', { configDir });
    } catch (_) {
        savedDevices = [];
    }
}

export function getPiPanelState() {
    return { activeConnectionId, savedDevices, connectedDevices, gpioAssignments };
}
// Expose togglePiPanel globally for View menu
(window as any).togglePiPanel = togglePiPanel;
