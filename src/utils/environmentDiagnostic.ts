// utils/environmentDiagnostic.ts
import { TauriFileOperations } from '../fileOperations/tauriFileOperations';

export async function diagnoseEnvironment() {
  const results = {
    environment: 'unknown',
    tauriAvailable: false,
    tauriIpcWorking: false,
    pluginsAvailable: {
      dialog: false,
      fs: false,
      shell: false
    },
    recommendations: [] as string[]
  };

  // Check if we're in Tauri
  if (typeof window !== 'undefined' && window.__TAURI__) {
    results.environment = 'tauri-desktop';
    results.tauriAvailable = true;
    
    // Test IPC
    try {
      const ipcWorks = await TauriFileOperations.checkTauriAvailability();
      results.tauriIpcWorking = ipcWorks;
    } catch (error) {
      console.warn('Tauri IPC test failed:', error);
    }
    
    // Test plugins with better error handling
    try {
      const dialogModule = await import('@tauri-apps/plugin-dialog');
      results.pluginsAvailable.dialog = !!(dialogModule && dialogModule.open);
    } catch (error) {
      console.warn('Dialog plugin not available:', error);
      results.pluginsAvailable.dialog = false;
    }
    
    try {
      const fsModule = await import('@tauri-apps/plugin-fs');
      results.pluginsAvailable.fs = !!(fsModule && fsModule.readTextFile);
    } catch (error) {
      console.warn('FS plugin not available:', error);
      results.pluginsAvailable.fs = false;
    }
    
    try {
      const shellModule = await import('@tauri-apps/plugin-shell');
      results.pluginsAvailable.shell = !!(shellModule && shellModule.open);
    } catch (error) {
      console.warn('Shell plugin not available:', error);
      results.pluginsAvailable.shell = false;
    }
    
  } else if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    results.environment = 'web-development';
    results.recommendations.push('You are running in web mode. To access file system, run: npm run tauri dev');
  } else {
    results.environment = 'web-production';
    results.recommendations.push('File system access is not available in web browsers');
  }

  // Add specific recommendations
  if (results.environment === 'tauri-desktop') {
    if (!results.tauriIpcWorking) {
      results.recommendations.push('Tauri IPC is not working. Check your Tauri configuration.');
    }
    if (!results.pluginsAvailable.dialog) {
      results.recommendations.push('Dialog plugin not available. Check your tauri.conf.json plugins section.');
    }
    if (!results.pluginsAvailable.fs) {
      results.recommendations.push('File system plugin not available. Check your tauri.conf.json plugins section.');
    }
  }

  return results;
}

// Add this function to show environment info in the UI
export function showEnvironmentDiagnostic() {
  diagnoseEnvironment().then(results => {
    console.log('🔍 Environment Diagnostic Results:', results);
    
    // Show in UI
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.backgroundColor = '#252525';
    modal.style.color = '#e1e1e1';
    modal.style.padding = '20px';
    modal.style.borderRadius = '8px';
    modal.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
    modal.style.zIndex = '10000';
    modal.style.maxWidth = '500px';
    modal.style.width = '90%';
    
    const getStatusIcon = (status: boolean) => status ? '✅' : '❌';
    const getEnvIcon = (env: string) => {
      switch (env) {
        case 'tauri-desktop': return '🖥️';
        case 'web-development': return '🌐';
        case 'web-production': return '🌍';
        default: return '❓';
      }
    };
    
    modal.innerHTML = `
      <h3 style="margin-top: 0; color: #75beff;">Environment Diagnostic</h3>
      
      <div style="margin: 15px 0;">
        <strong>${getEnvIcon(results.environment)} Environment:</strong> ${results.environment}
      </div>
      
      <div style="margin: 15px 0;">
        <strong>Tauri Status:</strong><br/>
        ${getStatusIcon(results.tauriAvailable)} Available: ${results.tauriAvailable}<br/>
        ${getStatusIcon(results.tauriIpcWorking)} IPC Working: ${results.tauriIpcWorking}
      </div>
      
      <div style="margin: 15px 0;">
        <strong>Plugins:</strong><br/>
        ${getStatusIcon(results.pluginsAvailable.dialog)} Dialog Plugin<br/>
        ${getStatusIcon(results.pluginsAvailable.fs)} File System Plugin<br/>
        ${getStatusIcon(results.pluginsAvailable.shell)} Shell Plugin
      </div>
      
      ${results.recommendations.length > 0 ? `
        <div style="margin: 15px 0;">
          <strong>Recommendations:</strong>
          <ul style="margin: 5px 0; padding-left: 20px;">
            ${results.recommendations.map(rec => `<li style="margin: 5px 0;">${rec}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      <button id="close-diagnostic" style="
        background: #2962ff; 
        color: white; 
        border: none; 
        padding: 8px 16px; 
        border-radius: 4px; 
        cursor: pointer;
        float: right;
        margin-top: 10px;
      ">Close</button>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('close-diagnostic')?.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    // Auto-close after 10 seconds
    setTimeout(() => {
      if (modal.parentNode) {
        document.body.removeChild(modal);
      }
    }, 10000);
  });
}

// Add diagnostic button to your app for easy debugging
export function addDiagnosticButton() {
  const button = document.createElement('button');
  button.textContent = '🔍 Diagnostic';
  button.style.position = 'fixed';
  button.style.bottom = '20px';
  button.style.right = '20px';
  button.style.zIndex = '9999';
  button.style.padding = '8px 12px';
  button.style.backgroundColor = '#444';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '4px';
  button.style.cursor = 'pointer';
  button.title = 'Show environment diagnostic';
  
  button.addEventListener('click', showEnvironmentDiagnostic);
  document.body.appendChild(button);
}