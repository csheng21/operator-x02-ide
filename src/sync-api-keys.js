// ============================================================================
// SYNC API KEYS - Run this in browser console to sync your API keys
// This ensures all keys in aiApiConfig are also in providerApiKeys
// ============================================================================

console.log('🔄 API KEY SYNC UTILITY\n');

// Step 1: Show current providerApiKeys
const currentKeys = JSON.parse(localStorage.getItem('providerApiKeys') || '{}');
console.log('📦 Current providerApiKeys:');
for (const [provider, key] of Object.entries(currentKeys)) {
  console.log(`   ${provider}: ${key ? key.toString().substring(0, 20) + '...' : '(empty)'}`);
}

// Step 2: Check aiApiConfig
const currentConfig = JSON.parse(localStorage.getItem('aiApiConfig') || '{}');
console.log('\n📋 Current aiApiConfig:');
console.log('   Provider:', currentConfig.provider || 'none');
console.log('   API Key:', currentConfig.apiKey ? currentConfig.apiKey.substring(0, 20) + '...' : '(empty)');
console.log('   Model:', currentConfig.model || 'none');

// Step 3: Sync - if aiApiConfig has a key that providerApiKeys doesn't have, add it
if (currentConfig.provider && currentConfig.apiKey && currentConfig.apiKey.length > 5) {
  if (!currentKeys[currentConfig.provider] || currentKeys[currentConfig.provider] !== currentConfig.apiKey) {
    console.log(`\n✨ Syncing ${currentConfig.provider} key to providerApiKeys...`);
    currentKeys[currentConfig.provider] = currentConfig.apiKey;
    localStorage.setItem('providerApiKeys', JSON.stringify(currentKeys));
    console.log(`✅ ${currentConfig.provider} key synced!`);
  } else {
    console.log(`\n✅ ${currentConfig.provider} key already in sync`);
  }
}

// Step 4: Show final state
console.log('\n📦 Final providerApiKeys:');
const finalKeys = JSON.parse(localStorage.getItem('providerApiKeys') || '{}');
for (const [provider, key] of Object.entries(finalKeys)) {
  console.log(`   ${provider}: ${key ? '✅ ' + key.toString().substring(0, 20) + '...' : '❌ empty'}`);
}

// Step 5: Helper functions
console.log('\n📝 HELPER COMMANDS:');
console.log('');
console.log('// To manually add a key:');
console.log('addKey("claude", "sk-ant-your-key-here")');
console.log('');
console.log('// To sync current active provider key:');
console.log('syncCurrentKey()');
console.log('');
console.log('// To see all keys:');
console.log('showKeys()');

// Define helper functions
window.addKey = function(provider, key) {
  const keys = JSON.parse(localStorage.getItem('providerApiKeys') || '{}');
  keys[provider] = key;
  localStorage.setItem('providerApiKeys', JSON.stringify(keys));
  console.log(`✅ Added key for ${provider}`);
  return keys;
};

window.syncCurrentKey = function() {
  const config = JSON.parse(localStorage.getItem('aiApiConfig') || '{}');
  if (config.provider && config.apiKey) {
    const keys = JSON.parse(localStorage.getItem('providerApiKeys') || '{}');
    keys[config.provider] = config.apiKey;
    localStorage.setItem('providerApiKeys', JSON.stringify(keys));
    console.log(`✅ Synced ${config.provider} key to providerApiKeys`);
    return keys;
  } else {
    console.log('❌ No active provider with API key');
    return null;
  }
};

window.showKeys = function() {
  const keys = JSON.parse(localStorage.getItem('providerApiKeys') || '{}');
  console.log('📦 providerApiKeys:');
  for (const [p, k] of Object.entries(keys)) {
    console.log(`   ${p}: ${k ? k.toString().substring(0, 25) + '...' : '(empty)'}`);
  }
  return keys;
};

console.log('\n✅ SYNC COMPLETE! Now try #claude again.');
