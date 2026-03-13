// =============================================================================
// Operator X02 - Phase 2: Jetson Live Monitor
// =============================================================================
// Real-time tegrastats monitoring via SSH. Displays live GPU utilization,
// RAM usage, temperature, and power consumption in the status bar and
// an optional dashboard panel.
// =============================================================================

import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TegrastatsData {
    timestamp: string;
    ram_used_mb: number;
    ram_total_mb: number;
    swap_used_mb: number;
    swap_total_mb: number;
    cpu_usage: CpuCore[];
    gpu_percent: number;
    gpu_freq_mhz: number;
    temp_cpu: number;
    temp_gpu: number;
    temp_soc: number;
    power_current_mw: number;
    power_average_mw: number;
    emc_percent: number;
}

export interface CpuCore {
    id: number;
    usage_percent: number;
    freq_mhz: number;
    online: boolean;
}

export interface MonitorConfig {
    /** Polling interval in ms (default: 1000) */
    intervalMs?: number;
    /** Number of data points to keep in history (default: 60 = 1 min at 1s) */
    historySize?: number;
    /** Temperature warning threshold in Celsius */
    tempWarningC?: number;
    /** Temperature critical threshold in Celsius */
    tempCriticalC?: number;
}

type DataListener = (data: TegrastatsData) => void;
type AlertListener = (alert: MonitorAlert) => void;

export interface MonitorAlert {
    type: 'warning' | 'critical';
    category: 'temperature' | 'memory' | 'power';
    message: string;
    value: number;
    threshold: number;
    timestamp: number;
}

// ---------------------------------------------------------------------------
// Jetson Live Monitor Service
// ---------------------------------------------------------------------------

class JetsonLiveMonitor {
    private config: Required<MonitorConfig> = {
        intervalMs: 1000,
        historySize: 60,
        tempWarningC: 70,
        tempCriticalC: 85,
    };

    private dataListeners: DataListener[] = [];
    private alertListeners: AlertListener[] = [];
    private eventUnlisten: UnlistenFn | null = null;
    private monitoring = false;
    private history: TegrastatsData[] = [];
    private latestData: TegrastatsData | null = null;

    // -- Lifecycle --

    async startMonitoring(config?: MonitorConfig): Promise<void> {
        if (this.monitoring) return;

        if (config) {
            this.config = { ...this.config, ...config };
        }

        // Listen for tegrastats events from Rust
        this.eventUnlisten = await listen<TegrastatsData>('jetson-tegrastats', (event) => {
            this.handleData(event.payload);
        });

        // Start the tegrastats stream via Rust SSH
        await invoke('jetson_start_monitoring', {
            intervalMs: this.config.intervalMs,
        });

        this.monitoring = true;
    }

    async stopMonitoring(): Promise<void> {
        if (!this.monitoring) return;

        await invoke('jetson_stop_monitoring');

        if (this.eventUnlisten) {
            this.eventUnlisten();
            this.eventUnlisten = null;
        }

        this.monitoring = false;
    }

    isMonitoring(): boolean {
        return this.monitoring;
    }

    dispose(): void {
        this.stopMonitoring().catch(() => {});
        this.dataListeners = [];
        this.alertListeners = [];
    }

    // -- Snapshot (single reading) --

    async getSnapshot(): Promise<TegrastatsData> {
        return invoke<TegrastatsData>('jetson_tegrastats_snapshot');
    }

    // -- Data Access --

    getLatest(): TegrastatsData | null {
        return this.latestData;
    }

    getHistory(): TegrastatsData[] {
        return [...this.history];
    }

    // -- Status Bar Text Generation --

    getStatusBarText(): string {
        if (!this.latestData) return '';

        const d = this.latestData;
        const ramGB = (d.ram_used_mb / 1024).toFixed(1);
        const ramTotalGB = (d.ram_total_mb / 1024).toFixed(1);
        const temp = Math.max(d.temp_gpu, d.temp_cpu);
        const powerW = (d.power_current_mw / 1000).toFixed(1);
        const tempIcon = temp >= this.config.tempCriticalC ? '🔴' :
                         temp >= this.config.tempWarningC ? '🟡' : '';

        return `Jetson | GPU ${d.gpu_percent}% | ${ramGB}/${ramTotalGB}GB | ${temp}°C${tempIcon} | ${powerW}W`;
    }

    getStatusBarTooltip(): string {
        if (!this.latestData) return 'Jetson Monitor: No data';

        const d = this.latestData;
        const onlineCores = d.cpu_usage.filter(c => c.online);
        const avgCpu = onlineCores.length > 0
            ? Math.round(onlineCores.reduce((sum, c) => sum + c.usage_percent, 0) / onlineCores.length)
            : 0;

        return [
            `GPU: ${d.gpu_percent}% @ ${d.gpu_freq_mhz}MHz`,
            `RAM: ${d.ram_used_mb}/${d.ram_total_mb}MB`,
            `SWAP: ${d.swap_used_mb}/${d.swap_total_mb}MB`,
            `CPU: ${avgCpu}% avg (${onlineCores.length}/${d.cpu_usage.length} cores)`,
            `Temp: GPU ${d.temp_gpu}°C | CPU ${d.temp_cpu}°C | SoC ${d.temp_soc}°C`,
            `Power: ${d.power_current_mw}mW (avg ${d.power_average_mw}mW)`,
            `EMC: ${d.emc_percent}%`,
        ].join('\n');
    }

    // -- Listeners --

    onData(listener: DataListener): () => void {
        this.dataListeners.push(listener);
        if (this.latestData) listener(this.latestData);
        return () => {
            this.dataListeners = this.dataListeners.filter(l => l !== listener);
        };
    }

    onAlert(listener: AlertListener): () => void {
        this.alertListeners.push(listener);
        return () => {
            this.alertListeners = this.alertListeners.filter(l => l !== listener);
        };
    }

    // -- Internal --

    private handleData(data: TegrastatsData): void {
        this.latestData = data;

        // Add to history
        this.history.push(data);
        if (this.history.length > this.config.historySize) {
            this.history = this.history.slice(-this.config.historySize);
        }

        // Check for alerts
        this.checkAlerts(data);

        // Notify listeners
        this.dataListeners.forEach(l => {
            try { l(data); } catch { /* swallow */ }
        });
    }

    private checkAlerts(data: TegrastatsData): void {
        const maxTemp = Math.max(data.temp_gpu, data.temp_cpu, data.temp_soc);

        if (maxTemp >= this.config.tempCriticalC) {
            this.emitAlert({
                type: 'critical',
                category: 'temperature',
                message: `CRITICAL: Temperature ${maxTemp}°C exceeds ${this.config.tempCriticalC}°C threshold`,
                value: maxTemp,
                threshold: this.config.tempCriticalC,
                timestamp: Date.now(),
            });
        } else if (maxTemp >= this.config.tempWarningC) {
            this.emitAlert({
                type: 'warning',
                category: 'temperature',
                message: `Warning: Temperature ${maxTemp}°C approaching limit`,
                value: maxTemp,
                threshold: this.config.tempWarningC,
                timestamp: Date.now(),
            });
        }

        // Memory pressure check (>90% used)
        const ramPercent = (data.ram_used_mb / data.ram_total_mb) * 100;
        if (ramPercent > 90) {
            this.emitAlert({
                type: 'warning',
                category: 'memory',
                message: `Memory pressure: ${ramPercent.toFixed(0)}% RAM used`,
                value: ramPercent,
                threshold: 90,
                timestamp: Date.now(),
            });
        }
    }

    private emitAlert(alert: MonitorAlert): void {
        this.alertListeners.forEach(l => {
            try { l(alert); } catch { /* swallow */ }
        });
    }
}

// ---------------------------------------------------------------------------
// Dashboard Panel HTML Generator
// ---------------------------------------------------------------------------

export function createMonitorDashboardHTML(data: TegrastatsData | null, history: TegrastatsData[]): string {
    if (!data) {
        return `
            <div class="jetson-monitor-dashboard">
                <div class="monitor-header">
                    <h3>Jetson Monitor</h3>
                    <button class="btn-start-monitor">Start Monitoring</button>
                </div>
                <div class="no-data">
                    <p>Connect to a Jetson device and start monitoring to see live stats.</p>
                </div>
            </div>
        `;
    }

    const onlineCores = data.cpu_usage.filter(c => c.online);
    const avgCpu = onlineCores.length > 0
        ? Math.round(onlineCores.reduce((s, c) => s + c.usage_percent, 0) / onlineCores.length)
        : 0;
    const ramPercent = Math.round((data.ram_used_mb / data.ram_total_mb) * 100);
    const powerW = (data.power_current_mw / 1000).toFixed(1);
    const maxTemp = Math.max(data.temp_gpu, data.temp_cpu, data.temp_soc);

    // Generate sparkline data for GPU history
    const gpuHistory = history.slice(-30).map(d => d.gpu_percent);
    const ramHistory = history.slice(-30).map(d => Math.round((d.ram_used_mb / d.ram_total_mb) * 100));
    const tempHistory = history.slice(-30).map(d => Math.max(d.temp_gpu, d.temp_cpu));

    return `
        <div class="jetson-monitor-dashboard">
            <div class="monitor-header">
                <h3>Jetson Live Monitor</h3>
                <div class="monitor-time">${data.timestamp}</div>
                <button class="btn-stop-monitor">Stop</button>
            </div>

            <div class="monitor-grid">
                <!-- GPU -->
                <div class="stat-card gpu">
                    <div class="stat-label">GPU</div>
                    <div class="stat-value">${data.gpu_percent}<span class="stat-unit">%</span></div>
                    <div class="stat-detail">${data.gpu_freq_mhz}MHz</div>
                    <div class="stat-bar">
                        <div class="stat-bar-fill gpu-fill" style="width:${data.gpu_percent}%"></div>
                    </div>
                    <div class="sparkline" data-values="${gpuHistory.join(',')}"></div>
                </div>

                <!-- RAM -->
                <div class="stat-card ram">
                    <div class="stat-label">RAM</div>
                    <div class="stat-value">${(data.ram_used_mb / 1024).toFixed(1)}<span class="stat-unit">/${(data.ram_total_mb / 1024).toFixed(1)}GB</span></div>
                    <div class="stat-detail">${ramPercent}% used</div>
                    <div class="stat-bar">
                        <div class="stat-bar-fill ram-fill ${ramPercent > 90 ? 'critical' : ''}" style="width:${ramPercent}%"></div>
                    </div>
                    <div class="sparkline" data-values="${ramHistory.join(',')}"></div>
                </div>

                <!-- CPU -->
                <div class="stat-card cpu">
                    <div class="stat-label">CPU</div>
                    <div class="stat-value">${avgCpu}<span class="stat-unit">%</span></div>
                    <div class="stat-detail">${onlineCores.length}/${data.cpu_usage.length} cores</div>
                    <div class="cpu-cores">
                        ${data.cpu_usage.map(c => `
                            <div class="core-indicator ${c.online ? '' : 'offline'}"
                                 title="Core ${c.id}: ${c.online ? c.usage_percent + '% @ ' + c.freq_mhz + 'MHz' : 'offline'}">
                                <div class="core-fill" style="height:${c.online ? c.usage_percent : 0}%"></div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Temperature -->
                <div class="stat-card temp">
                    <div class="stat-label">Temperature</div>
                    <div class="stat-value ${maxTemp >= 85 ? 'critical' : maxTemp >= 70 ? 'warning' : ''}">${maxTemp}<span class="stat-unit">°C</span></div>
                    <div class="temp-breakdown">
                        <span>GPU ${data.temp_gpu}°C</span>
                        <span>CPU ${data.temp_cpu}°C</span>
                        <span>SoC ${data.temp_soc}°C</span>
                    </div>
                    <div class="sparkline" data-values="${tempHistory.join(',')}"></div>
                </div>

                <!-- Power -->
                <div class="stat-card power">
                    <div class="stat-label">Power</div>
                    <div class="stat-value">${powerW}<span class="stat-unit">W</span></div>
                    <div class="stat-detail">avg ${(data.power_average_mw / 1000).toFixed(1)}W</div>
                </div>

                <!-- SWAP -->
                <div class="stat-card swap">
                    <div class="stat-label">SWAP</div>
                    <div class="stat-value">${data.swap_used_mb}<span class="stat-unit">/${data.swap_total_mb}MB</span></div>
                    <div class="stat-detail">EMC ${data.emc_percent}%</div>
                </div>
            </div>
        </div>
    `;
}

// ---------------------------------------------------------------------------
// Monitor Dashboard CSS
// ---------------------------------------------------------------------------

export const monitorDashboardCSS = `
.jetson-monitor-dashboard {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    background: #1a1a2e;
    color: #e0e0e0;
    border-radius: 6px;
    overflow: hidden;
}

.monitor-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: #16213e;
    border-bottom: 1px solid #0f3460;
}

.monitor-header h3 {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: #76b900;
    flex: 1;
}

.monitor-time {
    font-size: 11px;
    color: #888;
    font-family: 'Cascadia Code', 'Fira Code', monospace;
}

.btn-start-monitor, .btn-stop-monitor {
    padding: 4px 10px;
    border-radius: 4px;
    border: none;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
}
.btn-start-monitor { background: #76b900; color: #000; }
.btn-stop-monitor { background: #c0392b; color: #fff; }

.no-data {
    padding: 30px 14px;
    text-align: center;
    color: #666;
    font-size: 12px;
}

.monitor-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
    padding: 10px;
}

.stat-card {
    background: #0d1117;
    border: 1px solid #21262d;
    border-radius: 6px;
    padding: 10px 12px;
    min-height: 80px;
}

.stat-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #666;
    margin-bottom: 4px;
}

.stat-value {
    font-size: 24px;
    font-weight: 700;
    color: #fff;
    line-height: 1.1;
}
.stat-value .stat-unit {
    font-size: 12px;
    font-weight: 400;
    color: #888;
    margin-left: 2px;
}
.stat-value.warning { color: #f39c12; }
.stat-value.critical { color: #e74c3c; }

.stat-detail {
    font-size: 10px;
    color: #888;
    margin-top: 2px;
}

/* Bar charts */
.stat-bar {
    height: 4px;
    background: #21262d;
    border-radius: 2px;
    margin-top: 8px;
    overflow: hidden;
}

.stat-bar-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.5s ease;
}
.gpu-fill { background: linear-gradient(90deg, #76b900, #8acb00); }
.ram-fill { background: linear-gradient(90deg, #3498db, #2ecc71); }
.ram-fill.critical { background: linear-gradient(90deg, #e74c3c, #f39c12); }

/* CPU core indicators */
.cpu-cores {
    display: flex;
    gap: 3px;
    margin-top: 8px;
    height: 24px;
    align-items: flex-end;
}

.core-indicator {
    flex: 1;
    height: 100%;
    background: #21262d;
    border-radius: 2px;
    position: relative;
    overflow: hidden;
}
.core-indicator.offline { opacity: 0.3; }

.core-fill {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: #76b900;
    border-radius: 2px;
    transition: height 0.5s ease;
}

/* Temperature breakdown */
.temp-breakdown {
    display: flex;
    gap: 8px;
    margin-top: 6px;
    font-size: 10px;
    color: #888;
}

/* Sparkline placeholder */
.sparkline {
    margin-top: 6px;
    height: 20px;
}

/* Status bar widget extension */
.jetson-statusbar-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-family: 'Segoe UI', system-ui, sans-serif;
    padding: 0 8px;
    cursor: pointer;
    height: 100%;
    transition: background 0.15s;
    color: #ccc;
}

.jetson-statusbar-item:hover {
    background: rgba(255,255,255,0.08);
}

.jetson-statusbar-item .sb-label {
    color: #76b900;
    font-weight: 600;
}

.jetson-statusbar-item .sb-gpu {
    color: #fff;
}

.jetson-statusbar-item .sb-ram {
    color: #aaa;
}

.jetson-statusbar-item .sb-temp {
    color: #ccc;
}

.jetson-statusbar-item .sb-temp.warning { color: #f39c12; }
.jetson-statusbar-item .sb-temp.critical { color: #e74c3c; }

.jetson-statusbar-item .sb-power {
    color: #888;
}
`;

// ---------------------------------------------------------------------------
// Status Bar Widget HTML
// ---------------------------------------------------------------------------

export function createStatusBarHTML(data: TegrastatsData | null): string {
    if (!data) return '';

    const maxTemp = Math.max(data.temp_gpu, data.temp_cpu, data.temp_soc);
    const tempClass = maxTemp >= 85 ? 'critical' : maxTemp >= 70 ? 'warning' : '';
    const ramGB = (data.ram_used_mb / 1024).toFixed(1);
    const ramTotalGB = (data.ram_total_mb / 1024).toFixed(1);
    const powerW = (data.power_current_mw / 1000).toFixed(1);

    return `
        <div class="jetson-statusbar-item" title="Click for Jetson Dashboard">
            <span class="sb-label">Jetson</span>
            <span class="sb-gpu">GPU ${data.gpu_percent}%</span>
            <span class="sb-ram">${ramGB}/${ramTotalGB}GB</span>
            <span class="sb-temp ${tempClass}">${maxTemp}°C</span>
            <span class="sb-power">${powerW}W</span>
        </div>
    `;
}

// ---------------------------------------------------------------------------
// Singleton Export
// ---------------------------------------------------------------------------

export const jetsonLiveMonitor = new JetsonLiveMonitor();
export default jetsonLiveMonitor;
