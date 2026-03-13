// instantClarificationTrigger.ts
// Add this to your message input component to trigger clarification on "?" key press

import { detectAmbiguity, ClarificationRequest } from './clarificationManager';

interface InstantTriggerConfig {
  inputElement: HTMLInputElement | HTMLTextAreaElement;
  onClarificationNeeded: (clarification: ClarificationRequest) => void;
  debounceMs?: number;
}

export class InstantClarificationTrigger {
  private inputElement: HTMLInputElement | HTMLTextAreaElement;
  private onClarificationNeeded: (clarification: ClarificationRequest) => void;
  private debounceTimer: NodeJS.Timeout | null = null;
  private debounceMs: number;
  private lastValue: string = '';

  constructor(config: InstantTriggerConfig) {
    this.inputElement = config.inputElement;
    this.onClarificationNeeded = config.onClarificationNeeded;
    this.debounceMs = config.debounceMs || 300;
    
    this.attachListeners();
  }

  private attachListeners(): void {
    // Listen for input changes
    this.inputElement.addEventListener('input', this.handleInput.bind(this));
    
    // Listen for specific key presses
    this.inputElement.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  private handleInput(event: Event): void {
    const currentValue = this.inputElement.value.trim();
    
    // Check for instant triggers
    if (currentValue === '?' || currentValue === '??') {
      console.log('🔍 Instant trigger detected:', currentValue);
      this.triggerClarificationInstantly(currentValue);
      return;
    }
    
    // For other ambiguous patterns, debounce to avoid too many triggers
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      this.checkForAmbiguity(currentValue);
    }, this.debounceMs);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const currentValue = this.inputElement.value.trim();
    
    // If user types "?" and it's the only character, trigger immediately
    if (event.key === '?' && currentValue.length === 0) {
      // Small delay to let the input value update
      setTimeout(() => {
        const newValue = this.inputElement.value.trim();
        if (newValue === '?' || newValue === '??') {
          console.log('⚡ Instant "?" trigger on keypress');
          this.triggerClarificationInstantly(newValue);
        }
      }, 50);
    }
  }

  private triggerClarificationInstantly(message: string): void {
    const clarification = detectAmbiguity(message);
    
    if (clarification) {
      console.log('✅ Showing clarification modal instantly');
      this.onClarificationNeeded(clarification);
      
      // Optionally clear the input after showing clarification
      // this.inputElement.value = '';
    }
  }

  private checkForAmbiguity(message: string): void {
    // Skip if message hasn't changed or is empty
    if (!message || message === this.lastValue) {
      return;
    }
    
    this.lastValue = message;
    
    const clarification = detectAmbiguity(message);
    
    if (clarification) {
      console.log('✅ Ambiguity detected, showing clarification');
      this.onClarificationNeeded(clarification);
    }
  }

  public destroy(): void {
    this.inputElement.removeEventListener('input', this.handleInput.bind(this));
    this.inputElement.removeEventListener('keydown', this.handleKeyDown.bind(this));
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }
}

// ============================================================================
// REACT HOOK VERSION (if you're using React)
// ============================================================================

import { useEffect, useRef } from 'react';

export function useInstantClarification(
  onClarificationNeeded: (clarification: ClarificationRequest) => void
) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const triggerRef = useRef<InstantClarificationTrigger | null>(null);

  useEffect(() => {
    if (inputRef.current) {
      triggerRef.current = new InstantClarificationTrigger({
        inputElement: inputRef.current,
        onClarificationNeeded,
        debounceMs: 300
      });

      console.log('✅ Instant clarification trigger initialized');

      return () => {
        triggerRef.current?.destroy();
      };
    }
  }, [onClarificationNeeded]);

  return inputRef;
}