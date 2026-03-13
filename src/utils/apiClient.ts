// utils/apiClient.ts - API communication functions

import { Message } from '../types';

// Call Deepseek API with enhanced error handling
export async function callDeepseekAPI(apiKey: string, apiBaseUrl: string, messages: Message[]): Promise<any> {
  try {
    if (!apiKey) {
      throw new Error('API key is not set');
    }
    
    if (!apiBaseUrl) {
      throw new Error('API base URL is not set');
    }
    
    const response = await fetch(`${apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    // First check HTTP status
    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage: string;
      
      try {
        // Try to parse as JSON
        const errorData = JSON.parse(errorBody);
        errorMessage = errorData.error?.message || 
          errorData.message || 
          `API request failed with status ${response.status}`;
      } catch (e) {
        // If not JSON, use text
        errorMessage = errorBody || `API request failed with status ${response.status}`;
      }
      
      throw new Error(errorMessage);
    }

    // Parse successful response
    return await response.json();
  } catch (error) {
    console.error('API call error:', error);
    
    // Enhance error message for network issues
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error(`Network error: Could not connect to Deepseek API. Please check your internet connection and API URL.`);
    }
    
    throw error;
  }
}