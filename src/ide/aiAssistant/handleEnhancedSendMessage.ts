// Updated handleEnhancedSendMessage with clarification system

async function handleEnhancedSendMessage(): Promise<void> {
  const messageInput = document.getElementById('ai-assistant-input') as HTMLInputElement | HTMLTextAreaElement;
  const chatContainer = document.querySelector('.ai-chat-container');
  
  if (!messageInput || !chatContainer) {
    console.error('Required elements not found');
    return;
  }
  
  const originalMessage = messageInput.value.trim();
  
  if (!originalMessage && attachedFiles.length === 0) return;
  
  let fullMessage = originalMessage;
  let displayMessage = originalMessage;
  
  // Handle file attachments
  if (attachedFiles.length > 0) {
    fullMessage += '\n\n[Attached Files]:';
    attachedFiles.forEach(file => {
      fullMessage += `\n\n--- ${file.name} (${formatFileSize(file.size)}) ---\n${file.content}`;
    });
    
    if (displayMessage) {
      displayMessage += ' [📎 ' + attachedFiles.map(f => f.icon + ' ' + f.name).join(', ') + ']';
    } else {
      displayMessage = '[📎 ' + attachedFiles.map(f => f.icon + ' ' + f.name).join(', ') + ']';
    }
  }
  
  // Check for project creation
  if (isProjectCreationRequest(originalMessage)) {
    await handleProjectScaffoldingRequest(originalMessage, messageInput);
    attachedFiles = [];
    updateAttachmentDisplay();
    return;
  }
  
  // ============================================================================
  // NEW: AMBIGUITY DETECTION & CLARIFICATION
  // ============================================================================
  
  console.log('🔍 Checking for ambiguity...');
  const clarificationRequest = clarificationManager.detectAmbiguity(fullMessage);
  
  if (clarificationRequest) {
    console.log('❓ Ambiguous query detected, requesting clarification...');
    
    // Show clarification UI and wait for user choice
    showClarificationDialog(clarificationRequest, async (selectedOption) => {
      console.log('✅ User selected:', selectedOption.label);
      
      // Enhance message with clarification
      const clarifiedMessage = enhanceMessageWithClarification(
        fullMessage,
        selectedOption
      );
      
      // Now send the clarified message
      await sendClarifiedMessage(
        clarifiedMessage,
        displayMessage,
        originalMessage,
        messageInput
      );
    });
    
    // Don't clear input yet - user might cancel
    return;
  }
  
  // ============================================================================
  // NO AMBIGUITY: PROCEED NORMALLY
  // ============================================================================
  
  await sendClarifiedMessage(fullMessage, displayMessage, originalMessage, messageInput);
}

// ============================================================================
// SEND CLARIFIED MESSAGE
// ============================================================================

async function sendClarifiedMessage(
  fullMessage: string,
  displayMessage: string,
  originalMessage: string,
  messageInput: HTMLInputElement | HTMLTextAreaElement
): Promise<void> {
  
  // Clear input
  messageInput.value = '';
  if (messageInput instanceof HTMLTextAreaElement) {
    messageInput.style.height = 'auto';
  }
  
  attachedFiles = [];
  updateAttachmentDisplay();
  
  // Add user message to chat
  const messageId = generateId();
  await addMessageToChat('user', displayMessage, true, messageId);
  
  // Save message
  const codeContext = getCurrentCodeContext();
  queueMessageForSaving('user', fullMessage, {
    fileName: codeContext.fileName,
    language: codeContext.language,
    codeContext: isInCodeAnalysis(),
    code: isInCodeAnalysis() ? codeContext.code : undefined
  });
  
  updateConversationInfo();
  showTypingIndicator();
  
  try {
    // Context enhancement
    let enhancedMessage: string;
    try {
      console.log('🧠 Enhancing message with intelligent context...');
      enhancedMessage = await enhanceMessageWithContext(fullMessage);
      console.log('✅ Context enhancement complete');
    } catch (error) {
      console.error('❌ Context enhancement failed:', error);
      enhancedMessage = fullMessage;
    }
    
    // API configuration
    const config = getCurrentApiConfigurationForced();
    
    if (!config.apiKey || !config.apiBaseUrl) {
      await hideTypingIndicator();
      addSystemMessage(`${getProviderDisplayName(config.provider)} API not configured. Click settings to configure.`);
      return;
    }
    
    // Add code context if in analysis mode
    let apiPrompt = enhancedMessage;
    
    if (isInCodeAnalysis() && codeContext.code && !enhancedMessage.includes(codeContext.code)) {
      apiPrompt = `Analyzing ${codeContext.language} code in ${codeContext.fileName}:

\`\`\`${codeContext.language}
${codeContext.code}
\`\`\`

${enhancedMessage}`;
    }
    
    // Call AI API
    const apiResponse = await callGenericAPI(apiPrompt, config);
    
    // Add AI response to chat
    const responseId = generateId();
    await addMessageToChat('assistant', apiResponse, true, responseId);
    
    // Save AI response
    queueMessageForSaving('assistant', apiResponse, {
      messageType: isInCodeAnalysis() ? 'code-analysis' : 'normal',
      provider: config.provider
    });
    
    // Learning from interaction
    try {
      console.log('🧠 Learning from interaction...');
      await learnFromInteraction(originalMessage, apiResponse);
      console.log('✅ Learning complete');
    } catch (learningError) {
      console.error('❌ Learning failed:', learningError);
    }
    
    await hideTypingIndicator(100);
    updateConversationInfo();
    
  } catch (error) {
    await hideTypingIndicator();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addSystemMessage(`API Error: ${errorMessage}`);
    console.error('API call failed:', error);
    
    try {
      trackError(errorMessage);
    } catch (trackErr) {
      console.error('Failed to track error:', trackErr);
    }
  }
}

// ============================================================================
// ENHANCE MESSAGE WITH CLARIFICATION
// ============================================================================

function enhanceMessageWithClarification(
  originalMessage: string,
  selectedOption: ClarificationOption
): string {
  // Build enhanced message based on selected option
  let enhanced = originalMessage;
  
  // Add explicit context based on option type
  switch (selectedOption.id) {
    case 'current_file':
      enhanced += `\n\n[Clarification: Referring to code in the currently open file in editor]`;
      break;
      
    case 'create_new':
      enhanced += `\n\n[Clarification: Please create new code, not referring to existing code]`;
      break;
      
    case 'conversation_code':
      enhanced += `\n\n[Clarification: Referring to code we discussed in recent conversation]`;
      break;
      
    case 'new_file':
      enhanced += `\n\n[Clarification: Create in a new file]`;
      break;
      
    case 'just_show':
      enhanced += `\n\n[Clarification: Just show me the code, don't create files]`;
      break;
      
    case 'describe_error':
      enhanced += `\n\n[Clarification: I will describe the error to you]`;
      break;
      
    default:
      // For specific file/function references
      if (selectedOption.id.startsWith('recent_')) {
        enhanced += `\n\n[Clarification: Referring to ${selectedOption.label}]`;
      } else if (selectedOption.id.startsWith('file_')) {
        enhanced += `\n\n[Clarification: Referring to file ${selectedOption.label}]`;
      } else if (selectedOption.id.startsWith('function_')) {
        enhanced += `\n\n[Clarification: Referring to function ${selectedOption.label}]`;
      } else {
        enhanced += `\n\n[Clarification: ${selectedOption.context}]`;
      }
  }
  
  return enhanced;
}
