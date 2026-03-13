// utils/securityUtils.ts - Command security checks

// Security: Command whitelist
const ALLOWED_CMD_COMMANDS = ['dir', 'ipconfig', 'echo', 'systeminfo', 'type', 'ver'];
const ALLOWED_PS_COMMANDS = ['Get-Process', 'Get-Service', 'Get-ChildItem', 'Get-ComputerInfo'];

// Check if command is allowed (basic security)
export function isCommandAllowed(command: string, isPowerShell: boolean): boolean {
  // Extract base command
  const baseCommand = command.split(' ')[0].trim();
  
  if (isPowerShell) {
    return ALLOWED_PS_COMMANDS.some(cmd => baseCommand.startsWith(cmd));
  } else {
    return ALLOWED_CMD_COMMANDS.some(cmd => baseCommand === cmd);
  }
  
  // For development, return true for all commands
  // return true;
}