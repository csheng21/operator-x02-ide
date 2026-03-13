// src/utils/tauriDiagnostic.ts

// Declare Tauri globals for TypeScript
declare global {
  interface Window {
    __TAURI__?: {
      invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
      [key: string]: unknown;
    };
    __TAURI_IPC__?: (message: unknown) => void;
  }
}

export function runTauriDiagnostic() {
  const resultDiv = document.createElement('div');
  resultDiv.style.position = 'fixed';
  resultDiv.style.top = '10px';
  resultDiv.style.left = '10px';
  resultDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  resultDiv.style.padding = '15px';
  resultDiv.style.borderRadius = '8px';
  resultDiv.style.maxWidth = '80%';
  resultDiv.style.maxHeight = '80%';
  resultDiv.style.overflow = 'auto';
  resultDiv.style.color = 'white';
  resultDiv.style.fontFamily = 'monospace';
  resultDiv.style.fontSize = '12px';
  resultDiv.style.zIndex = '10000';
  
  let html = '<h2>Tauri Diagnostic Results</h2>';
  
  // Check Tauri availability
  const hasTauri = typeof window !== 'undefined' && window.__TAURI__ !== undefined;
  html += `<p>Tauri Available: ${hasTauri ? 'YES' : 'NO'}</p>`;
  
  if (hasTauri && window.__TAURI__) {
    // Basic checks
    html += `<p>window.__TAURI_IPC__ available: ${typeof window.__TAURI_IPC__ === 'function' ? 'YES' : 'NO'}</p>`;
    html += `<p>invoke available: ${typeof window.__TAURI__.invoke === 'function' ? 'YES' : 'NO'}</p>`;
    
    // Test invoke function
    html += '<h3>Testing invoke function:</h3>';
    html += '<div id="invoke-test">Running test...</div>';
    
    // Available APIs
    html += '<h3>Available Tauri APIs:</h3>';
    html += '<ul>';
    for (const key in window.__TAURI__) {
      html += `<li>${key}</li>`;
    }
    html += '</ul>';
  }
  
  // Add close button
  html += '<button id="close-diagnostic" style="margin-top: 15px; padding: 5px 10px;">Close</button>';
  
  resultDiv.innerHTML = html;
  document.body.appendChild(resultDiv);
  
  // Add close button functionality
  document.getElementById('close-diagnostic')?.addEventListener('click', () => {
    document.body.removeChild(resultDiv);
  });
  
  // Run invoke test
  if (hasTauri && window.__TAURI__ && typeof window.__TAURI__.invoke === 'function') {
    const invokeTest = document.getElementById('invoke-test');
    if (invokeTest) {
      window.__TAURI__.invoke('tauri', { command: 'getAppVersion' })
        .then(version => {
          invokeTest.innerHTML = `<p style="color: green">✓ Invoke successful: ${version}</p>`;
        })
        .catch(err => {
          invokeTest.innerHTML = `<p style="color: red">✗ Invoke error: ${(err as Error).message}</p>`;
        });
    }
  }
}

// Add button to trigger diagnostic
export function addDiagnosticButton() {
  const button = document.createElement('button');
  button.textContent = 'Tauri Diagnostic';
  button.style.position = 'fixed';
  button.style.bottom = '10px';
  button.style.right = '10px';
  button.style.zIndex = '9999';
  button.style.padding = '8px 12px';
  button.addEventListener('click', runTauriDiagnostic);
  document.body.appendChild(button);
}
