// utils/commandHistory.ts - Command history management

// Command history management
const MAX_COMMAND_HISTORY = 20;
let commandHistory: {cmd: string, isPowerShell: boolean}[] = [];

// Save command to history
export function saveToCommandHistory(command: string, isPowerShell: boolean): void {
  // Don't add duplicates at the top of history
  if (commandHistory.length > 0 && 
      commandHistory[0].cmd === command && 
      commandHistory[0].isPowerShell === isPowerShell) {
    return;
  }
  
  // Add to beginning of array
  commandHistory.unshift({ cmd: command, isPowerShell });
  
  // Trim history to maximum length
  if (commandHistory.length > MAX_COMMAND_HISTORY) {
    commandHistory.pop();
  }
  
  // Optionally persist to localStorage
  try {
    localStorage.setItem('commandHistory', JSON.stringify(commandHistory));
  } catch (error) {
    console.warn('Failed to save command history:', error);
  }
}

// Load command history from storage
export function loadCommandHistory(): void {
  try {
    const saved = localStorage.getItem('commandHistory');
    if (saved) {
      commandHistory = JSON.parse(saved);
    }
  } catch (error) {
    console.warn('Failed to load command history:', error);
  }
}

// Get command history
export function getCommandHistory(): {cmd: string, isPowerShell: boolean}[] {
  return [...commandHistory]; // Return copy to prevent mutations
}