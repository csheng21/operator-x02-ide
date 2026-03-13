// store.ts
import { Conversation, Message } from './types';

export interface AppState {
  apiKey: string;
  apiBaseUrl: string;
  conversations: Conversation[];
  currentConversationId: string | null;
}

// Initial state
const state: AppState = {
  apiKey: '',
  apiBaseUrl: 'PROXY',
  conversations: [],
  currentConversationId: null
};

// State getters
export const getState = () => ({ ...state });
export const getApiKey = () => state.apiKey;
export const getApiBaseUrl = () => state.apiBaseUrl;
export const getConversations = () => [...state.conversations];
export const getCurrentConversationId = () => state.currentConversationId;
export const getCurrentConversation = () => {
  if (!state.currentConversationId) return null;
  return state.conversations.find(c => c.id === state.currentConversationId) || null;
};

// State setters
export const setApiKey = (key: string) => {
  state.apiKey = key;
  localStorage.setItem('apiKey', key);
};

export const setApiBaseUrl = (url: string) => {
  state.apiBaseUrl = url;
  localStorage.setItem('apiBaseUrl', url);
};

export const setCurrentConversationId = (id: string | null) => {
  state.currentConversationId = id;
  if (id) {
    localStorage.setItem('currentConversationId', id);
  } else {
    localStorage.removeItem('currentConversationId');
  }
};

// More complex operations
export const addConversation = (conversation: Conversation) => {
  state.conversations.push(conversation);
  saveConversations();
};

export const updateConversation = (id: string, updates: Partial<Conversation>) => {
  const index = state.conversations.findIndex(c => c.id === id);
  if (index !== -1) {
    state.conversations[index] = { ...state.conversations[index], ...updates };
    saveConversations();
  }
};

export const removeConversation = (id: string) => {
  state.conversations = state.conversations.filter(c => c.id !== id);
  saveConversations();
  
  if (state.currentConversationId === id) {
    if (state.conversations.length > 0) {
      setCurrentConversationId(state.conversations[0].id);
    } else {
      setCurrentConversationId(null);
    }
  }
  
  return state.conversations;
};

// Persistence helpers
export const loadFromStorage = () => {
  try {
    // Load API settings
    const savedApiKey = localStorage.getItem('apiKey');
    if (savedApiKey) state.apiKey = savedApiKey;
    
    const savedBaseUrl = localStorage.getItem('apiBaseUrl');
    if (savedBaseUrl) state.apiBaseUrl = savedBaseUrl;
    
    // Load conversations
    const savedConversations = localStorage.getItem('conversations');
    if (savedConversations) {
      state.conversations = JSON.parse(savedConversations);
    }
    
    // Load current conversation ID
    const savedCurrentId = localStorage.getItem('currentConversationId');
    if (savedCurrentId) {
      state.currentConversationId = savedCurrentId;
    }
  } catch (error) {
    console.error('Failed to load from storage:', error);
  }
};

export const saveConversations = () => {
  localStorage.setItem('conversations', JSON.stringify(state.conversations));
};