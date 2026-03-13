// src/plugins/builtin/fletAssistant/index.ts

import { Plugin, PluginApi } from '../../core/pluginInterface';
import { detectFletErrors } from './src/errorDetector';
import { fixFletColors } from './src/colorFixer';
import { registerSnippets } from './src/snippets';
import { createComponentsPanel } from './src/componentsPanel';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface ComponentDefinition {
  name: string;
  snippet: string;
  description?: string;
  category?: string;
}

interface FletError {
  title: string;
  message: string;
  actions: Array<{
    title: string;
    callback: (api: PluginApi) => void;
  }>;
}

// ============================================================================
// PLUGIN DEFINITION
// ============================================================================

const fletAssistant: Plugin = {
  id: 'deepseek.flet-assistant',
  name: 'Flet Assistant',
  version: '1.0.0',
  description: 'Enhanced Flet development support for Deepseek IDE',
  author: 'Deepseek IDE',
  
  /**
   * Activate the plugin
   */
  async activate(api: PluginApi): Promise<void> {
    console.log('🚀 Flet Assistant plugin activated');
    
    try {
      // Store plugin ID in window to retrieve it later
      (window as any).__currentPluginId = 'deepseek.flet-assistant';
      
      // Register error detector for terminal output
      api.terminal?.on('output', (output: string, isError: boolean) => {
        const detectedError = detectFletErrors(output);
        if (detectedError) {
          showErrorNotification(api, detectedError);
        }
      });
      
      // Register commands
      registerCommands(api);
      
      // Register code snippets
      registerSnippets(api);
      
      // Create components panel
      api.ui?.registerView('fletComponentsView', () => createComponentsPanel(api));
      
      console.log('✅ Flet Assistant plugin activated successfully');
      
    } catch (error) {
      console.error('❌ Error activating Flet Assistant plugin:', error);
      throw error;
    }
  },
  
  /**
   * Deactivate the plugin
   */
  async deactivate(): Promise<void> {
    console.log('🛑 Flet Assistant plugin deactivated');
    
    try {
      // Clean up resources
      delete (window as any).__currentPluginId;
      
      // Remove any registered views
      const componentsPanel = document.getElementById('flet-components-panel');
      if (componentsPanel) {
        componentsPanel.remove();
      }
      
      console.log('✅ Flet Assistant plugin deactivated successfully');
      
    } catch (error) {
      console.error('❌ Error deactivating Flet Assistant plugin:', error);
    }
  }
};

// ============================================================================
// COMMAND REGISTRATION
// ============================================================================

/**
 * Register all plugin commands
 */
function registerCommands(api: PluginApi): void {
  console.log('📝 Registering Flet Assistant commands...');
  
  // Fix Flet colors command
  api.ui?.registerCommand(
    'fletAssistant.fixColors',
    'Fix Flet Colors',
    async () => {
      try {
        const editor = api.editor?.getActiveEditor();
        if (!editor) {
          api.ui?.showNotification({
            message: 'No active editor',
            type: 'error'
          });
          return;
        }
        
        const document = editor.getDocument();
        const text = document.getText();
        
        if (!text || text.trim().length === 0) {
          api.ui?.showNotification({
            message: 'No content to fix',
            type: 'warning'
          });
          return;
        }
        
        const fixed = fixFletColors(text);
        
        if (fixed === text) {
          api.ui?.showNotification({
            message: 'No color issues found',
            type: 'info'
          });
          return;
        }
        
        await document.setText(fixed);
        
        api.ui?.showNotification({
          message: 'Flet colors fixed successfully! 🎨',
          type: 'success'
        });
        
      } catch (error) {
        console.error('Error fixing Flet colors:', error);
        api.ui?.showNotification({
          message: 'Failed to fix Flet colors',
          type: 'error'
        });
      }
    }
  );
  
  // Insert component command
  api.ui?.registerCommand(
    'fletAssistant.insertComponent',
    'Insert Flet Component',
    () => {
      try {
        showComponentPicker(api);
      } catch (error) {
        console.error('Error showing component picker:', error);
        api.ui?.showNotification({
          message: 'Failed to show component picker',
          type: 'error'
        });
      }
    }
  );
  
  // Show components panel command
  api.ui?.registerCommand(
    'fletAssistant.showComponentsPanel',
    'Show Flet Components Panel',
    () => {
      try {
        api.ui?.showView('fletComponentsView');
      } catch (error) {
        console.error('Error showing components panel:', error);
        api.ui?.showNotification({
          message: 'Failed to show components panel',
          type: 'error'
        });
      }
    }
  );
  
  // Quick documentation command
  api.ui?.registerCommand(
    'fletAssistant.showDocs',
    'Show Flet Documentation',
    () => {
      window.open('https://flet.dev/docs', '_blank');
    }
  );
  
  // Create new Flet app command
  api.ui?.registerCommand(
    'fletAssistant.createApp',
    'Create New Flet App',
    async () => {
      await createNewFletApp(api);
    }
  );
  
  console.log('✅ Commands registered successfully');
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Show error notification with actions
 */
function showErrorNotification(api: PluginApi, error: FletError): void {
  try {
    api.ui?.showNotification({
      title: error.title,
      message: error.message,
      type: 'warning',
      actions: error.actions.map((action) => ({
        title: action.title,
        action: () => {
          try {
            action.callback(api);
          } catch (err) {
            console.error('Error executing action:', err);
          }
        }
      }))
    });
  } catch (err) {
    console.error('Error showing notification:', err);
  }
}

// ============================================================================
// COMPONENT PICKER
// ============================================================================

/**
 * Component definitions
 */
const FLET_COMPONENTS: ComponentDefinition[] = [
  // Layout Components
  {
    name: 'Column',
    snippet: 'ft.Column(\n\tcontrols=[\n\t\t${1:ft.Text("Item 1")},\n\t\t${2:ft.Text("Item 2")}\n\t],\n\talignment=ft.MainAxisAlignment.${3:START}\n)',
    description: 'Vertical layout container',
    category: 'Layout'
  },
  {
    name: 'Row',
    snippet: 'ft.Row(\n\tcontrols=[\n\t\t${1:ft.Text("Item 1")},\n\t\t${2:ft.Text("Item 2")}\n\t],\n\talignment=ft.MainAxisAlignment.${3:START}\n)',
    description: 'Horizontal layout container',
    category: 'Layout'
  },
  {
    name: 'Container',
    snippet: 'ft.Container(\n\tcontent=${1:None},\n\twidth=${2:200},\n\theight=${3:200},\n\tpadding=${4:10},\n\tborder_radius=${5:10}\n)',
    description: 'Container with styling',
    category: 'Layout'
  },
  {
    name: 'Stack',
    snippet: 'ft.Stack(\n\tcontrols=[\n\t\t${1:ft.Text("Background")},\n\t\t${2:ft.Text("Foreground")}\n\t]\n)',
    description: 'Overlapping layout',
    category: 'Layout'
  },
  
  // Text Components
  {
    name: 'Text',
    snippet: 'ft.Text(\n\t"${1:Text content}",\n\tsize=${2:16},\n\tweight=ft.FontWeight.${3:NORMAL},\n\tcolor=ft.colors.${4:BLACK}\n)',
    description: 'Display text',
    category: 'Text'
  },
  {
    name: 'Markdown',
    snippet: 'ft.Markdown(\n\t"${1:# Markdown Content}",\n\tselectable=True,\n\textension_set=ft.MarkdownExtensionSet.${2:GITHUB_WEB}\n)',
    description: 'Markdown content',
    category: 'Text'
  },
  
  // Input Components
  {
    name: 'TextField',
    snippet: 'ft.TextField(\n\tlabel="${1:Label}",\n\thint_text="${2:Enter text}",\n\tvalue="${3:}",\n\ton_change=${4:text_changed}\n)',
    description: 'Text input field',
    category: 'Input'
  },
  {
    name: 'Dropdown',
    snippet: 'ft.Dropdown(\n\tlabel="${1:Select option}",\n\toptions=[\n\t\tft.dropdown.Option("${2:Option 1}"),\n\t\tft.dropdown.Option("${3:Option 2}")\n\t],\n\ton_change=${4:dropdown_changed}\n)',
    description: 'Dropdown menu',
    category: 'Input'
  },
  {
    name: 'Checkbox',
    snippet: 'ft.Checkbox(\n\tlabel="${1:Checkbox}",\n\tvalue=${2:False},\n\ton_change=${3:checkbox_changed}\n)',
    description: 'Checkbox input',
    category: 'Input'
  },
  {
    name: 'Switch',
    snippet: 'ft.Switch(\n\tlabel="${1:Switch}",\n\tvalue=${2:False},\n\ton_change=${3:switch_changed}\n)',
    description: 'Toggle switch',
    category: 'Input'
  },
  {
    name: 'Slider',
    snippet: 'ft.Slider(\n\tmin=${1:0},\n\tmax=${2:100},\n\tvalue=${3:50},\n\tlabel="{value}",\n\ton_change=${4:slider_changed}\n)',
    description: 'Slider input',
    category: 'Input'
  },
  
  // Button Components
  {
    name: 'ElevatedButton',
    snippet: 'ft.ElevatedButton(\n\ttext="${1:Button}",\n\ticon=ft.icons.${2:ADD},\n\ton_click=${3:button_clicked}\n)',
    description: 'Elevated button',
    category: 'Button'
  },
  {
    name: 'TextButton',
    snippet: 'ft.TextButton(\n\ttext="${1:Button}",\n\ticon=ft.icons.${2:INFO},\n\ton_click=${3:button_clicked}\n)',
    description: 'Text button',
    category: 'Button'
  },
  {
    name: 'IconButton',
    snippet: 'ft.IconButton(\n\ticon=ft.icons.${1:ADD},\n\ticon_color=ft.colors.${2:BLUE},\n\ton_click=${3:button_clicked}\n)',
    description: 'Icon button',
    category: 'Button'
  },
  {
    name: 'FloatingActionButton',
    snippet: 'ft.FloatingActionButton(\n\ticon=ft.icons.${1:ADD},\n\ton_click=${2:fab_clicked}\n)',
    description: 'Floating action button',
    category: 'Button'
  },
  
  // Display Components
  {
    name: 'Image',
    snippet: 'ft.Image(\n\tsrc="${1:https://picsum.photos/200/200}",\n\twidth=${2:200},\n\theight=${3:200},\n\tfit=ft.ImageFit.${4:CONTAIN}\n)',
    description: 'Display image',
    category: 'Display'
  },
  {
    name: 'Icon',
    snippet: 'ft.Icon(\n\tname=ft.icons.${1:STAR},\n\tcolor=ft.colors.${2:AMBER},\n\tsize=${3:30}\n)',
    description: 'Display icon',
    category: 'Display'
  },
  {
    name: 'ProgressBar',
    snippet: 'ft.ProgressBar(\n\tvalue=${1:0.5},\n\tcolor=ft.colors.${2:BLUE}\n)',
    description: 'Progress bar',
    category: 'Display'
  },
  {
    name: 'ProgressRing',
    snippet: 'ft.ProgressRing(\n\tvalue=${1:0.5},\n\tcolor=ft.colors.${2:BLUE}\n)',
    description: 'Circular progress indicator',
    category: 'Display'
  },
  
  // List Components
  {
    name: 'ListView',
    snippet: 'ft.ListView(\n\tcontrols=[\n\t\t${1:ft.Text("Item 1")},\n\t\t${2:ft.Text("Item 2")}\n\t],\n\tspacing=${3:10},\n\tpadding=${4:10}\n)',
    description: 'Scrollable list',
    category: 'List'
  },
  {
    name: 'GridView',
    snippet: 'ft.GridView(\n\texpand=True,\n\truns_count=${1:3},\n\tmax_extent=${2:150},\n\tchild_aspect_ratio=${3:1.0},\n\tspacing=${4:5},\n\trun_spacing=${5:5}\n)',
    description: 'Grid layout',
    category: 'List'
  },
  {
    name: 'DataTable',
    snippet: 'ft.DataTable(\n\tcolumns=[\n\t\tft.DataColumn(ft.Text("${1:Column 1}")),\n\t\tft.DataColumn(ft.Text("${2:Column 2}"))\n\t],\n\trows=[\n\t\tft.DataRow(cells=[\n\t\t\tft.DataCell(ft.Text("${3:Value 1}")),\n\t\t\tft.DataCell(ft.Text("${4:Value 2}"))\n\t\t])\n\t]\n)',
    description: 'Data table',
    category: 'List'
  },
  
  // Dialog Components
  {
    name: 'AlertDialog',
    snippet: 'ft.AlertDialog(\n\ttitle=ft.Text("${1:Title}"),\n\tcontent=ft.Text("${2:Content}"),\n\tactions=[\n\t\tft.TextButton("${3:OK}", on_click=${4:close_dialog})\n\t]\n)',
    description: 'Alert dialog',
    category: 'Dialog'
  },
  {
    name: 'BottomSheet',
    snippet: 'ft.BottomSheet(\n\tcontent=ft.Container(\n\t\tcontent=ft.Column([\n\t\t\t${1:ft.Text("Bottom Sheet Content")}\n\t\t]),\n\t\tpadding=20\n\t)\n)',
    description: 'Bottom sheet',
    category: 'Dialog'
  },
  {
    name: 'SnackBar',
    snippet: 'ft.SnackBar(\n\tcontent=ft.Text("${1:Snackbar message}"),\n\taction="${2:Action}",\n\ton_action=${3:snackbar_action}\n)',
    description: 'Snackbar notification',
    category: 'Dialog'
  }
];

/**
 * Show component picker dialog
 */
function showComponentPicker(api: PluginApi): void {
  // Remove existing dialog if any
  const existingDialog = document.getElementById('flet-component-picker-dialog');
  if (existingDialog) {
    existingDialog.remove();
  }
  
  // Create dialog container
  const dialog = document.createElement('div');
  dialog.id = 'flet-component-picker-dialog';
  dialog.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: #252525;
    color: #e1e1e1;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    z-index: 9999;
    min-width: 500px;
    max-width: 700px;
    max-height: 80vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  `;
  
  // Add header
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 1px solid #444;
  `;
  header.innerHTML = `
    <h2 style="margin: 0; font-size: 18px; font-weight: 600;">Flet Components</h2>
    <span style="font-size: 12px; color: #888;">${FLET_COMPONENTS.length} components</span>
  `;
  dialog.appendChild(header);
  
  // Add search input
  const searchContainer = document.createElement('div');
  searchContainer.style.marginBottom = '15px';
  
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search components...';
  searchInput.style.cssText = `
    width: 100%;
    padding: 8px 12px;
    background: #333;
    border: 1px solid #444;
    border-radius: 4px;
    color: #e1e1e1;
    font-size: 14px;
    box-sizing: border-box;
  `;
  searchContainer.appendChild(searchInput);
  dialog.appendChild(searchContainer);
  
  // Add category filter
  const categories = Array.from(new Set(FLET_COMPONENTS.map(c => c.category || 'Other')));
  const categoryFilter = document.createElement('div');
  categoryFilter.style.cssText = `
    display: flex;
    gap: 8px;
    margin-bottom: 15px;
    flex-wrap: wrap;
  `;
  
  let selectedCategory: string | null = null;
  
  const allButton = createCategoryButton('All', true);
  allButton.onclick = () => {
    selectedCategory = null;
    updateCategoryButtons();
    renderComponents();
  };
  categoryFilter.appendChild(allButton);
  
  categories.forEach(category => {
    const btn = createCategoryButton(category, false);
    btn.onclick = () => {
      selectedCategory = category;
      updateCategoryButtons();
      renderComponents();
    };
    categoryFilter.appendChild(btn);
  });
  
  dialog.appendChild(categoryFilter);
  
  function createCategoryButton(text: string, active: boolean): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.className = active ? 'active' : '';
    btn.style.cssText = `
      padding: 6px 12px;
      background: ${active ? '#0078d7' : '#333'};
      color: ${active ? '#fff' : '#999'};
      border: 1px solid ${active ? '#0078d7' : '#444'};
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    `;
    
    btn.addEventListener('mouseover', () => {
      if (!btn.classList.contains('active')) {
        btn.style.background = '#444';
        btn.style.color = '#e1e1e1';
      }
    });
    
    btn.addEventListener('mouseout', () => {
      if (!btn.classList.contains('active')) {
        btn.style.background = '#333';
        btn.style.color = '#999';
      }
    });
    
    return btn;
  }
  
  function updateCategoryButtons(): void {
    const buttons = categoryFilter.querySelectorAll('button');
    buttons.forEach((btn, index) => {
      const isActive = (index === 0 && selectedCategory === null) || 
                       (btn.textContent === selectedCategory);
      btn.className = isActive ? 'active' : '';
      (btn as HTMLElement).style.background = isActive ? '#0078d7' : '#333';
      (btn as HTMLElement).style.color = isActive ? '#fff' : '#999';
      (btn as HTMLElement).style.borderColor = isActive ? '#0078d7' : '#444';
    });
  }
  
  // Add components list container
  const componentsList = document.createElement('div');
  componentsList.style.cssText = `
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 10px;
    overflow-y: auto;
    max-height: 400px;
    padding-right: 10px;
  `;
  
  function renderComponents(): void {
    componentsList.innerHTML = '';
    
    const searchTerm = searchInput.value.toLowerCase();
    const filtered = FLET_COMPONENTS.filter(component => {
      const matchesSearch = !searchTerm || 
        component.name.toLowerCase().includes(searchTerm) ||
        component.description?.toLowerCase().includes(searchTerm);
      const matchesCategory = !selectedCategory || component.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
    
    if (filtered.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.textContent = 'No components found';
      emptyMessage.style.cssText = `
        grid-column: 1 / -1;
        text-align: center;
        padding: 40px;
        color: #888;
      `;
      componentsList.appendChild(emptyMessage);
      return;
    }
    
    filtered.forEach(component => {
      const componentItem = document.createElement('div');
      componentItem.className = 'component-item';
      componentItem.style.cssText = `
        padding: 12px;
        background-color: #333;
        border: 1px solid #444;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        flex-direction: column;
        gap: 4px;
      `;
      
      componentItem.innerHTML = `
        <div style="font-weight: 600; font-size: 14px;">${component.name}</div>
        ${component.description ? `<div style="font-size: 11px; color: #888;">${component.description}</div>` : ''}
        ${component.category ? `<div style="font-size: 10px; color: #666; margin-top: 4px;">${component.category}</div>` : ''}
      `;
      
      componentItem.addEventListener('click', () => {
        // Insert snippet
        try {
          api.editor?.insertSnippet(component.snippet);
          // Close dialog
          document.body.removeChild(dialog);
          
          api.ui?.showNotification({
            message: `${component.name} component inserted`,
            type: 'success'
          });
        } catch (error) {
          console.error('Error inserting snippet:', error);
          api.ui?.showNotification({
            message: 'Failed to insert component',
            type: 'error'
          });
        }
      });
      
      componentItem.addEventListener('mouseover', () => {
        componentItem.style.backgroundColor = '#444';
        componentItem.style.borderColor = '#0078d7';
        componentItem.style.transform = 'translateY(-2px)';
      });
      
      componentItem.addEventListener('mouseout', () => {
        componentItem.style.backgroundColor = '#333';
        componentItem.style.borderColor = '#444';
        componentItem.style.transform = 'translateY(0)';
      });
      
      componentsList.appendChild(componentItem);
    });
  }
  
  // Initial render
  renderComponents();
  
  // Search functionality
  searchInput.addEventListener('input', renderComponents);
  
  dialog.appendChild(componentsList);
  
  // Add footer with cancel button
  const footer = document.createElement('div');
  footer.style.cssText = `
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid #444;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  `;
  
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = `
    padding: 8px 16px;
    background-color: #444;
    color: #e1e1e1;
    border: 1px solid #555;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.2s;
  `;
  
  cancelBtn.addEventListener('mouseover', () => {
    cancelBtn.style.backgroundColor = '#555';
  });
  
  cancelBtn.addEventListener('mouseout', () => {
    cancelBtn.style.backgroundColor = '#444';
  });
  
  cancelBtn.addEventListener('click', () => {
    document.body.removeChild(dialog);
  });
  
  footer.appendChild(cancelBtn);
  dialog.appendChild(footer);
  
  // Add to body
  document.body.appendChild(dialog);
  
  // Focus search input
  searchInput.focus();
  
  // Close on ESC key
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (document.body.contains(dialog)) {
        document.body.removeChild(dialog);
      }
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
  
  // Close on backdrop click
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      document.body.removeChild(dialog);
    }
  });
}

// ============================================================================
// NEW APP CREATION
// ============================================================================

/**
 * Create a new Flet app template
 */
async function createNewFletApp(api: PluginApi): Promise<void> {
  const template = `import flet as ft

def main(page: ft.Page):
    # Page configuration
    page.title = "My Flet App"
    page.theme_mode = ft.ThemeMode.LIGHT
    page.padding = 20
    page.scroll = ft.ScrollMode.AUTO
    
    # Create your UI here
    page.add(
        ft.Column([
            ft.Text("Welcome to Flet! 🚀", size=24, weight=ft.FontWeight.BOLD),
            ft.Text("Start building your app here"),
            ft.ElevatedButton("Click me!", on_click=lambda e: print("Button clicked!"))
        ])
    )

# Run the app
ft.app(target=main)
`;
  
  try {
    const editor = api.editor?.getActiveEditor();
    if (editor) {
      const document = editor.getDocument();
      await document.setText(template);
      
      api.ui?.showNotification({
        message: 'New Flet app template created! 🎉',
        type: 'success'
      });
    } else {
      api.ui?.showNotification({
        message: 'No active editor available',
        type: 'error'
      });
    }
  } catch (error) {
    console.error('Error creating new Flet app:', error);
    api.ui?.showNotification({
      message: 'Failed to create new app',
      type: 'error'
    });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default fletAssistant;

console.log('✅ Flet Assistant plugin loaded');