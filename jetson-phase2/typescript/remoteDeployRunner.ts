// =============================================================================
// Operator X02 - Phase 2: Remote Deploy & Run
// =============================================================================
// One-click deploy workflow: upload file to Jetson, compile with nvcc,
// execute, and stream output back to X02's terminal panel.
// =============================================================================

import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DeployConfig {
    /** Local file path to deploy */
    localPath: string;
    /** Remote directory on Jetson (default: ~/x02-deploy) */
    remoteDir?: string;
    /** Custom compile command. Placeholders: {FILE}, {DIR}, {NAME} */
    compileCommand?: string;
    /** Custom run command. Placeholders: {FILE}, {DIR}, {NAME} */
    runCommand?: string;
    /** Auto-detect language and set compile/run commands */
    autoDetect?: boolean;
}

export interface DeployResult {
    transferred: boolean;
    compiled: boolean;
    executed: boolean;
    transfer_time_ms: number;
    compile_output: string;
    run_output: string;
    run_exit_code: number;
    error?: string;
}

export interface RemoteExecutionResult {
    exit_code: number;
    stdout: string;
    stderr: string;
    duration_ms: number;
}

export type DeployStage = 'idle' | 'uploading' | 'compiling' | 'running' | 'complete' | 'error';

export interface DeployProgress {
    stage: DeployStage;
    message: string;
    timestamp: number;
}

type ProgressListener = (progress: DeployProgress) => void;
type OutputListener = (output: string) => void;

// ---------------------------------------------------------------------------
// Language Detection & Default Commands
// ---------------------------------------------------------------------------

interface LanguageConfig {
    extensions: string[];
    compileCommand: string;
    runCommand: string;
    requiresCompilation: boolean;
    description: string;
}

const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
    cuda: {
        extensions: ['.cu'],
        compileCommand: 'nvcc -o {DIR}/{NAME} {FILE}',
        runCommand: './{NAME}',
        requiresCompilation: true,
        description: 'CUDA C++ (nvcc compiler)',
    },
    cuda_shared: {
        extensions: ['.cu'],
        compileCommand: 'nvcc --shared -Xcompiler -fPIC -o {DIR}/{NAME}.so {FILE}',
        runCommand: './{NAME}.so',
        requiresCompilation: true,
        description: 'CUDA Shared Library',
    },
    cpp: {
        extensions: ['.cpp', '.cc', '.cxx'],
        compileCommand: 'g++ -O2 -o {DIR}/{NAME} {FILE}',
        runCommand: './{NAME}',
        requiresCompilation: true,
        description: 'C++ (g++ compiler)',
    },
    c: {
        extensions: ['.c'],
        compileCommand: 'gcc -O2 -o {DIR}/{NAME} {FILE}',
        runCommand: './{NAME}',
        requiresCompilation: true,
        description: 'C (gcc compiler)',
    },
    python: {
        extensions: ['.py'],
        compileCommand: '',
        runCommand: 'python3 {FILE}',
        requiresCompilation: false,
        description: 'Python 3',
    },
    python_torch: {
        extensions: ['.py'],
        compileCommand: '',
        runCommand: 'python3 {FILE}',
        requiresCompilation: false,
        description: 'Python 3 (PyTorch/TensorRT)',
    },
    shell: {
        extensions: ['.sh'],
        compileCommand: '',
        runCommand: 'bash {FILE}',
        requiresCompilation: false,
        description: 'Shell Script',
    },
};

function detectLanguage(filePath: string): LanguageConfig | null {
    const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();

    // Check if CUDA first (takes priority over .cpp matching)
    if (ext === '.cu') return LANGUAGE_CONFIGS.cuda;
    if (ext === '.cpp' || ext === '.cc' || ext === '.cxx') return LANGUAGE_CONFIGS.cpp;
    if (ext === '.c') return LANGUAGE_CONFIGS.c;
    if (ext === '.py') return LANGUAGE_CONFIGS.python;
    if (ext === '.sh') return LANGUAGE_CONFIGS.shell;

    return null;
}

// ---------------------------------------------------------------------------
// Remote Deploy Runner Service
// ---------------------------------------------------------------------------

class RemoteDeployRunner {
    private progressListeners: ProgressListener[] = [];
    private outputListeners: OutputListener[] = [];
    private statusUnlisten: UnlistenFn | null = null;
    private currentStage: DeployStage = 'idle';
    private deployHistory: Array<{ config: DeployConfig; result: DeployResult; timestamp: number }> = [];

    // -- Lifecycle --

    async initialize(): Promise<void> {
        // Listen for deploy status events from Rust backend
        this.statusUnlisten = await listen<string>('jetson-deploy-status', (event) => {
            const message = event.payload;
            let stage: DeployStage = 'idle';

            if (message.includes('Uploading')) stage = 'uploading';
            else if (message.includes('uploaded')) stage = 'uploading';
            else if (message.includes('Compiling')) stage = 'compiling';
            else if (message.includes('Compiled')) stage = 'compiling';
            else if (message.includes('Running')) stage = 'running';
            else if (message.includes('Complete')) stage = 'complete';

            this.emitProgress(stage, message);
        });
    }

    dispose(): void {
        if (this.statusUnlisten) {
            this.statusUnlisten();
            this.statusUnlisten = null;
        }
        this.progressListeners = [];
        this.outputListeners = [];
    }

    // -- Deploy & Run --

    async deploy(config: DeployConfig): Promise<DeployResult> {
        const remoteDir = config.remoteDir || '~/x02-deploy';
        let compileCmd = config.compileCommand || null;
        let runCmd = config.runCommand || '';

        // Auto-detect language if needed
        if (config.autoDetect !== false) {
            const lang = detectLanguage(config.localPath);
            if (lang) {
                if (!compileCmd && lang.requiresCompilation) {
                    compileCmd = lang.compileCommand;
                }
                if (!runCmd) {
                    runCmd = lang.runCommand;
                }
                this.emitProgress('idle', `Detected: ${lang.description}`);
            }
        }

        if (!runCmd) {
            throw new Error(
                'Cannot determine how to run this file. ' +
                'Set a run command manually or use a supported file type (.cu, .cpp, .c, .py, .sh)'
            );
        }

        this.emitProgress('uploading', 'Starting deployment...');

        try {
            const result = await invoke<DeployResult>('jetson_deploy_and_run', {
                localPath: config.localPath,
                remoteDir: remoteDir,
                compileCommand: compileCmd,
                runCommand: runCmd,
            });

            // Emit output
            if (result.compile_output) {
                this.emitOutput(`[COMPILE]\n${result.compile_output}\n`);
            }
            if (result.run_output) {
                this.emitOutput(`[OUTPUT]\n${result.run_output}\n`);
            }
            if (result.error) {
                this.emitProgress('error', result.error);
                this.emitOutput(`[ERROR] ${result.error}\n`);
            } else {
                this.emitProgress('complete', `Completed in ${result.transfer_time_ms}ms transfer`);
            }

            // Store in history
            this.deployHistory.push({ config, result, timestamp: Date.now() });
            if (this.deployHistory.length > 50) {
                this.deployHistory = this.deployHistory.slice(-50);
            }

            return result;
        } catch (err) {
            const errorMsg = String(err);
            this.emitProgress('error', errorMsg);
            this.emitOutput(`[DEPLOY ERROR] ${errorMsg}\n`);
            throw err;
        }
    }

    /** Quick deploy - auto-detect everything from file path */
    async quickDeploy(localPath: string): Promise<DeployResult> {
        return this.deploy({
            localPath,
            autoDetect: true,
        });
    }

    /** Deploy with custom compile and run commands */
    async customDeploy(
        localPath: string,
        compileCommand: string | null,
        runCommand: string,
        remoteDir?: string
    ): Promise<DeployResult> {
        return this.deploy({
            localPath,
            remoteDir,
            compileCommand: compileCommand || undefined,
            runCommand,
            autoDetect: false,
        });
    }

    // -- Remote Execution (standalone) --

    async executeCommand(command: string): Promise<RemoteExecutionResult> {
        return invoke<RemoteExecutionResult>('jetson_execute', { command });
    }

    async executeAndStream(command: string): Promise<RemoteExecutionResult> {
        this.emitOutput(`$ ${command}\n`);
        const result = await this.executeCommand(command);
        if (result.stdout) this.emitOutput(result.stdout);
        if (result.stderr) this.emitOutput(`[stderr] ${result.stderr}`);
        this.emitOutput(`[exit: ${result.exit_code}, ${result.duration_ms}ms]\n`);
        return result;
    }

    // -- File Transfer --

    async uploadFile(localPath: string, remotePath: string): Promise<number> {
        return invoke<number>('jetson_upload_file', { localPath, remotePath });
    }

    async uploadDirectory(localDir: string, remoteDir: string): Promise<string[]> {
        return invoke<string[]>('jetson_upload_directory', { localDir, remoteDir });
    }

    // -- History --

    getDeployHistory(): Array<{ config: DeployConfig; result: DeployResult; timestamp: number }> {
        return [...this.deployHistory];
    }

    getLastDeploy(): { config: DeployConfig; result: DeployResult; timestamp: number } | null {
        return this.deployHistory.length > 0 ? this.deployHistory[this.deployHistory.length - 1] : null;
    }

    // -- Listeners --

    onProgress(listener: ProgressListener): () => void {
        this.progressListeners.push(listener);
        return () => {
            this.progressListeners = this.progressListeners.filter(l => l !== listener);
        };
    }

    onOutput(listener: OutputListener): () => void {
        this.outputListeners.push(listener);
        return () => {
            this.outputListeners = this.outputListeners.filter(l => l !== listener);
        };
    }

    // -- Internal --

    private emitProgress(stage: DeployStage, message: string): void {
        this.currentStage = stage;
        const progress: DeployProgress = { stage, message, timestamp: Date.now() };
        this.progressListeners.forEach(l => {
            try { l(progress); } catch { /* swallow */ }
        });
    }

    private emitOutput(output: string): void {
        this.outputListeners.forEach(l => {
            try { l(output); } catch { /* swallow */ }
        });
    }
}

// ---------------------------------------------------------------------------
// Deploy Panel UI Builder
// ---------------------------------------------------------------------------

export function createDeployPanelHTML(
    currentFile: string | null,
    lastResult: DeployResult | null,
    stage: DeployStage
): string {
    const fileName = currentFile ? currentFile.split(/[/\\]/).pop() || '' : '';
    const lang = currentFile ? detectLanguage(currentFile) : null;

    const stageIndicator = {
        idle: '⬜ Ready',
        uploading: '📤 Uploading...',
        compiling: '🔨 Compiling...',
        running: '▶️ Running...',
        complete: '✅ Complete',
        error: '❌ Error',
    }[stage];

    return `
        <div class="jetson-deploy-panel">
            <div class="deploy-header">
                <h3>Deploy to Jetson</h3>
                <span class="deploy-stage">${stageIndicator}</span>
            </div>

            <div class="deploy-file-info">
                ${currentFile ? `
                    <div class="file-name">${escapeHtml(fileName)}</div>
                    <div class="file-lang">${lang ? lang.description : 'Unknown type'}</div>
                ` : `
                    <div class="no-file">Open a file to deploy</div>
                `}
            </div>

            <div class="deploy-config">
                <div class="config-row">
                    <label>Remote Dir</label>
                    <input type="text" id="deploy-remote-dir" value="~/x02-deploy"
                           class="deploy-input" />
                </div>
                ${lang?.requiresCompilation ? `
                <div class="config-row">
                    <label>Compile</label>
                    <input type="text" id="deploy-compile-cmd"
                           value="${escapeHtml(lang.compileCommand)}"
                           class="deploy-input" />
                </div>
                ` : ''}
                <div class="config-row">
                    <label>Run</label>
                    <input type="text" id="deploy-run-cmd"
                           value="${lang ? escapeHtml(lang.runCommand) : ''}"
                           class="deploy-input" />
                </div>
            </div>

            <div class="deploy-actions">
                <button class="btn-deploy-run" ${!currentFile ? 'disabled' : ''}>
                    Deploy & Run
                </button>
                <button class="btn-deploy-upload" ${!currentFile ? 'disabled' : ''}>
                    Upload Only
                </button>
            </div>

            ${lastResult ? `
            <div class="deploy-result ${lastResult.error ? 'error' : 'success'}">
                <div class="result-header">
                    ${lastResult.error ? '❌' : '✅'}
                    Last Deploy: ${lastResult.error ? 'Failed' : 'Success'}
                    <span class="result-time">${lastResult.transfer_time_ms}ms transfer</span>
                </div>
                ${lastResult.run_output ? `
                <pre class="result-output">${escapeHtml(lastResult.run_output.slice(0, 500))}</pre>
                ` : ''}
            </div>
            ` : ''}

            <div class="deploy-output-terminal" id="deploy-terminal">
                <div class="terminal-content"></div>
            </div>
        </div>
    `;
}

// ---------------------------------------------------------------------------
// Deploy Panel CSS
// ---------------------------------------------------------------------------

export const deployPanelCSS = `
.jetson-deploy-panel {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    background: #1a1a2e;
    color: #e0e0e0;
    border-radius: 6px;
    overflow: hidden;
}

.deploy-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: #16213e;
    border-bottom: 1px solid #0f3460;
}

.deploy-header h3 {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: #76b900;
}

.deploy-stage {
    font-size: 11px;
    color: #aaa;
}

.deploy-file-info {
    padding: 10px 14px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
}

.file-name {
    font-size: 13px;
    font-weight: 600;
    color: #fff;
    font-family: 'Cascadia Code', 'Fira Code', monospace;
}
.file-lang { font-size: 11px; color: #76b900; margin-top: 2px; }
.no-file { font-size: 12px; color: #666; font-style: italic; }

.deploy-config {
    padding: 10px 14px;
}

.config-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;
}

.config-row label {
    font-size: 11px;
    color: #aaa;
    min-width: 65px;
    font-weight: 500;
}

.deploy-input {
    flex: 1;
    padding: 4px 8px;
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 3px;
    color: #e0e0e0;
    font-size: 11px;
    font-family: 'Cascadia Code', 'Fira Code', monospace;
}
.deploy-input:focus { border-color: #76b900; outline: none; }

.deploy-actions {
    padding: 8px 14px;
    display: flex;
    gap: 8px;
}

.btn-deploy-run {
    flex: 1;
    padding: 8px;
    background: #76b900;
    color: #000;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
}
.btn-deploy-run:hover:not(:disabled) { background: #8acb00; }
.btn-deploy-run:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-deploy-upload {
    padding: 8px 14px;
    background: #2d333b;
    color: #ccc;
    border: 1px solid #444;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
}
.btn-deploy-upload:hover:not(:disabled) { background: #363d45; }
.btn-deploy-upload:disabled { opacity: 0.4; cursor: not-allowed; }

.deploy-result {
    margin: 8px 14px;
    padding: 8px 10px;
    border-radius: 4px;
    font-size: 11px;
}
.deploy-result.success { background: rgba(118,185,0,0.1); border: 1px solid rgba(118,185,0,0.3); }
.deploy-result.error { background: rgba(192,57,43,0.1); border: 1px solid rgba(192,57,43,0.3); }

.result-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
}
.result-time { margin-left: auto; color: #888; font-weight: 400; }

.result-output {
    margin: 6px 0 0;
    padding: 6px 8px;
    background: #0d1117;
    border-radius: 3px;
    font-family: 'Cascadia Code', 'Fira Code', monospace;
    font-size: 10px;
    white-space: pre-wrap;
    max-height: 120px;
    overflow-y: auto;
    color: #ccc;
}

.deploy-output-terminal {
    margin: 0 14px 14px;
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 4px;
    min-height: 100px;
    max-height: 200px;
    overflow-y: auto;
}

.terminal-content {
    padding: 8px;
    font-family: 'Cascadia Code', 'Fira Code', monospace;
    font-size: 11px;
    white-space: pre-wrap;
    color: #76b900;
}
`;

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function getLanguageConfig(filePath: string): LanguageConfig | null {
    return detectLanguage(filePath);
}

export function getSupportedExtensions(): string[] {
    const exts = new Set<string>();
    Object.values(LANGUAGE_CONFIGS).forEach(c => c.extensions.forEach(e => exts.add(e)));
    return Array.from(exts);
}

// ---------------------------------------------------------------------------
// Singleton Export
// ---------------------------------------------------------------------------

export const remoteDeployRunner = new RemoteDeployRunner();
export default remoteDeployRunner;
