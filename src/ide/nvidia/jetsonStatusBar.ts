// src/ide/nvidia/jetsonStatusBar.ts
// ═══════════════════════════════════════════════════════════════
// 🟢 NVIDIA GPU STATUS BAR WIDGET — Phase 1: Jetson Aware
// ═══════════════════════════════════════════════════════════════
// Small widget in the IDE bottom status bar showing GPU name,
// memory usage, utilization, and temperature. Polls every 10s.
// RAM Impact: ~50-100KB (one React component + poll interval)
// If nvidia-smi not found → widget hidden entirely.

import { invoke } from '@tauri-apps/api/core';

interface NvidiaGpuInfo {
  available: boolean;
  gpu_name: string;
  driver_version: string;
  cuda_version: string;
  memory_used_mb: number;
  memory_total_mb: number;
  memory_free_mb: number;
  gpu_utilization: number;
  memory_utilization: number;
  temperature: number;
  power_draw_w: number;
  power_limit_w: number;
  is_jetson: boolean;
  jetson_model: string;
}

interface NvidiaCudaInfo {
  cuda_available: boolean;
  nvcc_version: string;
  toolkit_path: string;
}

// ── State ──
let gpuWidget: HTMLElement | null = null;
let pollInterval: ReturnType<typeof setInterval> | null = null;
let lastGpuInfo: NvidiaGpuInfo | null = null;
let isExpanded = false;

// ── Polling config ──
const POLL_INTERVAL_MS = 10000; // 10 seconds (lightweight nvidia-smi call)
const INITIAL_DELAY_MS = 3000;  // Wait for IDE to stabilize

// ════════════════════════════════════════════
// PUBLIC: Initialize GPU Status Bar
// ════════════════════════════════════════════

export async function initNvidiaStatusBar(): Promise<void> {
  console.log('🟢 [NVIDIA] Initializing GPU status bar...');
  
  // Wait for IDE status bar to be ready
  setTimeout(async () => {
    try {
      const info = await invoke<NvidiaGpuInfo>('nvidia_check_gpu');
      
      if (!info.available) {
        console.log('ℹ️ [NVIDIA] No GPU detected — status bar widget hidden');
        return;
      }
      
      lastGpuInfo = info;
      createWidget(info);
      startPolling();
      
      console.log(`✅ [NVIDIA] Status bar active: ${info.gpu_name}`);
      if (info.is_jetson) {
        console.log(`🤖 [NVIDIA] Jetson detected: ${info.jetson_model}`);
      }
    } catch (err) {
      console.log('ℹ️ [NVIDIA] GPU detection skipped:', err);
    }
  }, INITIAL_DELAY_MS);
}

// ════════════════════════════════════════════
// WIDGET: Create & Update
// ════════════════════════════════════════════

function createWidget(info: NvidiaGpuInfo): void {
  // Find the status bar — try multiple selectors matching X02's layout
  const statusBar = document.querySelector('.status-bar-left') ||
                    document.querySelector('.status-bar') ||
                    document.querySelector('#status-bar') ||
                    document.querySelector('[class*="status-bar"]');
  
  if (!statusBar) {
    console.warn('⚠️ [NVIDIA] Status bar container not found');
    return;
  }

  gpuWidget = document.createElement('div');
  gpuWidget.id = 'nvidia-gpu-widget';
  gpuWidget.className = 'nvidia-gpu-status';
  gpuWidget.title = getTooltipText(info);
  gpuWidget.addEventListener('click', toggleExpanded);
  
  updateWidgetContent(info);
  injectStyles();
  
  // Insert after existing indicators (Surgical, Backups, etc.)
  statusBar.appendChild(gpuWidget);
}

function updateWidgetContent(info: NvidiaGpuInfo): void {
  if (!gpuWidget) return;
  
  const memPercent = info.memory_total_mb > 0 
    ? Math.round((info.memory_used_mb / info.memory_total_mb) * 100) 
    : 0;
  
  const tempColor = info.temperature > 80 ? '#ff4444' : 
                    info.temperature > 65 ? '#ffaa00' : '#4EC9B0';
  
  const utilColor = info.gpu_utilization > 90 ? '#ff4444' : 
                    info.gpu_utilization > 60 ? '#ffaa00' : '#4EC9B0';

  const icon = info.is_jetson ? '🤖' : '🟢';
  const shortName = getShortGpuName(info.gpu_name);
  
  if (isExpanded) {
    // Expanded view — shows more detail
    gpuWidget.innerHTML = `
      <span class="nvidia-icon">${icon}</span>
      <span class="nvidia-name">${shortName}</span>
      <span class="nvidia-separator">│</span>
      <span class="nvidia-mem">${info.memory_used_mb}/${info.memory_total_mb}MB</span>
      <span class="nvidia-separator">│</span>
      <span class="nvidia-util" style="color:${utilColor}">GPU ${info.gpu_utilization}%</span>
      <span class="nvidia-separator">│</span>
      <span class="nvidia-temp" style="color:${tempColor}">${info.temperature}°C</span>
      ${info.cuda_version ? `<span class="nvidia-separator">│</span><span class="nvidia-cuda">CUDA ${info.cuda_version}</span>` : ''}
    `;
  } else {
    // Compact view — just icon + short name + memory bar
    const barWidth = Math.min(memPercent, 100);
    const barColor = memPercent > 90 ? '#ff4444' : memPercent > 70 ? '#ffaa00' : '#4EC9B0';
    
    gpuWidget.innerHTML = `
      <span class="nvidia-icon">${icon}</span>
      <span class="nvidia-name">${shortName}</span>
      <span class="nvidia-minibar-container">
        <span class="nvidia-minibar" style="width:${barWidth}%;background:${barColor}"></span>
      </span>
      <span class="nvidia-mem-short">${memPercent}%</span>
    `;
  }
  
  gpuWidget.title = getTooltipText(info);
}

function getShortGpuName(name: string): string {
  // Shorten common GPU names for status bar space
  return name
    .replace('NVIDIA ', '')
    .replace('GeForce ', '')
    .replace('Quadro ', 'Q')
    .replace('Tesla ', 'T')
    .replace('NVIDIA Jetson ', 'Jetson ')
    .trim();
}

function getTooltipText(info: NvidiaGpuInfo): string {
  const lines = [
    `🟢 ${info.gpu_name}`,
    `Driver: ${info.driver_version}`,
    info.cuda_version ? `CUDA: ${info.cuda_version}` : '',
    `Memory: ${info.memory_used_mb}MB / ${info.memory_total_mb}MB (${info.memory_free_mb}MB free)`,
    `GPU Utilization: ${info.gpu_utilization}%`,
    `Memory Utilization: ${info.memory_utilization}%`,
    `Temperature: ${info.temperature}°C`,
    info.power_draw_w > 0 ? `Power: ${info.power_draw_w.toFixed(1)}W / ${info.power_limit_w.toFixed(1)}W` : '',
    info.is_jetson ? `\n🤖 Jetson Model: ${info.jetson_model}` : '',
    '\nClick to toggle expanded view',
  ].filter(Boolean);
  
  return lines.join('\n');
}

function toggleExpanded(): void {
  isExpanded = !isExpanded;
  if (lastGpuInfo) {
    updateWidgetContent(lastGpuInfo);
  }
}

// ════════════════════════════════════════════
// POLLING: Periodic GPU status updates
// ════════════════════════════════════════════

function startPolling(): void {
  if (pollInterval) clearInterval(pollInterval);
  
  pollInterval = setInterval(async () => {
    try {
      // Use quick_poll for lighter call during ongoing work
      const info = await invoke<NvidiaGpuInfo>('nvidia_quick_poll');
      if (info.available) {
        // Merge quick poll data into last full info
        if (lastGpuInfo) {
          lastGpuInfo.memory_used_mb = info.memory_used_mb;
          lastGpuInfo.memory_total_mb = info.memory_total_mb;
          lastGpuInfo.gpu_utilization = info.gpu_utilization;
          lastGpuInfo.temperature = info.temperature;
        }
        updateWidgetContent(lastGpuInfo || info);
      }
    } catch {
      // Silently ignore poll errors (GPU may be busy)
    }
  }, POLL_INTERVAL_MS);
}

export function stopNvidiaPolling(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

// ════════════════════════════════════════════
// PUBLIC: Get GPU info for AI context
// ════════════════════════════════════════════

export function getGpuInfoForAI(): string {
  if (!lastGpuInfo || !lastGpuInfo.available) return '';
  
  const info = lastGpuInfo;
  let context = `[GPU: ${info.gpu_name}, VRAM: ${info.memory_used_mb}/${info.memory_total_mb}MB, Util: ${info.gpu_utilization}%, Temp: ${info.temperature}°C]`;
  
  if (info.is_jetson) {
    context += ` [Jetson: ${info.jetson_model}, Shared Memory Architecture]`;
  }
  if (info.cuda_version) {
    context += ` [CUDA: ${info.cuda_version}]`;
  }
  
  return context;
}

// ════════════════════════════════════════════
// CUDA toolkit check (for AI assistant context)
// ════════════════════════════════════════════

export async function checkCudaToolkit(): Promise<NvidiaCudaInfo> {
  try {
    return await invoke<NvidiaCudaInfo>('nvidia_check_cuda');
  } catch {
    return { cuda_available: false, nvcc_version: '', toolkit_path: '' };
  }
}

// ════════════════════════════════════════════
// STYLES: Injected CSS for the widget
// ════════════════════════════════════════════

function injectStyles(): void {
  if (document.getElementById('nvidia-gpu-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'nvidia-gpu-styles';
  style.textContent = `
    .nvidia-gpu-status {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 0 8px;
      height: 22px;
      font-size: 11px;
      font-family: 'Consolas', 'Courier New', monospace;
      color: #cccccc;
      cursor: pointer;
      border-radius: 3px;
      transition: background 0.15s ease;
      user-select: none;
      margin-left: 6px;
      border-left: 1px solid rgba(255,255,255,0.1);
    }
    .nvidia-gpu-status:hover {
      background: rgba(78, 201, 176, 0.15);
    }
    .nvidia-icon {
      font-size: 12px;
      line-height: 1;
    }
    .nvidia-name {
      color: #4EC9B0;
      font-weight: 600;
      font-size: 10px;
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .nvidia-separator {
      color: rgba(255,255,255,0.2);
      font-size: 10px;
    }
    .nvidia-mem, .nvidia-mem-short {
      color: #9CDCFE;
      font-size: 10px;
    }
    .nvidia-util, .nvidia-temp {
      font-size: 10px;
      font-weight: 600;
    }
    .nvidia-cuda {
      color: #CE9178;
      font-size: 10px;
    }
    .nvidia-minibar-container {
      width: 30px;
      height: 6px;
      background: rgba(255,255,255,0.1);
      border-radius: 3px;
      overflow: hidden;
    }
    .nvidia-minibar {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s ease, background 0.3s ease;
    }
  `;
  document.head.appendChild(style);
}

// ════════════════════════════════════════════
// Expose to window for AI assistant access
// ════════════════════════════════════════════

(window as any).nvidiaGpuInfo = getGpuInfoForAI;
(window as any).checkCudaToolkit = checkCudaToolkit;
