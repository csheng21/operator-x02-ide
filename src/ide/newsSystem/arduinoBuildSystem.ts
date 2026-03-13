// src/ide/arduino/arduinoBuildSystem.ts
// Arduino Build System Integration - Shows in menu bar like npm/Node.js
// Auto-detects Arduino projects and handles CLI installation

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

// ================================
// TYPES
// ================================

export interface ArduinoBuildSystem {
  id: string;
  name: string;
  icon: string;
  isInstalled: boolean;
  version?: string;
  boards: ArduinoBoard[];
  selectedBoard?: ArduinoBoard;
  selectedPort?: string;
}

export interface ArduinoBoard {
  port: string;
  fqbn: string;
  board_name: string;
  core: string;
  protocol: string;
}

export interface ArduinoProjectConfig {
  type: 'arduino' | 'esp32' | 'esp8266' | 'stm32';
  board?: string;
  fqbn?: string;
  port?: string;
  libraries?: string[];
}

export interface InstallProgress {
  stage: string;
  progress: number;
  message: string;
}

// ================================
// ARDUINO BUILD SYSTEM DETECTOR
// ================================

/**
 * Detect if current project is an Arduino project
 */
export function detectArduinoProject(projectPath: string, files: string[]): ArduinoProjectConfig | null {
  // Check for .ino files (Arduino sketch)
  const hasInoFile = files.some(f => f.endsWith('.ino'));
  
  // Check for platformio.ini (PlatformIO project)
  const hasPlatformIO = files.includes('platformio.ini');
  
  // Check for arduino.json or .arduino folder
  const hasArduinoConfig = files.includes('arduino.json') || files.includes('.arduino');
  
  // Check for sketch.yaml (Arduino CLI project)
  const hasSketchYaml = files.includes('sketch.yaml');
  
  if (hasInoFile || hasArduinoConfig || hasSketchYaml) {
    // Determine project type from config or folder name
    const projectName = projectPath.split(/[/\\]/).pop()?.toLowerCase() || '';
    
    if (projectName.includes('esp32') || hasPlatformIO) {
      return { type: 'esp32' };
    } else if (projectName.includes('esp8266')) {
      return { type: 'esp8266' };
    } else if (projectName.includes('stm32')) {
      return { type: 'stm32' };
    }
    
    return { type: 'arduino' };
  }
  
  return null;
}

/**
 * Get build system info for menu display
 */
export async function getArduinoBuildSystem(): Promise<ArduinoBuildSystem> {
  let isInstalled = false;
  let version: string | undefined;
  let boards: ArduinoBoard[] = [];
  
  try {
    // Check if Arduino CLI is installed
    const result: any = await invoke('arduino_check_cli');
    isInstalled = result.success;
    
    if (isInstalled) {
      // Extract version from output
      const versionMatch = result.stdout.match(/Version:\s*([\d.]+)/);
      version = versionMatch ? versionMatch[1] : 'installed';
      
      // Get connected boards
      try {
        boards = await invoke('arduino_list_boards') as ArduinoBoard[];
      } catch (e) {
        console.warn('Failed to list boards:', e);
      }
    }
  } catch (e) {
    console.warn('Arduino CLI not found:', e);
  }
  
  return {
    id: 'arduino',
    name: 'Arduino',
    icon: '🔌',
    isInstalled,
    version,
    boards,
  };
}

// ================================
// AUTO-INSTALLER
// ================================

/**
 * Check and prompt for Arduino CLI installation
 */
export async function checkAndInstallArduinoCLI(
  onProgress?: (progress: InstallProgress) => void
): Promise<boolean> {
  // Check if already installed
  try {
    const result: any = await invoke('arduino_check_cli');
    if (result.success) {
      return true; // Already installed
    }
  } catch (e) {
    // Not installed, continue to install
  }
  
  onProgress?.({ stage: 'checking', progress: 0, message: 'Arduino CLI not found. Starting installation...' });
  
  // Try to install using winget (Windows)
  try {
    onProgress?.({ stage: 'downloading', progress: 20, message: 'Installing Arduino CLI via winget...' });
    
    const installResult: any = await invoke('execute_command', {
      command: 'winget install ArduinoSA.CLI --accept-source-agreements --accept-package-agreements',
      workingDir: null,
      isPowershell: true,
    });
    
    if (installResult.success) {
      onProgress?.({ stage: 'configuring', progress: 80, message: 'Initializing Arduino CLI...' });
      
      // Initialize config
      await invoke('arduino_init_config');
      
      // Update core index
      await invoke('arduino_update_core_index');
      
      onProgress?.({ stage: 'complete', progress: 100, message: 'Arduino CLI installed successfully!' });
      return true;
    }
  } catch (e) {
    console.error('winget install failed:', e);
  }
  
  // If winget fails, show manual instructions
  onProgress?.({ 
    stage: 'manual', 
    progress: 0, 
    message: 'Automatic installation failed. Please install manually from: https://arduino.github.io/arduino-cli/' 
  });
  
  return false;
}

/**
 * Install required core for board type
 */
export async function installRequiredCore(
  projectType: 'arduino' | 'esp32' | 'esp8266' | 'stm32',
  onProgress?: (progress: InstallProgress) => void
): Promise<boolean> {
  const coreMap: Record<string, { core: string; url?: string; name: string }> = {
    arduino: { 
      core: 'arduino:avr', 
      name: 'Arduino AVR' 
    },
    esp32: { 
      core: 'esp32:esp32', 
      url: 'https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json',
      name: 'ESP32' 
    },
    esp8266: { 
      core: 'esp8266:esp8266', 
      url: 'http://arduino.esp8266.com/stable/package_esp8266com_index.json',
      name: 'ESP8266' 
    },
    stm32: { 
      core: 'STMicroelectronics:stm32', 
      url: 'https://github.com/stm32duino/BoardManagerFiles/raw/main/package_stmicroelectronics_index.json',
      name: 'STM32' 
    },
  };
  
  const config = coreMap[projectType];
  if (!config) return false;
  
  try {
    // Check if core is already installed
    onProgress?.({ stage: 'checking', progress: 10, message: `Checking ${config.name} core...` });
    
    const coresResult: any = await invoke('arduino_list_cores');
    const isInstalled = coresResult.some?.((c: any) => c.id === config.core);
    
    if (isInstalled) {
      onProgress?.({ stage: 'complete', progress: 100, message: `${config.name} core already installed` });
      return true;
    }
    
    // Add board URL if needed
    if (config.url) {
      onProgress?.({ stage: 'configuring', progress: 20, message: `Adding ${config.name} board URL...` });
      await invoke('arduino_add_board_url', { url: config.url });
      
      onProgress?.({ stage: 'updating', progress: 40, message: 'Updating board index...' });
      await invoke('arduino_update_core_index');
    }
    
    // Install core
    onProgress?.({ stage: 'installing', progress: 60, message: `Installing ${config.name} core (this may take a few minutes)...` });
    const installResult: any = await invoke('arduino_install_core', { core: config.core });
    
    if (installResult.success) {
      onProgress?.({ stage: 'complete', progress: 100, message: `${config.name} core installed successfully!` });
      return true;
    } else {
      onProgress?.({ stage: 'error', progress: 0, message: `Failed to install ${config.name} core: ${installResult.stderr}` });
      return false;
    }
  } catch (e) {
    onProgress?.({ stage: 'error', progress: 0, message: `Error: ${e}` });
    return false;
  }
}

// ================================
// BUILD MENU ITEMS
// ================================

export interface BuildMenuItem {
  id: string;
  label: string;
  icon: string;
  shortcut?: string;
  action: () => Promise<void>;
  disabled?: boolean;
  separator?: boolean;
}

/**
 * Get Arduino build menu items (replaces npm menu when Arduino project detected)
 */
export function getArduinoBuildMenuItems(
  config: ArduinoProjectConfig,
  selectedBoard?: ArduinoBoard,
  selectedPort?: string,
  onAction?: (action: string, result: any) => void
): BuildMenuItem[] {
  const hasBoard = !!selectedBoard?.fqbn;
  const hasPort = !!selectedPort;
  
  return [
    {
      id: 'verify',
      label: 'Verify / Compile',
      icon: '✓',
      shortcut: 'Ctrl+R',
      disabled: !hasBoard,
      action: async () => {
        if (!selectedBoard?.fqbn) return;
        const result = await invoke('arduino_compile', {
          sketchPath: '.', // Current project
          fqbn: selectedBoard.fqbn,
        });
        onAction?.('verify', result);
      },
    },
    {
      id: 'upload',
      label: 'Upload',
      icon: '→',
      shortcut: 'Ctrl+U',
      disabled: !hasBoard || !hasPort,
      action: async () => {
        if (!selectedBoard?.fqbn || !selectedPort) return;
        const result = await invoke('arduino_compile_and_upload', {
          sketchPath: '.',
          port: selectedPort,
          fqbn: selectedBoard.fqbn,
        });
        onAction?.('upload', result);
      },
    },
    {
      id: 'separator1',
      label: '',
      icon: '',
      separator: true,
      action: async () => {},
    },
    {
      id: 'serial-monitor',
      label: 'Serial Monitor',
      icon: '📟',
      shortcut: 'Ctrl+Shift+M',
      disabled: !hasPort,
      action: async () => {
        onAction?.('serial-monitor', { port: selectedPort });
      },
    },
    {
      id: 'separator2',
      label: '',
      icon: '',
      separator: true,
      action: async () => {},
    },
    {
      id: 'select-board',
      label: selectedBoard ? `Board: ${selectedBoard.board_name}` : 'Select Board...',
      icon: '🎛️',
      action: async () => {
        onAction?.('select-board', null);
      },
    },
    {
      id: 'select-port',
      label: selectedPort ? `Port: ${selectedPort}` : 'Select Port...',
      icon: '🔌',
      action: async () => {
        onAction?.('select-port', null);
      },
    },
    {
      id: 'separator3',
      label: '',
      icon: '',
      separator: true,
      action: async () => {},
    },
    {
      id: 'library-manager',
      label: 'Manage Libraries...',
      icon: '📚',
      action: async () => {
        onAction?.('library-manager', null);
      },
    },
    {
      id: 'board-manager',
      label: 'Board Manager...',
      icon: '📦',
      action: async () => {
        onAction?.('board-manager', null);
      },
    },
  ];
}

// ================================
// PROJECT TEMPLATES
// ================================

export const ARDUINO_TEMPLATES = {
  arduino: {
    name: 'Arduino',
    description: 'Arduino project',
    icon: '🔧',
    defaultBoard: 'arduino:avr:uno',
    files: {
      '{{name}}.ino': `// {{name}}.ino
// Arduino Project
// Created by Operator X02 Code IDE

void setup() {
  // Initialize serial communication
  Serial.begin(9600);
  
  // Initialize built-in LED
  pinMode(LED_BUILTIN, OUTPUT);
  
  Serial.println("{{name}} started!");
}

void loop() {
  // Blink LED
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);
  
  Serial.println("Hello from {{name}}!");
}
`,
      'README.md': `# {{name}}

Arduino project created with Operator X02 Code IDE.

## Getting Started

1. Select your board from the Arduino menu
2. Select the COM port
3. Click Upload (Ctrl+U)

## Board

- **Default Board**: Arduino Uno
- **FQBN**: arduino:avr:uno
`,
    },
  },
  
  esp32: {
    name: 'ESP32',
    description: 'ESP32 IoT project',
    icon: '📡',
    defaultBoard: 'esp32:esp32:esp32',
    files: {
      '{{name}}.ino': `// {{name}}.ino
// ESP32 IoT Project
// Created by Operator X02 Code IDE

#include <WiFi.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("{{name}} - ESP32 Starting...");
  
  // Initialize built-in LED (GPIO 2 on most ESP32 boards)
  pinMode(2, OUTPUT);
  
  // Connect to WiFi
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.println("WiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // Blink LED
  digitalWrite(2, HIGH);
  delay(1000);
  digitalWrite(2, LOW);
  delay(1000);
  
  // Print heap memory info
  Serial.printf("Free heap: %d bytes\\n", ESP.getFreeHeap());
}
`,
      'README.md': `# {{name}}

ESP32 IoT project created with Operator X02 Code IDE.

## Setup

1. Install ESP32 board support (automatic on first build)
2. Update WiFi credentials in the sketch
3. Select "ESP32 Dev Module" from board menu
4. Upload!

## Board

- **Default Board**: ESP32 Dev Module
- **FQBN**: esp32:esp32:esp32

## Features

- WiFi connectivity
- Built-in LED blink
- Serial debugging
`,
    },
  },
  
  esp8266: {
    name: 'ESP8266',
    description: 'ESP8266 WiFi project',
    icon: '📶',
    defaultBoard: 'esp8266:esp8266:nodemcuv2',
    files: {
      '{{name}}.ino': `// {{name}}.ino
// ESP8266 WiFi Project
// Created by Operator X02 Code IDE

#include <ESP8266WiFi.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("{{name}} - ESP8266 Starting...");
  
  // Initialize built-in LED (active LOW on NodeMCU)
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH); // Turn off
  
  // Connect to WiFi
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN)); // Blink while connecting
  }
  
  digitalWrite(LED_BUILTIN, LOW); // Turn on when connected
  
  Serial.println();
  Serial.println("WiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // Blink LED
  digitalWrite(LED_BUILTIN, LOW);  // ON
  delay(1000);
  digitalWrite(LED_BUILTIN, HIGH); // OFF
  delay(1000);
  
  Serial.printf("Free heap: %d bytes\\n", ESP.getFreeHeap());
}
`,
      'README.md': `# {{name}}

ESP8266 project created with Operator X02 Code IDE.

## Setup

1. Install ESP8266 board support (automatic on first build)
2. Update WiFi credentials in the sketch
3. Select "NodeMCU 1.0 (ESP-12E Module)" from board menu
4. Upload!

## Board

- **Default Board**: NodeMCU 1.0
- **FQBN**: esp8266:esp8266:nodemcuv2
`,
    },
  },
};

// ================================
// CREATE PROJECT
// ================================

/**
 * Create Arduino project from template
 */
export async function createArduinoProject(
  projectName: string,
  projectPath: string,
  templateType: 'arduino' | 'esp32' | 'esp8266',
  onProgress?: (progress: InstallProgress) => void
): Promise<boolean> {
  const template = ARDUINO_TEMPLATES[templateType];
  if (!template) {
    throw new Error(`Unknown template: ${templateType}`);
  }
  
  try {
    // Step 1: Check Arduino CLI
    onProgress?.({ stage: 'checking', progress: 10, message: 'Checking Arduino CLI...' });
    
    const cliInstalled = await checkAndInstallArduinoCLI(onProgress);
    if (!cliInstalled) {
      return false;
    }
    
    // Step 2: Install required core
    onProgress?.({ stage: 'core', progress: 30, message: `Setting up ${template.name} support...` });
    
    const coreInstalled = await installRequiredCore(templateType, onProgress);
    if (!coreInstalled) {
      // Continue anyway, user can install later
      console.warn('Core installation failed, continuing...');
    }
    
    // Step 3: Create project directory
    onProgress?.({ stage: 'creating', progress: 70, message: 'Creating project files...' });
    
    await invoke('create_directory', { path: projectPath });
    
    // Step 4: Create files from template
    for (const [filename, content] of Object.entries(template.files)) {
      const finalFilename = filename.replace(/\{\{name\}\}/g, projectName);
      const finalContent = (content as string).replace(/\{\{name\}\}/g, projectName);
      const filePath = `${projectPath}/${finalFilename}`;
      
      await invoke('write_file_content', { path: filePath, content: finalContent });
    }
    
    // Step 5: Create arduino.json config
    const configContent = JSON.stringify({
      sketch: `${projectName}.ino`,
      board: template.defaultBoard,
      configuration: templateType === 'esp32' ? 'PSRAM=disabled,PartitionScheme=default' : undefined,
    }, null, 2);
    
    await invoke('write_file_content', { 
      path: `${projectPath}/arduino.json`, 
      content: configContent 
    });
    
    onProgress?.({ stage: 'complete', progress: 100, message: 'Project created successfully!' });
    return true;
    
  } catch (e) {
    onProgress?.({ stage: 'error', progress: 0, message: `Error: ${e}` });
    return false;
  }
}

// ================================
// EXPORTS
// ================================

export default {
  detectArduinoProject,
  getArduinoBuildSystem,
  checkAndInstallArduinoCLI,
  installRequiredCore,
  getArduinoBuildMenuItems,
  createArduinoProject,
  ARDUINO_TEMPLATES,
};
