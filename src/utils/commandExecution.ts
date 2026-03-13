// utils/commandExecution.ts - Command execution logic

import { Conversation, Message } from '../types';
import { 
  conversations, 
  currentConversationId,
  updateConversation,
  saveConversations
} from '../state';
import { renderConversationList, renderCurrentConversation } from '../ui';
import { saveToCommandHistory } from './commandHistory';
import { isCommandAllowed } from './securityUtils';
import { formatCommandOutput, setupCopyButtonsHandler } from './commandFormatting';
import { escapeHtml } from './messageFormatting';

// Execute command with enhanced mock responses
export async function executeCommand(command: string, isPowerShell: boolean = false): Promise<string> {
  try {
    console.log(`Executing ${isPowerShell ? 'PowerShell' : 'CMD'} command:`, command);
    
    // Security check (uncomment when ready to enforce)
    // if (!isCommandAllowed(command, isPowerShell)) {
    //   return `Error: Command not allowed for security reasons. Please use one of the allowed commands.`;
    // }
    
    // Save to command history
    saveToCommandHistory(command, isPowerShell);
    
    // Mock different outputs for different command types
    if (isPowerShell) {
      if (command.includes('Get-Process')) {
        return `Handles  NPM(K)    PM(K)     WS(K)     CPU(s)     Id  SI ProcessName
-------  ------    -----     -----     ------     --  -- -----------
   1244      51    27936     82768      25.20   9468   1 chrome
    168      12     2308      9760       0.09   2916   1 cmd
    264      18    20636     38196      15.77  12452   1 Code
    144      11     1964      9808       0.39   8172   1 conhost
    154      15     3576     13088       0.58  14744   1 explorer
    160      14     2404     10116       0.08  13024   1 powershell
    241      17     3832     18456       2.91   7924   1 WindowsTerminal`;
      } else if (command.includes('Get-Service')) {
        return `Status   Name               DisplayName
------   ----               -----------
Running  AdobeARMservice    Adobe Acrobat Update Service
Stopped  AJRouter           AllJoyn Router Service
Running  AppHostSvc         Application Host Helper Service
Running  Appinfo            Application Information
Running  AppXSvc            AppX Deployment Service`;
      } else if (command.includes('Get-ChildItem')) {
        return `    Directory: C:\\Users\\Username

Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
d-r---        11/15/2022  10:19 PM                Desktop
d-r---        11/15/2022  10:19 PM                Documents
d-r---        11/15/2022  10:19 PM                Downloads
d-r---        11/15/2022  10:19 PM                Music
d-r---        11/15/2022  10:19 PM                Pictures
d-r---        11/15/2022  10:19 PM                Videos`;
      } else if (command.includes('Get-ComputerInfo')) {
        return `WindowsBuildLabEx                                       : 9200.16384.amd64fre.win8_rtm.120725-1247
WindowsCurrentVersion                                  : 6.3
WindowsEditionId                                       : Professional
WindowsInstallationType                                : Client
WindowsInstallDateFromRegistry                         : 1/25/2023 12:00:00 AM
WindowsProductId                                       : 00000-00000-00000-DEMO1
WindowsProductName                                     : Windows 10 Pro
WindowsVersion                                         : 2009`;
      }
    } else {
      // CMD commands
      if (command.includes('ipconfig')) {
        return `Windows IP Configuration

Ethernet adapter Ethernet:
   Connection-specific DNS Suffix  . : localdomain
   IPv4 Address. . . . . . . . . . . : 192.168.1.100
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . : 192.168.1.1

Wireless LAN adapter Wi-Fi:
   Connection-specific DNS Suffix  . : 
   IPv4 Address. . . . . . . . . . . : 192.168.1.101
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . : 192.168.1.1`;
      } else if (command.includes('dir')) {
        return ` Volume in drive C has no label.
 Volume Serial Number is 1234-5678

 Directory of C:\\Users

05/15/2023  08:30 AM    <DIR>          .
05/15/2023  08:30 AM    <DIR>          ..
05/15/2023  08:30 AM    <DIR>          Administrator
05/15/2023  08:30 AM    <DIR>          Public
05/15/2023  08:30 AM    <DIR>          YourUsername
               0 File(s)              0 bytes
               5 Dir(s)  191,735,173,120 bytes free`;
      } else if (command.includes('systeminfo')) {
        return `Host Name:                 DESKTOP-PC
OS Name:                   Microsoft Windows 10 Pro
OS Version:                10.0.19044 N/A Build 19044
OS Manufacturer:           Microsoft Corporation
OS Configuration:          Standalone Workstation
OS Build Type:             Multiprocessor Free
Registered Owner:          Windows User
System Manufacturer:       System manufacturer
System Model:              System Product Name
System Type:               x64-based PC
Processor(s):              1 Processor(s) Installed.
BIOS Version:              American Megatrends Inc. 0604, 1/12/2021
Windows Directory:         C:\\Windows
System Directory:          C:\\Windows\\system32
Boot Device:               \\Device\\HarddiskVolume1
System Locale:             en-us;English (United States)
Total Physical Memory:     16,384 MB
Available Physical Memory: 8,192 MB
Virtual Memory: Max Size:  32,768 MB`;
      } else if (command.includes('echo')) {
        const echoContent = command.substring(5); // Remove 'echo '
        return echoContent;
      } else if (command.includes('ver')) {
        return `Microsoft Windows [Version 10.0.19044.2728]`;
      } else if (command === 'help') {
        return `For more information on a specific command, type HELP command-name

ASSOC          Displays or modifies file extension associations.
ATTRIB         Displays or changes file attributes.
BREAK          Sets or clears extended CTRL+C checking.
BCDEDIT        Sets properties in boot database to control boot loading.
CACLS          Displays or modifies access control lists (ACLs) of files.
CALL           Calls one batch program from another.
CD             Displays the name of or changes the current directory.
CHCP           Displays or sets the active code page number.
CHDIR          Displays the name of or changes the current directory.
CHKDSK         Checks a disk and displays a status report.
CHKNTFS        Displays or modifies the checking of disk at boot time.
CLS            Clears the screen.
CMD            Starts a new instance of the Windows command interpreter.
COLOR          Sets the default console foreground and background colors.
COMP           Compares the contents of two files or sets of files.
COMPACT        Displays or alters the compression of files on NTFS partitions.
CONVERT        Converts FAT volumes to NTFS.  You cannot convert the
               current drive.
COPY           Copies one or more files to another location.
DATE           Displays or sets the date.
DEL            Deletes one or more files.
DIR            Displays a list of files and subdirectories in a directory.`;
      }
    }
    
    // Default mock response if no specific mock is defined
    return `Mock output for ${isPowerShell ? 'PowerShell' : 'CMD'} command: ${command}`;
  } catch (error) {
    console.error(`${isPowerShell ? 'PowerShell' : 'CMD'} execution error:`, error);
    return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

// Add a flag to track if a command is currently being processed
let isProcessingCommand = false;

// Handle command execution with improved organization
export async function handleCommandExecution(commandText: string): Promise<boolean> {
  // Check if the text is actually a command
  if (!isCommandText(commandText)) {
    console.log('Not a recognized command format:', commandText);
    return false;
  }
  
  try {
    // We INTENTIONALLY do not check isProcessingCommand flag here
    // This is a key change to enable continuous command input
    console.log('Starting command execution:', commandText);
    
    // Set the flag to indicate we're processing a command
    isProcessingCommand = true;
    
    // Check if we need to create a new conversation first
    await ensureConversationExists();
    
    const { command, isPowerShell } = parseCommand(commandText);
    
    // Update conversation title for command execution
    updateConversationTitleForCommand(command, isPowerShell);
    
    // Execute the command
    const result = await executeCommand(command, isPowerShell);
    
    // Add the result to the conversation
    const commandType = isPowerShell ? 'PowerShell' : 'CMD';
    addCommandResultToConversation(command, result, commandType);
    
    console.log('Command execution completed successfully:', commandText);
    return true; // Indicate the command was handled
  } catch (error) {
    console.error('Error executing command:', error);
    
    // If we have a current conversation, add error message to it
    if (currentConversationId) {
      const conversation = conversations.find(c => c.id === currentConversationId);
      if (conversation) {
        conversation.messages.push({
          role: 'assistant',
          content: `<div class="error-message">Error executing command: ${error instanceof Error ? error.message : 'Unknown error'}</div>`
        });
        saveConversations();
        renderCurrentConversation();
      }
    }
    
    return false;
  } finally {
    // CRITICAL: Always reset the processing flag to allow new commands
    // This ensures the terminal can process the next command
    console.log('Resetting command processing flag');
    isProcessingCommand = false;
  }
}

// Helper: Check if text is a command
function isCommandText(text: string): boolean {
  return text.startsWith('/cmd ') || text.startsWith('/ps ') || text === '/help' || text === '/clear';
}

// Helper: Parse command text
function parseCommand(commandText: string): { command: string, isPowerShell: boolean } {
  if (commandText.startsWith('/cmd ')) {
    return { 
      command: commandText.substring(5), 
      isPowerShell: false 
    };
  } else if (commandText.startsWith('/ps ')) {
    return { 
      command: commandText.substring(4), 
      isPowerShell: true 
    };
  } else if (commandText === '/help' || commandText === '/clear') {
    // Handle special internal commands
    return {
      command: commandText.substring(1), // Remove the leading slash
      isPowerShell: false
    };
  }
  
  throw new Error('Invalid command format');
}

// Helper: Ensure a conversation exists
async function ensureConversationExists(): Promise<void> {
  if (!currentConversationId) {
    console.log('Creating new conversation for command execution');
    const { createNewConversation } = await import('../conversation');
    createNewConversation();
    
    // Add a small delay to ensure the conversation is created
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Helper function to update conversation title for command execution
function updateConversationTitleForCommand(command: string, isPowerShell: boolean): void {
  if (currentConversationId) {
    const conversation = conversations.find(c => c.id === currentConversationId);
    if (conversation && conversation.messages.length === 0) {
      const prefix = isPowerShell ? 'PS' : 'CMD';
      updateConversation(conversation.id, {
        title: `${prefix}: ${command.substring(0, 25)}` + (command.length > 25 ? '...' : '')
      });
      renderConversationList();
    }
  }
}

// Helper function to add command result to conversation with improved copy functionality
function addCommandResultToConversation(command: string, result: string, commandType: string): void {
  if (currentConversationId) {
    const conversation = conversations.find(c => c.id === currentConversationId);
    if (conversation) {
      // Add command as user message with special formatting
      conversation.messages.push({
        role: 'user',
        content: `${commandType}: ${command}`
      });
      
      // Add result as assistant message with enhanced formatting
      conversation.messages.push({
        role: 'assistant',
        content: `<div class="cmd-response">
          <div class="cmd-header">
            <span class="cmd-icon">${commandType === 'PowerShell' ? '💻' : '💻'}</span> 
            <span class="cmd-title">${commandType} OUTPUT</span>
            <span class="cmd-copy" data-content="${escapeHtml(result)}" title="Copy to clipboard">📋</span>
          </div>
          <pre class="cmd-output ${commandType.toLowerCase()}-output"><code>${formatCommandOutput(result)}</code></pre>
        </div>`
      });
      
      saveConversations();
      renderCurrentConversation();
      
      // Add click event for copy button after rendering
      setupCopyButtonsHandler();
    }
  }

  console.log("Adding command result to conversation", {
    command,
    result,
    commandType,
    isPowerShell: commandType === 'PowerShell'
  });
}