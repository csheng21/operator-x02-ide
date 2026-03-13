// src/ide/arduino/ArduinoBuildMenu.tsx
// Arduino Build Menu Component - Shows in toolbar like "npm (Node.js)"
// Handles auto-detection, installation prompts, and build actions

import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  detectArduinoProject,
  getArduinoBuildSystem,
  checkAndInstallArduinoCLI,
  installRequiredCore,
  getArduinoBuildMenuItems,
  ArduinoProjectConfig,
  ArduinoBoard,
  InstallProgress,
} from './arduinoBuildSystem';

// ================================
// TYPES
// ================================

interface ArduinoBuildMenuProps {
  projectPath: string;
  projectFiles: string[];
  onBuildStart?: () => void;
  onBuildComplete?: (success: boolean, output: string) => void;
  onSerialMonitorOpen?: (port: string) => void;
}

interface SerialPortInfo {
  port_name: string;
  chip_type: string;
  is_arduino_compatible: boolean;
}

// ================================
// COMPONENT
// ================================

export const ArduinoBuildMenu: React.FC<ArduinoBuildMenuProps> = ({
  projectPath,
  projectFiles,
  onBuildStart,
  onBuildComplete,
  onSerialMonitorOpen,
}) => {
  // State
  const [isArduinoProject, setIsArduinoProject] = useState(false);
  const [projectConfig, setProjectConfig] = useState<ArduinoProjectConfig | null>(null);
  const [isCliInstalled, setIsCliInstalled] = useState(false);
  const [cliVersion, setCliVersion] = useState<string>('');
  const [boards, setBoards] = useState<ArduinoBoard[]>([]);
  const [ports, setPorts] = useState<SerialPortInfo[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<ArduinoBoard | null>(null);
  const [selectedPort, setSelectedPort] = useState<string>('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState<InstallProgress | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [showBoardSelector, setShowBoardSelector] = useState(false);
  const [showPortSelector, setShowPortSelector] = useState(false);

  // ================================
  // INITIALIZATION
  // ================================

  // Detect Arduino project on mount or when files change
  useEffect(() => {
    const config = detectArduinoProject(projectPath, projectFiles);
    setIsArduinoProject(!!config);
    setProjectConfig(config);
    
    if (config) {
      checkArduinoCLI();
    }
  }, [projectPath, projectFiles]);

  // Check Arduino CLI installation
  const checkArduinoCLI = useCallback(async () => {
    try {
      const system = await getArduinoBuildSystem();
      setIsCliInstalled(system.isInstalled);
      setCliVersion(system.version || '');
      setBoards(system.boards);
      
      // Auto-select first board if available
      if (system.boards.length > 0 && !selectedBoard) {
        setSelectedBoard(system.boards[0]);
        setSelectedPort(system.boards[0].port);
      }
    } catch (e) {
      setIsCliInstalled(false);
    }
  }, [selectedBoard]);

  // Refresh ports periodically
  useEffect(() => {
    if (!isArduinoProject || !isCliInstalled) return;
    
    const refreshPorts = async () => {
      try {
        const portList = await invoke('arduino_list_serial_ports') as SerialPortInfo[];
        setPorts(portList.filter(p => p.is_arduino_compatible));
      } catch (e) {
        console.warn('Failed to refresh ports:', e);
      }
    };
    
    refreshPorts();
    const interval = setInterval(refreshPorts, 3000);
    
    return () => clearInterval(interval);
  }, [isArduinoProject, isCliInstalled]);

  // ================================
  // HANDLERS
  // ================================

  // Install Arduino CLI
  const handleInstallCLI = async () => {
    setIsInstalling(true);
    setInstallProgress({ stage: 'starting', progress: 0, message: 'Starting installation...' });
    
    try {
      const success = await checkAndInstallArduinoCLI((progress) => {
        setInstallProgress(progress);
      });
      
      if (success) {
        // Install required core for project type
        if (projectConfig) {
          await installRequiredCore(projectConfig.type, (progress) => {
            setInstallProgress(progress);
          });
        }
        
        await checkArduinoCLI();
      }
    } finally {
      setIsInstalling(false);
      setTimeout(() => setInstallProgress(null), 3000);
    }
  };

  // Verify/Compile
  const handleVerify = async () => {
    if (!selectedBoard?.fqbn) {
      setShowBoardSelector(true);
      return;
    }
    
    setIsBuilding(true);
    onBuildStart?.();
    
    try {
      const result: any = await invoke('arduino_compile', {
        sketchPath: projectPath,
        fqbn: selectedBoard.fqbn,
        verbose: false,
      });
      
      onBuildComplete?.(result.success, result.stdout + '\n' + result.stderr);
    } catch (e) {
      onBuildComplete?.(false, `Error: ${e}`);
    } finally {
      setIsBuilding(false);
    }
  };

  // Upload
  const handleUpload = async () => {
    if (!selectedBoard?.fqbn) {
      setShowBoardSelector(true);
      return;
    }
    
    if (!selectedPort) {
      setShowPortSelector(true);
      return;
    }
    
    setIsBuilding(true);
    onBuildStart?.();
    
    try {
      const result: any = await invoke('arduino_compile_and_upload', {
        sketchPath: projectPath,
        port: selectedPort,
        fqbn: selectedBoard.fqbn,
        verbose: false,
      });
      
      onBuildComplete?.(result.success, result.stdout + '\n' + result.stderr);
    } catch (e) {
      onBuildComplete?.(false, `Error: ${e}`);
    } finally {
      setIsBuilding(false);
    }
  };

  // Open Serial Monitor
  const handleSerialMonitor = () => {
    if (selectedPort) {
      onSerialMonitorOpen?.(selectedPort);
    } else {
      setShowPortSelector(true);
    }
  };

  // ================================
  // RENDER
  // ================================

  // Don't show if not an Arduino project
  if (!isArduinoProject) {
    return null;
  }

  // Get project type icon
  const getProjectIcon = () => {
    switch (projectConfig?.type) {
      case 'esp32': return '📡';
      case 'esp8266': return '📶';
      case 'stm32': return '🔩';
      default: return '🔌';
    }
  };

  // Get project type label
  const getProjectLabel = () => {
    switch (projectConfig?.type) {
      case 'esp32': return 'ESP32';
      case 'esp8266': return 'ESP8266';
      case 'stm32': return 'STM32';
      default: return 'Arduino';
    }
  };

  return (
    <div className="arduino-build-menu">
      {/* Main Button (like npm button) */}
      <button
        className={`arduino-menu-button ${isMenuOpen ? 'active' : ''} ${isBuilding ? 'building' : ''}`}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        title={`${getProjectLabel()} Build System`}
      >
        <span className="arduino-icon">{getProjectIcon()}</span>
        <span className="arduino-label">{getProjectLabel()}</span>
        {isCliInstalled && <span className="arduino-version">({cliVersion})</span>}
        {!isCliInstalled && <span className="arduino-warning">⚠️</span>}
        <span className="arduino-arrow">▼</span>
      </button>

      {/* Dropdown Menu */}
      {isMenuOpen && (
        <div className="arduino-dropdown">
          {/* Not Installed State */}
          {!isCliInstalled && !isInstalling && (
            <div className="arduino-install-prompt">
              <div className="install-icon">⚠️</div>
              <div className="install-message">
                Arduino CLI is not installed.
                <br />
                <small>Required for compiling and uploading sketches.</small>
              </div>
              <button className="install-button" onClick={handleInstallCLI}>
                Install Arduino CLI
              </button>
            </div>
          )}

          {/* Installing State */}
          {isInstalling && installProgress && (
            <div className="arduino-installing">
              <div className="install-spinner">⏳</div>
              <div className="install-stage">{installProgress.stage}</div>
              <div className="install-message">{installProgress.message}</div>
              <div className="install-progress-bar">
                <div 
                  className="install-progress-fill" 
                  style={{ width: `${installProgress.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Installed State - Show Menu */}
          {isCliInstalled && !isInstalling && (
            <>
              {/* Quick Actions */}
              <div className="arduino-quick-actions">
                <button 
                  className="action-btn verify" 
                  onClick={handleVerify}
                  disabled={isBuilding}
                  title="Verify (Ctrl+R)"
                >
                  <span>✓</span> Verify
                </button>
                <button 
                  className="action-btn upload" 
                  onClick={handleUpload}
                  disabled={isBuilding}
                  title="Upload (Ctrl+U)"
                >
                  <span>→</span> Upload
                </button>
                <button 
                  className="action-btn serial" 
                  onClick={handleSerialMonitor}
                  title="Serial Monitor (Ctrl+Shift+M)"
                >
                  <span>📟</span> Serial
                </button>
              </div>

              <div className="arduino-separator" />

              {/* Board Selection */}
              <div className="arduino-menu-item" onClick={() => setShowBoardSelector(true)}>
                <span className="item-icon">🎛️</span>
                <span className="item-label">
                  {selectedBoard ? selectedBoard.board_name : 'Select Board...'}
                </span>
                <span className="item-arrow">›</span>
              </div>

              {/* Port Selection */}
              <div className="arduino-menu-item" onClick={() => setShowPortSelector(true)}>
                <span className="item-icon">🔌</span>
                <span className="item-label">
                  {selectedPort ? `Port: ${selectedPort}` : 'Select Port...'}
                </span>
                <span className="item-arrow">›</span>
              </div>

              <div className="arduino-separator" />

              {/* Library Manager */}
              <div className="arduino-menu-item">
                <span className="item-icon">📚</span>
                <span className="item-label">Manage Libraries...</span>
              </div>

              {/* Board Manager */}
              <div className="arduino-menu-item">
                <span className="item-icon">📦</span>
                <span className="item-label">Board Manager...</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Board Selector Modal */}
      {showBoardSelector && (
        <div className="arduino-modal-overlay" onClick={() => setShowBoardSelector(false)}>
          <div className="arduino-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Select Board</h3>
              <button className="modal-close" onClick={() => setShowBoardSelector(false)}>×</button>
            </div>
            <div className="modal-body">
              {boards.length === 0 ? (
                <div className="no-boards">
                  No boards detected. Connect an Arduino and click refresh.
                </div>
              ) : (
                <div className="board-list">
                  {boards.map((board, i) => (
                    <div
                      key={i}
                      className={`board-item ${selectedBoard?.fqbn === board.fqbn ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedBoard(board);
                        setSelectedPort(board.port);
                        setShowBoardSelector(false);
                      }}
                    >
                      <div className="board-name">{board.board_name}</div>
                      <div className="board-info">
                        <span>{board.port}</span>
                        <span>{board.fqbn}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={checkArduinoCLI}>🔄 Refresh</button>
            </div>
          </div>
        </div>
      )}

      {/* Port Selector Modal */}
      {showPortSelector && (
        <div className="arduino-modal-overlay" onClick={() => setShowPortSelector(false)}>
          <div className="arduino-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Select Port</h3>
              <button className="modal-close" onClick={() => setShowPortSelector(false)}>×</button>
            </div>
            <div className="modal-body">
              {ports.length === 0 ? (
                <div className="no-ports">
                  No compatible ports found. Connect an Arduino device.
                </div>
              ) : (
                <div className="port-list">
                  {ports.map((port, i) => (
                    <div
                      key={i}
                      className={`port-item ${selectedPort === port.port_name ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedPort(port.port_name);
                        setShowPortSelector(false);
                      }}
                    >
                      <div className="port-name">{port.port_name}</div>
                      <div className="port-chip">{port.chip_type}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isMenuOpen && (
        <div className="arduino-backdrop" onClick={() => setIsMenuOpen(false)} />
      )}
    </div>
  );
};

// ================================
// STYLES
// ================================

export const ArduinoBuildMenuStyles = `
.arduino-build-menu {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.arduino-menu-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: #2d2d2d;
  border: 1px solid #404040;
  border-radius: 4px;
  color: #cccccc;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.arduino-menu-button:hover {
  background: #3c3c3c;
  border-color: #00979d;
}

.arduino-menu-button.active {
  background: #00979d;
  color: white;
}

.arduino-menu-button.building {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.arduino-icon {
  font-size: 14px;
}

.arduino-label {
  font-weight: 500;
}

.arduino-version {
  opacity: 0.7;
  font-size: 11px;
}

.arduino-warning {
  color: #f0ad4e;
}

.arduino-arrow {
  font-size: 10px;
  opacity: 0.6;
}

.arduino-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  min-width: 280px;
  background: #252526;
  border: 1px solid #404040;
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 1000;
  overflow: hidden;
}

.arduino-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}

/* Install Prompt */
.arduino-install-prompt {
  padding: 20px;
  text-align: center;
}

.install-icon {
  font-size: 32px;
  margin-bottom: 10px;
}

.install-message {
  color: #cccccc;
  margin-bottom: 15px;
}

.install-message small {
  opacity: 0.7;
}

.install-button {
  padding: 8px 20px;
  background: #00979d;
  border: none;
  border-radius: 4px;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.install-button:hover {
  background: #00b4bd;
}

/* Installing State */
.arduino-installing {
  padding: 20px;
  text-align: center;
}

.install-spinner {
  font-size: 24px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.install-stage {
  font-weight: 500;
  color: #00979d;
  margin: 10px 0 5px;
  text-transform: capitalize;
}

.install-progress-bar {
  height: 4px;
  background: #404040;
  border-radius: 2px;
  margin-top: 15px;
  overflow: hidden;
}

.install-progress-fill {
  height: 100%;
  background: #00979d;
  transition: width 0.3s ease;
}

/* Quick Actions */
.arduino-quick-actions {
  display: flex;
  padding: 8px;
  gap: 6px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px;
  background: #2d2d2d;
  border: 1px solid #404040;
  border-radius: 4px;
  color: #cccccc;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.action-btn:hover:not(:disabled) {
  background: #3c3c3c;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.verify:hover:not(:disabled) {
  border-color: #4ec9b0;
  color: #4ec9b0;
}

.action-btn.upload:hover:not(:disabled) {
  border-color: #00979d;
  color: #00979d;
}

.action-btn.serial:hover:not(:disabled) {
  border-color: #dcdcaa;
  color: #dcdcaa;
}

/* Menu Items */
.arduino-separator {
  height: 1px;
  background: #404040;
  margin: 4px 0;
}

.arduino-menu-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.1s;
}

.arduino-menu-item:hover {
  background: #2d2d2d;
}

.item-icon {
  width: 24px;
  text-align: center;
  margin-right: 8px;
}

.item-label {
  flex: 1;
  color: #cccccc;
  font-size: 13px;
}

.item-arrow {
  color: #808080;
}

/* Modals */
.arduino-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.arduino-modal {
  width: 400px;
  max-height: 80vh;
  background: #252526;
  border: 1px solid #404040;
  border-radius: 8px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #2d2d2d;
  border-bottom: 1px solid #404040;
}

.modal-header h3 {
  margin: 0;
  font-size: 14px;
  color: #cccccc;
}

.modal-close {
  background: none;
  border: none;
  color: #808080;
  font-size: 20px;
  cursor: pointer;
}

.modal-close:hover {
  color: #cccccc;
}

.modal-body {
  padding: 16px;
  max-height: 400px;
  overflow-y: auto;
}

.modal-footer {
  padding: 12px 16px;
  background: #2d2d2d;
  border-top: 1px solid #404040;
  text-align: right;
}

.modal-footer button {
  padding: 6px 16px;
  background: #3c3c3c;
  border: 1px solid #555;
  border-radius: 4px;
  color: #cccccc;
  cursor: pointer;
}

.modal-footer button:hover {
  background: #4c4c4c;
}

/* Board/Port Lists */
.no-boards, .no-ports {
  padding: 20px;
  text-align: center;
  color: #808080;
}

.board-list, .port-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.board-item, .port-item {
  padding: 12px;
  background: #2d2d2d;
  border: 1px solid #404040;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.board-item:hover, .port-item:hover {
  background: #3c3c3c;
  border-color: #555;
}

.board-item.selected, .port-item.selected {
  border-color: #00979d;
  background: rgba(0, 151, 157, 0.1);
}

.board-name, .port-name {
  font-weight: 500;
  color: #cccccc;
  margin-bottom: 4px;
}

.board-info {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #808080;
}

.port-chip {
  font-size: 12px;
  color: #00979d;
}
`;

export default ArduinoBuildMenu;
