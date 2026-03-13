import { useState } from 'react'
import { invoke } from '@tauri-apps/api/tauri'

// Import the openFileWithFileHandle function
import { openFileWithFileHandle } from '../fileSystem';

// Then somewhere in your toolbar rendering code, add this button:
<button 
  onClick={async () => {
    const result = await openFileWithFileHandle();
    if (result) {
      // Update your UI with the file content
      // This depends on how your editor is structured, but might look like:
      const editor = window.monaco?.editor.getEditors()[0];
      if (editor) {
        editor.setValue(result.content);
        // Update file path status
        const pathStatus = document.getElementById('file-path-status');
        if (pathStatus) {
          pathStatus.textContent = result.path;
        }
        // Store info for future saves
        window.localStorage.setItem('currentFilePath', result.path);
        window.localStorage.setItem('currentFileName', result.fileName);
      }
    }
  }}
  className="file-operation-button"
>
  Open File (With Overwrite)
</button>

function SystemInfoTest() {
  const [systemInfo, setSystemInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchSystemInfo = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Call the Tauri command
      const info = await invoke('get_system_info')
      
      // Update state with the result
      setSystemInfo(info)
      console.log('System info retrieved:', info)
    } catch (err) {
      console.error('Error fetching system info:', err)
      setError(`Error: ${err.toString()}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>System Information Test</h2>
      
      <button 
        onClick={fetchSystemInfo}
        disabled={loading}
        style={{
          padding: '8px 16px',
          background: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'wait' : 'pointer'
        }}
      >
        {loading ? 'Loading...' : 'Get System Info'}
      </button>
      
      {error && (
        <div style={{ color: 'red', margin: '10px 0' }}>
          {error}
        </div>
      )}
      
      {systemInfo && (
        <div style={{ 
          marginTop: '20px', 
          padding: '15px',
          border: '1px solid #ddd',
          borderRadius: '5px',
          background: '#f9f9f9'
        }}>
          <h3>System Information</h3>
          <pre style={{ overflow: 'auto' }}>
            {JSON.stringify(systemInfo, null, 2)}
          </pre>
          
          <div style={{ marginTop: '20px' }}>
            <h4>User Details</h4>
            <p><strong>Username:</strong> {systemInfo.username}</p>
            <p><strong>Computer Name:</strong> {systemInfo.computer_name}</p>
            <p><strong>OS:</strong> {systemInfo.os_name}</p>
          </div>
          
          <div style={{ marginTop: '20px' }}>
            <h4>Directories</h4>
            <p><strong>Home:</strong> {systemInfo.home_dir}</p>
            <p><strong>Documents:</strong> {systemInfo.documents_dir}</p>
            <p><strong>Downloads:</strong> {systemInfo.downloads_dir || 'Not available'}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default SystemInfoTest