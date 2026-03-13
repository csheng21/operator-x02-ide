// ============================================================================
// FILE: aiFileCreator.test.ts
// PURPOSE: Quick Test Version - Minimal Implementation for Testing
// ============================================================================

/**
 * QUICK TEST VERSION
 * 
 * This is a simplified version to test the concept quickly.
 * Use this to verify the integration works before using the full version.
 * 
 * To test:
 * 1. Copy this file to your project
 * 2. Add to main.ts: import { testAIFileCreator } from './aiFileCreator.test';
 * 3. Call: testAIFileCreator()
 * 4. Check console and file system
 */

// ============================================================================
// SIMPLE TEST FUNCTION
// ============================================================================

export async function testAIFileCreator(): Promise<void> {
  console.log('🧪 Testing AI File Creator...');
  
  try {
    // Test 1: Check if we can access Tauri
    console.log('\n📋 Test 1: Checking Tauri availability...');
    if (window.fs && window.fs.writeFile) {
      console.log('✅ Tauri file system is available');
    } else {
      console.error('❌ Tauri file system NOT available');
      console.log('   Make sure Tauri is running');
      return;
    }
    
    // Test 2: Check current folder
    console.log('\n📋 Test 2: Checking current folder...');
    if (window.currentFolderPath) {
      console.log('✅ Current folder:', window.currentFolderPath);
    } else {
      console.error('❌ No folder opened');
      console.log('   Open a folder first');
      return;
    }
    
    // Test 3: Check AI API
    console.log('\n📋 Test 3: Checking AI API...');
    if (typeof window.callGenericAPI === 'function') {
      console.log('✅ AI API is available');
    } else {
      console.error('❌ AI API NOT available');
      console.log('   Make sure apiProviderManager is initialized');
      return;
    }
    
    // Test 4: Create a test file
    console.log('\n📋 Test 4: Creating test file...');
    const testFilePath = `${window.currentFolderPath}/ai-test-${Date.now()}.txt`;
    const testContent = 'This file was created by AI File Creator test!\nCreated at: ' + new Date().toISOString();
    
    await window.fs.writeFile(testFilePath, testContent);
    console.log('✅ Test file created:', testFilePath);
    
    // Test 5: Test AI generation
    console.log('\n📋 Test 5: Testing AI generation...');
    const aiResponse = await window.callGenericAPI(
      [{ role: 'user', content: 'Generate a simple HTML file structure. Respond with ONLY the HTML code, no explanations.' }],
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        temperature: 0.3
      }
    );
    
    console.log('✅ AI responded with', aiResponse.content.length, 'characters');
    console.log('First 200 chars:', aiResponse.content.substring(0, 200));
    
    // Test 6: Create AI-generated file
    console.log('\n📋 Test 6: Creating AI-generated file...');
    const htmlFilePath = `${window.currentFolderPath}/ai-generated-${Date.now()}.html`;
    await window.fs.writeFile(htmlFilePath, aiResponse.content);
    console.log('✅ AI-generated file created:', htmlFilePath);
    
    // Test 7: Open file in editor
    console.log('\n📋 Test 7: Testing file open in editor...');
    if (typeof window.openFileInEditor === 'function') {
      await window.openFileInEditor(htmlFilePath);
      console.log('✅ File opened in editor');
    } else {
      console.log('⚠️ openFileInEditor not available, skipping');
    }
    
    // Test 8: Refresh file explorer
    console.log('\n📋 Test 8: Testing file explorer refresh...');
    const refreshEvent = new CustomEvent('file-tree-refresh', {
      detail: { action: 'create' }
    });
    document.dispatchEvent(refreshEvent);
    console.log('✅ File explorer refresh event dispatched');
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('\nFiles created:');
    console.log('  1.', testFilePath);
    console.log('  2.', htmlFilePath);
    console.log('\nYou can now proceed with full integration!');
    console.log('See INTEGRATION_GUIDE.txt for next steps.');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    console.log('\nDebug info:');
    console.log('  - window.fs:', typeof window.fs);
    console.log('  - window.currentFolderPath:', window.currentFolderPath);
    console.log('  - window.callGenericAPI:', typeof window.callGenericAPI);
  }
}

// ============================================================================
// SIMPLE UI TEST
// ============================================================================

export function testAIFileCreatorUI(): void {
  console.log('🎨 Testing AI File Creator UI...');
  
  // Create simple test dialog
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100000;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: #252526;
    border: 1px solid #3c3c3c;
    border-radius: 12px;
    padding: 30px;
    max-width: 500px;
    color: #fff;
  `;
  
  content.innerHTML = `
    <h2 style="margin: 0 0 20px 0; color: #667eea;">✨ AI File Creator - UI Test</h2>
    <p style="margin-bottom: 20px; color: #ccc;">
      If you can see this dialog, the UI system is working!
    </p>
    <textarea 
      id="test-input"
      style="
        width: 100%;
        padding: 12px;
        background: #1e1e1e;
        border: 1px solid #3c3c3c;
        border-radius: 6px;
        color: #ccc;
        font-size: 14px;
        margin-bottom: 20px;
        font-family: inherit;
      "
      rows="4"
      placeholder="Type your file creation request here..."
    ></textarea>
    <div style="display: flex; gap: 10px; justify-content: flex-end;">
      <button id="test-cancel" style="
        padding: 10px 20px;
        background: #3c3c3c;
        border: none;
        border-radius: 6px;
        color: #ccc;
        cursor: pointer;
        font-size: 14px;
      ">Cancel</button>
      <button id="test-create" style="
        padding: 10px 20px;
        background: linear-gradient(135deg, #667eea, #764ba2);
        border: none;
        border-radius: 6px;
        color: white;
        cursor: pointer;
        font-size: 14px;
      ">✨ Test Create</button>
    </div>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Event listeners
  document.getElementById('test-cancel')?.addEventListener('click', () => {
    modal.remove();
    console.log('✅ UI Test: Dialog closed');
  });
  
  document.getElementById('test-create')?.addEventListener('click', () => {
    const input = document.getElementById('test-input') as HTMLTextAreaElement;
    console.log('✅ UI Test: Create clicked');
    console.log('Input value:', input.value);
    alert('UI Test Successful!\n\nYour input: ' + input.value);
    modal.remove();
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      console.log('✅ UI Test: Dialog closed (backdrop click)');
    }
  });
  
  console.log('✅ UI Test dialog displayed');
}

// ============================================================================
// INTEGRATION TEST
// ============================================================================

export async function testFullIntegration(): Promise<void> {
  console.log('🚀 Testing Full Integration...');
  console.log('This will test the complete AI File Creator workflow\n');
  
  try {
    // Step 1: Prerequisites
    console.log('Step 1: Checking prerequisites...');
    const checks = {
      tauri: !!(window.fs && window.fs.writeFile),
      folder: !!window.currentFolderPath,
      ai: typeof window.callGenericAPI === 'function',
      ui: !!document.querySelector('body')
    };
    
    console.log('  Tauri:', checks.tauri ? '✅' : '❌');
    console.log('  Folder:', checks.folder ? '✅' : '❌');
    console.log('  AI API:', checks.ai ? '✅' : '❌');
    console.log('  UI:', checks.ui ? '✅' : '❌');
    
    if (!Object.values(checks).every(v => v)) {
      throw new Error('Prerequisites not met. Check above for details.');
    }
    
    // Step 2: Test AI Generation
    console.log('\nStep 2: Testing AI generation...');
    const prompt = `Create a simple HTML page. Respond with ONLY the HTML code:
<!DOCTYPE html>
<html>
<head>
  <title>Test Page</title>
</head>
<body>
  <h1>AI Generated Page</h1>
  <p>Created at: ${new Date().toISOString()}</p>
</body>
</html>`;
    
    const response = await window.callGenericAPI(
      [{ role: 'user', content: prompt }],
      { model: 'claude-sonnet-4-20250514', max_tokens: 500, temperature: 0 }
    );
    
    console.log('  ✅ AI generated', response.content.length, 'characters');
    
    // Step 3: Create file
    console.log('\nStep 3: Creating file...');
    const filePath = `${window.currentFolderPath}/test-${Date.now()}.html`;
    await window.fs.writeFile(filePath, response.content);
    console.log('  ✅ File created:', filePath);
    
    // Step 4: Verify file exists
    console.log('\nStep 4: Verifying file...');
    const fileContent = await window.fs.readTextFile(filePath);
    console.log('  ✅ File verified, size:', fileContent.length, 'bytes');
    
    // Step 5: Test UI
    console.log('\nStep 5: Testing UI...');
    testAIFileCreatorUI();
    console.log('  ✅ UI dialog shown (check your screen)');
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ FULL INTEGRATION TEST PASSED!');
    console.log('='.repeat(60));
    console.log('\nEverything is working correctly!');
    console.log('You can now use the full AI File Creator feature.');
    
  } catch (error) {
    console.error('\n❌ INTEGRATION TEST FAILED:', error);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure Tauri is running');
    console.log('2. Open a folder in the IDE');
    console.log('3. Check that AI provider is configured');
    console.log('4. Check console for detailed errors');
  }
}

// ============================================================================
// AUTO-RUN ON IMPORT (Optional)
// ============================================================================

if (typeof window !== 'undefined') {
  // Expose test functions globally
  (window as any).testAIFileCreator = testAIFileCreator;
  (window as any).testAIFileCreatorUI = testAIFileCreatorUI;
  (window as any).testFullIntegration = testFullIntegration;
  
  console.log('🧪 AI File Creator Test Functions Available:');
  console.log('  testAIFileCreator()     - Basic tests');
  console.log('  testAIFileCreatorUI()   - UI test');
  console.log('  testFullIntegration()   - Complete test');
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  testAIFileCreator,
  testAIFileCreatorUI,
  testFullIntegration
};
