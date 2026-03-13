# Deepseek IDE Module

The IDE module is a core component of the Deepseek Code IDE, providing the integrated development environment functionality for coding, file management, and terminal operations.

## Overview

This module implements a comprehensive development environment with several key components:

- **File Explorer**: Tree-based file navigation with support for directory operations
- **Code Editor**: Monaco-based code editing with syntax highlighting and language support
- **Terminal**: Command-line interface with CMD and PowerShell support
- **Project Management**: Tools for creating and managing coding projects
- **UI Framework**: Resizable panels, tabs, and modern UI elements

## Module Structure

```
ide/
├── aiAssistant/            # AI integration components
│   └── assistantUI.ts      # UI for the AI assistant panel
├── fileExplorer/           # File exploration and management
│   ├── fileClickHandlers.ts  # Event handlers for file interaction
│   ├── fileIconUtils.ts      # File icon selection based on file type
│   ├── fileLoader.ts         # File loading and project structure management
│   ├── fileTreeRenderer.ts   # File tree UI rendering
│   ├── index.ts              # Main entry point for file explorer
│   ├── readme.txt            # Documentation for the file explorer
│   └── types.ts              # Type definitions for file explorer
├── projectCreation/        # Project creation wizard
│   ├── index.ts              # Entry point for project creation
│   ├── projectOptions.ts     # Project template options
│   ├── readme.txt            # Documentation for project creation
│   ├── templates.ts          # Project templates definitions
│   ├── types.ts              # Type definitions for projects
│   ├── services/             # Backend services for project creation
│   │   ├── fileUtils.ts        # File utilities for project creation
│   │   ├── mockFileSystem.ts   # Mock file system for development
│   │   └── projectGenerator.ts # Project generation logic
│   └── ui/                   # UI components for project creation
│       ├── formHandlers.ts     # Form event handlers
│       ├── menuHandlers.ts     # Menu event handlers
│       ├── modalHandlers.ts    # Modal dialog handlers
│       ├── projectSummary.ts   # Project summary view
│       └── templateUI.ts       # Template selection UI
├── terminal/              # Terminal implementation
│   ├── index.ts            # Entry point for terminal module
│   ├── terminal.css        # Terminal-specific styles
│   ├── terminalComponent.ts # Terminal UI component
│   └── terminalManager.ts  # Terminal operation management
├── clearFiles.ts         # Utility for clearing file explorer
├── explorerButtons.ts    # File explorer button handling
├── fileExplorer.ts       # File explorer orchestration
├── initialize.ts         # IDE initialization
├── layout.ts             # UI layout management
├── projectState.ts       # Project state management
└── terminal.ts           # Terminal implementation
```

## Core Features

### File Explorer

The file explorer provides navigation through project files and folders with the following functionality:

- Tree view of files and directories
- File icons based on file type
- Context menu for file operations
- New file/folder creation
- Empty state handling when no project is open

Key files:
- `fileExplorer.ts`: Main entry point for file explorer functionality
- `fileExplorer/fileTreeRenderer.ts`: Renders the file tree UI
- `fileExplorer/fileClickHandlers.ts`: Handles file and directory click events
- `clearFiles.ts`: Manages the empty state when no files are loaded

### Terminal

The terminal component provides a command-line interface with these features:

- Support for both CMD and PowerShell
- Command history navigation
- Enhanced output formatting
- Collapsible and scrollable output
- Copy to clipboard functionality
- Resizable terminal panel

Key files:
- `terminal.ts`: Main terminal implementation
- `terminal/terminalComponent.ts`: Terminal UI component
- `terminal/terminalManager.ts`: Manages terminal operations

### Layout Management

The layout system provides the UI framework for the IDE with:

- Resizable panels (explorer, editor, terminal, assistant)
- Tab management for files and terminal views
- Status bar with information display
- Theme switching support
- Context menu system

Key file:
- `layout.ts`: Contains layout initialization and management functions

### Project Management

The project system handles project creation and management:

- Project templates for various application types
- Project state tracking
- Empty state handling when no project is open
- Project creation wizard

Key files:
- `projectState.ts`: Manages project state
- `projectCreation/index.ts`: Entry point for project creation
- `projectCreation/templates.ts`: Defines available project templates

## Usage

The IDE module is initialized through the following call sequence:

```typescript
// Initialize IDE components
initializeIdeComponents();

// Initialize project state
initializeProjectState();

// Initialize layout
initializeLayout();
```

## Integration with Main Application

The IDE module integrates with the main application through:

1. DOM element access via IDs and class selectors
2. Custom events for communication between components
3. Shared state management
4. File system abstraction for browser and desktop environments

## Extension Points

The IDE module can be extended through:

- Adding new project templates in `projectCreation/templates.ts`
- Adding language support in various handlers (e.g., `directFileOpenerUtils.ts`)
- Expanding terminal capabilities in `terminal.ts`
- Adding new UI components to the layout in `layout.ts`

## Development Notes

- The application supports both browser-based usage and desktop usage via Tauri
- Mock implementations are provided for browser development
- Real file system access is available in desktop mode
- The Monaco editor is loaded dynamically and needs to be available for code editing

## Dependencies

- Monaco Editor for code editing
- Tauri (optional) for desktop integration
- Web APIs for browser compatibility

## Future Improvements

- Git integration
- Debugger support
- Task running system
- Settings management
- Extension API