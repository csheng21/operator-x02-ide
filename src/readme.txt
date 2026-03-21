# Deepseek Code IDE

A modern, feature-rich integrated development environment built with TypeScript that combines code editing capabilities with AI-powered assistance.

## Overview

Deepseek Code IDE is a desktop application (with browser compatibility) that provides a comprehensive development environment with integrated AI assistance. The application is built using TypeScript and leverages the Monaco editor for code editing, while providing additional features like file management, terminal integration, and AI-powered chat assistance.

## Features

- **Modern Editor**: Powered by Monaco editor with syntax highlighting for multiple languages
- **File Explorer**: Navigate and manage project files with an intuitive file tree
- **Terminal Integration**: Built-in terminal for executing commands
- **AI Assistant**: Integrated Deepseek AI for coding assistance and queries
- **File Operations**: Open, edit, and save files with keyboard shortcuts
- **Project Templates**: Create new projects from various templates
- **Cross-Platform**: Works on desktop via Tauri and in browser environments

## Project Structure

```
src/
├── assets/                  # Static assets like images and icons
├── dialogs/                 # Dialog UI components
├── directFileOpener/        # Direct file handling system
│   ├── content/             # Content generation for file preview
│   ├── handlers/            # Event handlers for file operations
│   └── monaco/              # Monaco editor integration
├── editor/                  # Code editor configuration
├── eventHandlers/           # Event handling for UI interactions
│   └── fileHandlers/        # File-specific event handlers
├── ide/                     # Core IDE components
│   ├── aiAssistant/         # AI assistant integration
│   ├── fileExplorer/        # File explorer UI and functionality
│   ├── projectCreation/     # Project creation wizard
│   │   ├── services/        # Project generation services
│   │   └── ui/              # Project creation UI
│   └── terminal/            # Terminal implementation
├── types/                   # TypeScript type definitions
└── utils/                   # Utility functions
```

## Core Files

- `main.ts`: Application entry point
- `ui.ts`: UI rendering and DOM management
- `state.ts`: Application state management
- `store.ts`: Alternative state management approach
- `conversation.ts`: AI conversation handling
- `fileSystem.ts`: File system operations
- `fileOperations.ts`: File handling operations
- `directFileOpener.ts`: Direct file access system
- `types.ts`: TypeScript type definitions

## Technical Details

### State Management

The application uses a dual approach to state management:
- Direct state variables with mutation functions in `state.ts`
- Encapsulated state with getters/setters in `store.ts`

Both systems use localStorage for data persistence.

### File System Handling

The application supports two file system interfaces:
1. **Tauri API**: For desktop environments with native file system access
2. **Browser Fallback**: For web-based usage with mock file system

### Editor Integration

Monaco editor is used for code editing with:
- Syntax highlighting for multiple languages
- Custom themes
- Keyboard shortcuts
- Status bar integration

### AI Assistant

The Deepseek AI integration provides:
- Conversational interface for coding questions
- Command execution via `/cmd` and `/ps` prefixes
- File upload and analysis
- Context-aware responses

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Tauri setup (for desktop builds)

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Run the development server:
   ```
   npm run dev
   ```
4. For desktop builds:
   ```
   npm run tauri:dev
   ```

### Building for Production

```
# Web build
npm run build

# Desktop build
npm run tauri:build
```

## Configuration

### API Settings

To connect with Deepseek AI, configure your API key in the settings:
1. Click the settings icon
2. Enter your Deepseek API key
3. Modify the API base URL if needed (defaults to `https://api.deepseek.com/v1`)

### Theming

The application includes a dark theme by default, with CSS variables defined in `styles.css` that can be customized.

## License

[MIT License](LICENSE)