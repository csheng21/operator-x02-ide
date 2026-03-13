// src/utils/userInfo.ts

/**
 * Interface for user information
 */
export interface UserInfo {
  username: string;
  homeDir: string;
  downloadsDir: string;
  documentsDir: string;
}

// Store for the user info once retrieved
let cachedUserInfo: UserInfo | null = null;

// Flag to track if we've tried to verify Tauri fs API
let tauriFsVerified = false;
let tauriFsWorking = false;

/**
 * Check if Tauri fs API is available and working
 * This function tests if we can actually use the fs API
 */
async function verifyTauriFsApi(): Promise<boolean> {
  if (tauriFsVerified) {
    return tauriFsWorking;
  }
  
  console.log('Verifying Tauri fs API availability...');
  
  // Check if Tauri is available at all
  if (typeof window === 'undefined' || !window.__TAURI__) {
    console.log('Tauri is not available');
    tauriFsVerified = true;
    tauriFsWorking = false;
    return false;
  }
  
  // Check if fs object exists
  if (!window.__TAURI__.fs) {
    console.log('Tauri fs API is not available');
    tauriFsVerified = true;
    tauriFsWorking = false;
    return false;
  }
  
  // Check if the required functions exist
  if (typeof window.__TAURI__.fs.writeTextFile !== 'function' || 
      typeof window.__TAURI__.fs.readTextFile !== 'function') {
    console.log('Tauri fs API does not have required functions');
    tauriFsVerified = true;
    tauriFsWorking = false;
    return false;
  }
  
  // Try to actually use the fs API with a temp file
  try {
    // Try to write to a temporary file in a location that shouldn't require permissions
    const tempPath = 'temp-tauri-test.txt';
    const testContent = 'Testing Tauri fs API - ' + new Date().toISOString();
    
    await window.__TAURI__.fs.writeTextFile(tempPath, testContent);
    console.log('Successfully wrote temp file:', tempPath);
    
    // Try to read it back
    const readContent = await window.__TAURI__.fs.readTextFile(tempPath);
    
    // Verify content
    if (readContent === testContent) {
      console.log('Successfully read temp file with correct content');
      tauriFsVerified = true;
      tauriFsWorking = true;
      return true;
    } else {
      console.log('Read content doesn\'t match written content');
      tauriFsVerified = true;
      tauriFsWorking = false;
      return false;
    }
  } catch (error) {
    console.error('Error testing Tauri fs API:', error);
    tauriFsVerified = true;
    tauriFsWorking = false;
    return false;
  }
}

/**
 * Try different user paths to find one that works
 * @returns True if a working path was found and set
 */
async function tryCommonUserPaths(): Promise<boolean> {
  if (!tauriFsWorking) return false;
  
  // Common Windows usernames to try
  const commonUsernames = ['hi', 'User', 'Administrator', 'Admin', 'user', 'admin'];
  
  for (const username of commonUsernames) {
    const downloadsDir = `C:\\Users\\${username}\\Downloads\\`;
    const testPath = `${downloadsDir}tauri-path-test.txt`;
    const testContent = 'Testing path - ' + new Date().toISOString();
    
    try {
      console.log(`Trying path with username "${username}"...`);
      await window.__TAURI__.fs.writeTextFile(testPath, testContent);
      console.log(`✅ Success with username "${username}"`);
      
      // Create user info with this username
      cachedUserInfo = {
        username,
        homeDir: `C:\\Users\\${username}\\`,
        downloadsDir: `C:\\Users\\${username}\\Downloads\\`,
        documentsDir: `C:\\Users\\${username}\\Documents\\`
      };
      
      console.log('Set user info to:', cachedUserInfo);
      return true;
    } catch (error) {
      console.log(`❌ Failed with username "${username}":`, error);
    }
  }
  
  console.log('Could not find a working user path');
  return false;
}

/**
 * Get user information from the system
 * @returns Promise with user information
 */
export async function getUserInfo(): Promise<UserInfo> {
  // Return cached data if available
  if (cachedUserInfo) {
    return cachedUserInfo;
  }
  
  console.log('Getting user info - no cached data available');
  
  // Check if localStorage has manual override
  if (typeof window !== 'undefined' && window.localStorage) {
    const savedUserInfo = window.localStorage.getItem('userInfo');
    if (savedUserInfo) {
      try {
        cachedUserInfo = JSON.parse(savedUserInfo);
        console.log('Using user info from localStorage:', cachedUserInfo);
        return cachedUserInfo;
      } catch (e) {
        console.error('Error parsing saved user info:', e);
      }
    }
  }
  
  // Check if Tauri fs API is working
  const fsApiWorking = await verifyTauriFsApi();
  
  if (fsApiWorking) {
    // Try to find a working path
    const found = await tryCommonUserPaths();
    
    if (found && cachedUserInfo) {
      return cachedUserInfo;
    }
  }
  
  // Fallback - use default paths
  cachedUserInfo = {
    username: 'User',
    homeDir: 'C:\\Users\\User\\',
    downloadsDir: 'C:\\Users\\User\\Downloads\\',
    documentsDir: 'C:\\Users\\User\\Documents\\'
  };
  
  console.log('Using default user info:', cachedUserInfo);
  return cachedUserInfo;
}

/**
 * Save user info to localStorage for persistence
 */
function saveUserInfoToStorage(userInfo: UserInfo): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem('userInfo', JSON.stringify(userInfo));
      console.log('Saved user info to localStorage');
    } catch (e) {
      console.error('Error saving user info to localStorage:', e);
    }
  }
}

/**
 * Manually set user info paths - for when automatic detection fails
 */
export function setUserInfo(userInfo: UserInfo): void {
  cachedUserInfo = userInfo;
  saveUserInfoToStorage(userInfo);
  console.log('Manually set user info to:', userInfo);
}

/**
 * Get file path in the downloads directory
 * @param fileName The name of the file
 * @returns Full path to the file in the downloads directory
 */
export async function getDownloadsPath(fileName: string): Promise<string> {
  const userInfo = await getUserInfo();
  return `${userInfo.downloadsDir}${fileName}`;
}

/**
 * Get file path in the documents directory
 * @param fileName The name of the file
 * @returns Full path to the file in the documents directory
 */
export async function getDocumentsPath(fileName: string): Promise<string> {
  const userInfo = await getUserInfo();
  return `${userInfo.documentsDir}${fileName}`;
}

/**
 * Initialize user info at application startup
 * Call this early in application initialization
 */
export async function initializeUserInfo(): Promise<void> {
  try {
    const userInfo = await getUserInfo();
    console.log('User info initialized:', userInfo);
  } catch (error) {
    console.error('Failed to initialize user info:', error);
  }
}

/**
 * Test function to display user info and provide manual setting option
 */
export async function testUserInfo(): Promise<void> {
  try {
    // Get current user info
    const userInfo = await getUserInfo();
    
    // Create a formatted display of the user info
    const infoDisplay = `
    ===== USER INFO TEST =====
    Username: ${userInfo.username}
    Home Directory: ${userInfo.homeDir}
    Downloads Directory: ${userInfo.downloadsDir}
    Documents Directory: ${userInfo.documentsDir}
    ==========================
    `;
    
    console.log(infoDisplay);
    
    // Create a visual display on the UI
    const testDiv = document.createElement('div');
    testDiv.style.position = 'fixed';
    testDiv.style.top = '20px';
    testDiv.style.left = '20px';
    testDiv.style.padding = '10px';
    testDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    testDiv.style.color = '#fff';
    testDiv.style.borderRadius = '6px';
    testDiv.style.zIndex = '10000';
    testDiv.style.maxWidth = '80%';
    testDiv.style.fontFamily = 'monospace';
    testDiv.style.whiteSpace = 'pre';
    
    testDiv.textContent = infoDisplay;
    
    // Add an edit form
    const editDiv = document.createElement('div');
    editDiv.style.marginTop = '15px';
    editDiv.innerHTML = `
      <h3>Edit User Info</h3>
      <div style="display: flex; flex-direction: column; gap: 5px; margin-top: 10px;">
        <div>
          <label style="display: inline-block; width: 100px;">Username:</label>
          <input type="text" id="username-input" value="${userInfo.username}" style="background: #333; color: white; border: 1px solid #555; padding: 3px;">
        </div>
        <div>
          <label style="display: inline-block; width: 100px;">Home Dir:</label>
          <input type="text" id="homedir-input" value="${userInfo.homeDir}" style="background: #333; color: white; border: 1px solid #555; padding: 3px;">
        </div>
        <div>
          <label style="display: inline-block; width: 100px;">Downloads:</label>
          <input type="text" id="downloads-input" value="${userInfo.downloadsDir}" style="background: #333; color: white; border: 1px solid #555; padding: 3px;">
        </div>
        <div>
          <label style="display: inline-block; width: 100px;">Documents:</label>
          <input type="text" id="documents-input" value="${userInfo.documentsDir}" style="background: #333; color: white; border: 1px solid #555; padding: 3px;">
        </div>
      </div>
    `;
    testDiv.appendChild(editDiv);
    
    // Add status area
    const statusDiv = document.createElement('div');
    statusDiv.id = 'user-info-status';
    statusDiv.style.marginTop = '10px';
    statusDiv.style.padding = '5px';
    statusDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
    statusDiv.style.borderRadius = '3px';
    testDiv.appendChild(statusDiv);
    
    // Add API status
    const apiStatus = document.createElement('div');
    apiStatus.style.marginTop = '10px';
    apiStatus.innerHTML = `<h3>API Status</h3>`;
    
    // Check Tauri availability
    const hasTauri = typeof window !== 'undefined' && window.__TAURI__ !== undefined;
    apiStatus.innerHTML += `<div>Tauri Available: ${hasTauri ? '✅' : '❌'}</div>`;
    
    if (hasTauri) {
      apiStatus.innerHTML += `<div>Tauri fs API: ${window.__TAURI__.fs ? '✅' : '❌'}</div>`;
      apiStatus.innerHTML += `<div>fs.writeTextFile: ${typeof window.__TAURI__?.fs?.writeTextFile === 'function' ? '✅' : '❌'}</div>`;
      apiStatus.innerHTML += `<div>fs.readTextFile: ${typeof window.__TAURI__?.fs?.readTextFile === 'function' ? '✅' : '❌'}</div>`;
    }
    
    apiStatus.innerHTML += `<div>Tauri fs Verified: ${tauriFsVerified ? '✅' : '❌'}</div>`;
    apiStatus.innerHTML += `<div>Tauri fs Working: ${tauriFsWorking ? '✅' : '❌'}</div>`;
    
    testDiv.appendChild(apiStatus);
    
    // Add buttons
    const buttonsDiv = document.createElement('div');
    buttonsDiv.style.marginTop = '15px';
    buttonsDiv.style.display = 'flex';
    buttonsDiv.style.gap = '10px';
    buttonsDiv.style.justifyContent = 'center';
    
    // Apply button
    const applyBtn = document.createElement('button');
    applyBtn.textContent = 'Apply Changes';
    applyBtn.style.padding = '5px 10px';
    applyBtn.addEventListener('click', () => {
      const username = (document.getElementById('username-input') as HTMLInputElement)?.value || userInfo.username;
      const homeDir = (document.getElementById('homedir-input') as HTMLInputElement)?.value || userInfo.homeDir;
      const downloadsDir = (document.getElementById('downloads-input') as HTMLInputElement)?.value || userInfo.downloadsDir;
      const documentsDir = (document.getElementById('documents-input') as HTMLInputElement)?.value || userInfo.documentsDir;
      
      const newUserInfo = {
        username,
        homeDir,
        downloadsDir,
        documentsDir
      };
      
      setUserInfo(newUserInfo);
      
      // Update status
      const statusDiv = document.getElementById('user-info-status');
      if (statusDiv) {
        statusDiv.textContent = `✅ User info updated and saved to localStorage`;
        statusDiv.style.backgroundColor = 'rgba(0, 128, 0, 0.3)';
      }
    });
    
    // Test Write button
    const testWriteBtn = document.createElement('button');
    testWriteBtn.textContent = 'Test Write';
    testWriteBtn.style.padding = '5px 10px';
    testWriteBtn.addEventListener('click', async () => {
      const statusDiv = document.getElementById('user-info-status');
      if (!statusDiv) return;
      
      statusDiv.innerHTML = 'Testing file write...';
      statusDiv.style.backgroundColor = 'rgba(128, 128, 0, 0.3)';
      
      // Get current values from inputs
      const downloadsDir = (document.getElementById('downloads-input') as HTMLInputElement)?.value || userInfo.downloadsDir;
      
      try {
        // Test browser download as fallback
        const timestamp = new Date().getTime();
        const testContent = `Testing file write - ${new Date().toISOString()}`;
        
        // Try Tauri fs if available
        if (hasTauri && window.__TAURI__?.fs?.writeTextFile) {
          try {
            const testPath = `${downloadsDir}test-write-${timestamp}.txt`;
            await window.__TAURI__.fs.writeTextFile(testPath, testContent);
            statusDiv.innerHTML = `✅ File written successfully using Tauri fs: ${testPath}`;
            statusDiv.style.backgroundColor = 'rgba(0, 128, 0, 0.3)';
            return;
          } catch (fsError) {
            statusDiv.innerHTML = `❌ Tauri fs error: ${fsError.message}<br>Falling back to browser download...`;
          }
        }
        
        // Browser fallback
        const blob = new Blob([testContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `test-write-${timestamp}.txt`;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
        
        statusDiv.innerHTML += `<br>✅ File downloaded using browser fallback`;
        statusDiv.style.backgroundColor = 'rgba(0, 128, 0, 0.3)';
      } catch (error) {
        statusDiv.innerHTML = `❌ Error: ${error.message}`;
        statusDiv.style.backgroundColor = 'rgba(128, 0, 0, 0.3)';
      }
    });
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.padding = '5px 10px';
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(testDiv);
    });
    
    buttonsDiv.appendChild(applyBtn);
    buttonsDiv.appendChild(testWriteBtn);
    buttonsDiv.appendChild(closeBtn);
    testDiv.appendChild(buttonsDiv);
    
    document.body.appendChild(testDiv);
  } catch (error) {
    console.error('Error testing user info:', error);
  }
}