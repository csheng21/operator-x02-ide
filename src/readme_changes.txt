# Deepseek Code IDE

A modern, TypeScript-based integrated development environment with AI assistance capabilities.

## Overview

Deepseek Code IDE is a feature-rich desktop application built with TypeScript and Tauri that provides a comprehensive coding environment with integrated AI assistant functionality. The application combines a powerful code editor powered by Monaco, a file explorer, terminal integration, and an AI-powered chat assistant to create a unified development experience.

## Key Features

- **Modern Code Editor**: Powered by Monaco editor with syntax highlighting for multiple languages
- **File Explorer**: Navigate and manage project files and folders with intuitive controls
- **File Operations**: Create, open, save, and remove files and directories easily
- **Integrated Terminal**: Execute commands directly within the IDE
- **AI Assistant**: Integrated Deepseek AI for coding assistance and queries
- **Project Management**: Create and manage coding projects from various templates
- **Cross-Platform**: Works on desktop via Tauri and in browser environments
- **Theme Support**: Dark and light theme modes
- **Keyboard Shortcuts**: Common operations accessible via familiar shortcuts

## Architecture

The application is organized into several core modules:

### Main App Structure

```
src/
├── main.ts                  # Application entry point
├── state.ts                 # Application state management
├── store.ts                 # Alternative state management approach
├── types.ts                 # Core type definitions
├── styles.css               # Global styling
├── ui.ts                    # UI rendering functions
├── events.ts                # Event handler registration
├── conversation.ts          # AI conversation handling
├── fileSystem.ts            # File system abstraction layer
```

### File Operations

```
src/
├── fileOperations.ts                     # Main entry point for file operations
│
├── fileOperations/                       # Feature-specific operations
│   ├── saveHandler.ts                    # Save-related functionality
│   ├── openHandler.ts                    # Open-related functionality
│   ├── removeHandler.ts                  # Remove files/projects functionality 
│   └── uiUpdater.ts                      # UI update utilities
│
├── utils/                                # Shared utilities
│   ├── fileUtils.ts                      # File-related utilities
│   └── platformDetection.ts              # Platform detection utilities
```

### IDE Components

```
src/ide/
├── aiAssistant/             # AI integration components
├── fileExplorer/            # File exploration and management
├── projectCreation/         # Project creation wizard
│   ├── services/            # Project generation services
│   └── ui/                  # Project creation UI
├── terminal/                # Terminal implementation
├── clearFiles.ts            # Utility for clearing file explorer
├── explorerButtons.ts       # File explorer button handling
├── fileExplorer.ts          # File explorer orchestration
├── initialize.ts            # IDE initialization
├── layout.ts                # UI layout management
├── projectState.ts          # Project state management
└── terminal.ts              # Terminal implementation
```

## Technologies

- **TypeScript**: For type-safe JavaScript development
- **Monaco Editor**: Powering the code editor functionality
- **Tauri**: Creating desktop applications with web technologies
- **Vite**: Fast build tooling for modern web development
- **TensorFlow.js**: ML capabilities for intelligent features
- **Tesseract.js**: OCR text recognition from images

## Installation and Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Rust (for Tauri development)

### Development Setup

1. Clone the repository
2. Install dependencies
   ```bash
   npm install
   ```
3. Run the development server
   ```bash
   npm run dev
   ```
4. For desktop development with Tauri:
   ```bash
   npm run tauri dev
   ```

### Building for Production

```bash
# Web build
npm run build

# Desktop build
npm run tauri build
```

## Usage

### Editor Features

- **File Management**: Create, open, save, and remove files with keyboard shortcuts:
  - `Ctrl+N`: Create new file
  - `Ctrl+O`: Open file
  - `Ctrl+S`: Save file
  - `Ctrl+Shift+S`: Save file as
  - Right-click on files/folders to see context menu with delete options
- **Multiple Language Support**: Syntax highlighting for TypeScript, JavaScript, Python, HTML, CSS, and more
- **Terminal Integration**: Run commands directly within the IDE
- **Project Templates**: Create new projects from various templates

### File and Project Management

- **File Explorer**: Navigate through your project files with the file tree
- **File Operations**: Create, open, edit, save, and remove files
- **Project Management**: Create new projects from templates, manage and remove existing projects
- **Context Menu**: Right-click on files or folders to access operations like removal
- **Cross-Platform Support**: Works in both desktop and browser environments

### AI Assistant

The AI Assistant panel provides:
- **Code Help**: Ask questions about your code
- **Suggestions**: Get recommendations for improvements
- **Documentation**: Access information about APIs and libraries
- **Problem-solving**: Describe issues and get potential solutions

## Configuration

### API Settings

To connect with Deepseek AI, configure your API key in the settings:
1. Click the settings icon
2. Enter your Deepseek API key
3. Modify the API base URL if needed (defaults to `https://api.deepseek.com/v1`)

### Theme Settings

The application includes a dark theme by default, with CSS variables defined in `styles.css` that can be customized.
You can switch between dark and light themes in the settings.

## Project Structure

Projects created with the IDE typically follow standard structures based on the selected template.
The file explorer provides navigation through the project files and directories.

## Cross-Platform Compatibility

Deepseek Code IDE is designed to work in multiple environments:

- **Desktop**: Full-featured application built with Tauri
- **Browser**: Web-based version with graceful fallbacks for file operations

The application provides consistent behavior across platforms with environment-specific implementations:

- **Native File System**: Uses Tauri's file system APIs for real file access on desktop
- **Mock File System**: In-memory file system for browser environments with LocalStorage persistence

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.