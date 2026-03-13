// src/utils/pdfContextManager.ts
// ============================================================================
// PDF CONTEXT MANAGER
// Manages PDF attachments as part of the IDE's context system
// ============================================================================

console.log('[PDFContext] Loading module...');

// PDF.js CDN
const PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfjs: any = null;

// ============================================================================
// TYPES
// ============================================================================

export interface PdfAttachment {
  id: string;
  path: string;
  fileName: string;
  fileSize?: number;
  pageCount?: number;
  extractedText?: string;
  isExtracting: boolean;
  extractionProgress: number;
  error?: string;
  addedAt: number;
  ocrMethod?: 'native' | 'vision-ai';  // Track how text was extracted
}

type PdfEventType = 'added' | 'removed' | 'updated' | 'cleared' | 'extraction-start' | 'extraction-done';
type PdfEventCallback = (type: PdfEventType, attachment?: PdfAttachment) => void;

// ============================================================================
// PDF CONTEXT MANAGER CLASS
// ============================================================================

class PdfContextManager {
  private attachments: Map<string, PdfAttachment> = new Map();
  private listeners: Set<PdfEventCallback> = new Set();
  private maxAttachments = 5;
  private maxTextLength = 60000;
  private uiInitialized = false;
  private uiRetryCount = 0;
  private maxUiRetries = 10; // Stop after 10 retries

  constructor() {
    this.initializeUI();
  }

  // ==========================================================================
  // ATTACHMENT MANAGEMENT
  // ==========================================================================

  addPdf(path: string): string {
    const id = `pdf_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const fileName = path.split(/[/\\]/).pop() || 'document.pdf';

    if (this.attachments.size >= this.maxAttachments) {
      this.showNotification(`Maximum ${this.maxAttachments} PDFs allowed`, 'warning');
      return '';
    }

    for (const att of this.attachments.values()) {
      if (att.path === path) {
        this.showNotification(`${fileName} already attached`, 'info');
        return att.id;
      }
    }

    const attachment: PdfAttachment = {
      id,
      path,
      fileName,
      isExtracting: false,
      extractionProgress: 0,
      addedAt: Date.now()
    };

    this.attachments.set(id, attachment);
    this.emit('added', attachment);
    this.updateUI();
    this.showNotification(`PDF attached: ${fileName}`, 'success');

    console.log('[PDFContext] Added:', fileName);

    // Pre-extract in background
    this.preExtractPdf(id);

    return id;
  }

  removePdf(id: string): void {
    const attachment = this.attachments.get(id);
    if (attachment) {
      this.attachments.delete(id);
      this.emit('removed', attachment);
      this.updateUI();
      console.log('[PDFContext] Removed:', attachment.fileName);
    }
  }

  /**
   * Remove attachment by file name (convenience method)
   */
  removeByFileName(fileName: string): boolean {
    for (const [id, att] of this.attachments.entries()) {
      if (att.fileName === fileName) {
        this.removePdf(id);
        return true;
      }
    }
    return false;
  }

  clearAll(): void {
    const count = this.attachments.size;
    this.attachments.clear();
    this.emit('cleared');
    this.updateUI();
    
    // ✅ FIX: Also force-hide the attachment bar immediately
    const bar = document.getElementById('pdf-context-bar');
    if (bar) {
      bar.classList.remove('visible');
    }
    
    if (count > 0) {
      console.log(`[PDFContext] Cleared all (${count} attachments)`);
    }
  }

  getAttachments(): PdfAttachment[] {
    return Array.from(this.attachments.values());
  }

  hasAttachments(): boolean {
    return this.attachments.size > 0;
  }

  getCount(): number {
    return this.attachments.size;
  }

  // ==========================================================================
  // CONTEXT INTEGRATION
  // ==========================================================================

  async getPdfContext(): Promise<string> {
    if (!this.hasAttachments()) return '';

    const parts: string[] = [];
    parts.push('# Attached PDF Documents');
    parts.push('');

    for (const attachment of this.attachments.values()) {
      if (!attachment.extractedText && !attachment.error && !attachment.isExtracting) {
        await this.extractPdf(attachment.id);
      }

      if (attachment.isExtracting) {
        await this.waitForExtraction(attachment.id, 30000);
      }

      if (attachment.extractedText) {
        parts.push(`## ${attachment.fileName}`);
        if (attachment.pageCount) {
          parts.push(`*${attachment.pageCount} pages, ${attachment.extractedText.length.toLocaleString()} characters*`);
        }
        parts.push('');
        parts.push('```text');
        parts.push(attachment.extractedText);
        parts.push('```');
        parts.push('');
      } else if (attachment.error) {
        parts.push(`## ${attachment.fileName}`);
        parts.push(`*Error: ${attachment.error}*`);
        parts.push('');
      }
    }

    return parts.length > 2 ? parts.join('\n') : '';
  }

  getContextSummary(): string {
    if (!this.hasAttachments()) return '';
    
    const count = this.attachments.size;
    const names = Array.from(this.attachments.values())
      .map(a => a.fileName)
      .join(', ');
    
    return `📄 ${count} PDF${count > 1 ? 's' : ''}: ${names}`;
  }

  /**
   * SYNCHRONOUS version - returns already-extracted text only
   * Use this when you can't await
   */
  getPdfContextSync(): string {
    if (!this.hasAttachments()) return '';

    const parts: string[] = [];
    parts.push('\n\n# 📄 Attached PDF Documents\n');

    for (const attachment of this.attachments.values()) {
      if (attachment.extractedText) {
        const lines = (attachment.extractedText.match(/\n/g) || []).length + 1;
        const method = attachment.ocrMethod === 'vision-ai' ? ' [AI Vision OCR]' : '';
        parts.push(`## 📕 ${attachment.fileName} (${lines} lines${method})\n`);
        parts.push('```text');
        parts.push(attachment.extractedText.substring(0, 50000));
        if (attachment.extractedText.length > 50000) {
          parts.push('\n... [truncated - original was ' + attachment.extractedText.length + ' chars]');
        }
        parts.push('```\n');
      } else if (attachment.isExtracting) {
        parts.push(`## 📕 ${attachment.fileName} (extracting...)\n`);
      } else if (attachment.error) {
        parts.push(`## 📕 ${attachment.fileName} (error: ${attachment.error})\n`);
      }
    }

    const result = parts.length > 1 ? parts.join('\n') : '';
    if (result) {
      console.log('[PDFContext] getPdfContextSync returning', result.length, 'chars');
    }
    return result;
  }

  isAllExtracted(): boolean {
    for (const att of this.attachments.values()) {
      if (att.isExtracting || (!att.extractedText && !att.error)) {
        return false;
      }
    }
    return true;
  }

  // ==========================================================================
  // PDF EXTRACTION
  // ==========================================================================

  private async preExtractPdf(id: string): Promise<void> {
    const attachment = this.attachments.get(id);
    if (!attachment || attachment.extractedText || attachment.isExtracting) return;
    await this.extractPdf(id);
  }

  private async extractPdf(id: string): Promise<void> {
    const attachment = this.attachments.get(id);
    if (!attachment) return;

    try {
      attachment.isExtracting = true;
      attachment.extractionProgress = 0;
      this.emit('extraction-start', attachment);
      this.updateUI();

      await this.loadPdfJs();

      const buffer = await this.readFileBinary(attachment.path);
      attachment.extractionProgress = 20;
      this.updateUI();

      const doc = await pdfjs.getDocument({ data: buffer }).promise;
      attachment.pageCount = doc.numPages;
      
      const pages: string[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const text = content.items.map((item: any) => item.str).join(' ');
        pages.push(`[Page ${i}/${doc.numPages}]\n${text}`);
        
        attachment.extractionProgress = 20 + Math.round((i / doc.numPages) * 80);
        this.updateUI();
      }

      let fullText = pages.join('\n\n');

      if (fullText.length > this.maxTextLength) {
        fullText = fullText.substring(0, this.maxTextLength) + '\n\n[... content truncated ...]';
      }

      if (fullText.replace(/\[Page \d+\/\d+\]\s*/g, '').trim().length < 50) {
        // ============================================================
        // 🔍 SCANNED PDF DETECTED → Try AI Vision OCR as fallback
        // ============================================================
        console.log('[PDFContext] Scanned/image PDF detected, attempting AI Vision OCR...');
        attachment.extractionProgress = 50;
        this.updateUI();

        try {
          const ocrText = await this.performVisionOCR(attachment, doc);
          if (ocrText && ocrText.trim().length > 20) {
            attachment.extractedText = ocrText;
            attachment.error = undefined;
            attachment.ocrMethod = 'vision-ai';
            console.log('[PDFContext] ✅ Vision OCR succeeded:', ocrText.length, 'chars');
          } else {
            attachment.error = 'No extractable text (scanned/image PDF) - OCR returned no usable text';
            attachment.extractedText = undefined;
            console.log('[PDFContext] ⚠️ Vision OCR returned insufficient text');
          }
        } catch (ocrError: any) {
          console.error('[PDFContext] ❌ Vision OCR failed:', ocrError.message);
          attachment.error = `Scanned PDF - OCR failed: ${ocrError.message}`;
          attachment.extractedText = undefined;
        }
      } else {
        attachment.extractedText = fullText;
        attachment.error = undefined;
        attachment.ocrMethod = 'native';
      }

      attachment.isExtracting = false;
      attachment.extractionProgress = 100;
      this.emit('extraction-done', attachment);
      this.updateUI();

      console.log('[PDFContext] Extracted:', attachment.fileName, 
        attachment.extractedText?.length || 0, 'chars');
      
      // ✅ Update file card UI with extracted text info
      (window as any).chatFileDrop?.refreshPdfFileCard?.(attachment.fileName);

    } catch (error) {
      attachment.isExtracting = false;
      attachment.error = (error as Error).message;
      this.emit('extraction-done', attachment);
      this.updateUI();
      console.error('[PDFContext] Extraction failed:', error);
    }
  }

  private waitForExtraction(id: string, timeout: number): Promise<void> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const check = () => {
        const att = this.attachments.get(id);
        if (!att || !att.isExtracting || Date.now() - startTime > timeout) {
          resolve();
          return;
        }
        setTimeout(check, 100);
      };
      
      check();
    });
  }

  private async loadPdfJs(): Promise<void> {
    if (pdfjs) return;
    if ((window as any).pdfjsLib) {
      pdfjs = (window as any).pdfjsLib;
      pdfjs.GlobalWorkerOptions.workerSrc = WORKER_URL;
      return;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = PDFJS_URL;
      script.onload = () => {
        pdfjs = (window as any).pdfjsLib;
        if (pdfjs) {
          pdfjs.GlobalWorkerOptions.workerSrc = WORKER_URL;
          console.log('[PDFContext] PDF.js loaded');
        }
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load PDF.js'));
      document.head.appendChild(script);
    });
  }

  private async readFileBinary(path: string): Promise<ArrayBuffer> {
    try {
      const fs = await import('@tauri-apps/plugin-fs');
      const data = await fs.readFile(path);
      return data.buffer;
    } catch (e) {
      console.log('[PDFContext] plugin-fs failed:', e);
    }

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const bytes = await invoke<number[]>('read_file_binary', { path });
      return new Uint8Array(bytes).buffer;
    } catch (e) {
      console.log('[PDFContext] invoke failed:', e);
    }

    throw new Error('Cannot read PDF file');
  }

  // ==========================================================================
  // AI VISION OCR (Fallback for scanned/image PDFs)
  // ==========================================================================

  /**
   * Get current API configuration from localStorage
   */
  /**
   * Providers that do NOT support vision/image inputs
   */
  private readonly NON_VISION_PROVIDERS = ['deepseek', 'operator_x02', 'operator_x01'];

  /**
   * Get API config for Vision OCR - prefers vision-capable providers
   * Falls back to any available vision provider if current one doesn't support it
   */
  private getApiConfig(): { provider: string; apiKey: string; apiBaseUrl: string; model: string } | null {
    try {
      // First, collect ALL available provider configs
      const allConfigs: Array<{ provider: string; apiKey: string; apiBaseUrl: string; model: string }> = [];

      // Get current active provider
      const configStr = localStorage.getItem('aiApiConfig');
      if (configStr) {
        const cfg = JSON.parse(configStr);
        if (cfg.apiKey && cfg.apiBaseUrl && cfg.provider) {
          allConfigs.push(cfg);
        }
      }

      // Get all provider configs
      const providerConfigsStr = localStorage.getItem('providerConfigs');
      if (providerConfigsStr) {
        const configs = JSON.parse(providerConfigsStr);
        for (const [provider, config] of Object.entries(configs)) {
          const c = config as any;
          if (c?.apiKey && !allConfigs.some(ac => ac.provider === provider)) {
            allConfigs.push({
              provider,
              apiKey: c.apiKey,
              apiBaseUrl: c.apiBaseUrl || c.baseUrl || '',
              model: c.model || ''
            });
          }
        }
      }

      // Priority: vision-capable providers first
      const visionCapable = allConfigs.filter(c => !this.NON_VISION_PROVIDERS.includes(c.provider));
      const nonVision = allConfigs.filter(c => this.NON_VISION_PROVIDERS.includes(c.provider));

      // Prefer: groq (free, supports llama-4-scout vision) > claude > openai > others
      const preferredOrder = ['groq', 'claude', 'openai'];
      visionCapable.sort((a, b) => {
        const aIdx = preferredOrder.indexOf(a.provider);
        const bIdx = preferredOrder.indexOf(b.provider);
        return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
      });

      if (visionCapable.length > 0) {
        const chosen = visionCapable[0];
        // Ensure base URL is set for known providers
        if (!chosen.apiBaseUrl) {
          const defaultUrls: Record<string, string> = {
            'groq': 'https://api.groq.com/openai/v1',
            'openai': 'https://api.openai.com/v1',
            'claude': 'https://api.anthropic.com/v1',
          };
          chosen.apiBaseUrl = defaultUrls[chosen.provider] || '';
        }
        console.log(`[PDFContext] 🎯 Selected vision provider: ${chosen.provider} (${visionCapable.length} vision-capable available)`);
        return chosen;
      }

      // No vision-capable provider found, warn and return null
      if (nonVision.length > 0) {
        console.warn(`[PDFContext] ⚠️ No vision-capable provider found. Available providers (${nonVision.map(c => c.provider).join(', ')}) don't support image inputs.`);
        console.warn('[PDFContext] 💡 Configure Claude, OpenAI, or Groq for PDF OCR support.');
        return null;
      }
    } catch (e) {
      console.error('[PDFContext] Failed to read API config:', e);
    }
    return null;
  }

  /**
   * Get the best vision-capable model for a provider
   */
  private getVisionModel(provider: string, currentModel?: string): string {
    const visionModels: Record<string, string> = {
      'deepseek': 'deepseek-chat',
      'operator_x02': 'x02-chat',
      'operator_x01': 'deepseek-chat',
      'claude': 'claude-sonnet-4-20250514',
      'openai': 'gpt-4o',
      'groq': 'meta-llama/llama-4-scout-17b-16e-instruct',
    };

    // If current model is already vision-capable, prefer it
    const knownVisionModels = [
      'deepseek-chat', 'gpt-4o', 'gpt-4-turbo', 'gpt-4-vision',
      'claude-sonnet', 'claude-opus', 'claude-haiku',
      'llama-4-scout', 'llama-4-maverick',
    ];
    
    if (currentModel && knownVisionModels.some(m => currentModel.includes(m))) {
      return currentModel;
    }

    return visionModels[provider] || currentModel || 'deepseek-chat';
  }

  /**
   * Render a PDF page to a base64 PNG image using PDF.js canvas
   */
  private async renderPageToBase64(doc: any, pageNum: number, scale: number = 1.5): Promise<string> {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot create canvas context');

    await page.render({ canvasContext: ctx, viewport }).promise;

    // Get base64 PNG data (without the data:image/png;base64, prefix)
    const dataUrl = canvas.toDataURL('image/png', 0.9);
    const base64 = dataUrl.split(',')[1];

    // Cleanup
    canvas.width = 0;
    canvas.height = 0;

    return base64;
  }

  /**
   * Build the API request messages with vision content
   */
  private buildVisionMessages(provider: string, base64Images: string[], prompt: string): any[] {
    if (provider === 'claude') {
      // Claude uses a different format for images
      const content: any[] = [];
      for (const img of base64Images) {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: img
          }
        });
      }
      content.push({ type: 'text', text: prompt });
      return [{ role: 'user', content }];
    }

    // OpenAI-compatible format (DeepSeek, Groq, OpenAI, Operator)
    const content: any[] = [];
    for (const img of base64Images) {
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:image/png;base64,${img}`,
          detail: 'high'
        }
      });
    }
    content.push({ type: 'text', text: prompt });
    return [{ role: 'user', content }];
  }

  /**
   * Call the AI Vision API to extract text from images
   */
  private async callVisionAPI(
    config: { provider: string; apiKey: string; apiBaseUrl: string; model: string },
    base64Images: string[],
    prompt: string
  ): Promise<string> {
    const visionModel = this.getVisionModel(config.provider, config.model);
    const messages = this.buildVisionMessages(config.provider, base64Images, prompt);

    console.log(`[PDFContext] 🔍 Calling ${config.provider} Vision API (model: ${visionModel}, images: ${base64Images.length})`);

    if (config.provider === 'claude') {
      return this.callClaudeVisionAPI(config, visionModel, messages);
    }

    // OpenAI-compatible endpoint (DeepSeek, Groq, OpenAI, Operator)
    const url = config.apiBaseUrl.replace(/\/$/, '') + '/chat/completions';
    
    // Try browser fetch first
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: visionModel,
          messages,
          max_tokens: 4096,
          temperature: 0.1  // Low temp for accurate text extraction
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API ${response.status}: ${errText.substring(0, 200)}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (fetchError: any) {
      // Check if this is a "vision not supported" error (e.g., DeepSeek returns 400 for image_url)
      const errMsg = fetchError.message || '';
      if (errMsg.includes('image_url') || errMsg.includes('image') || errMsg.includes('400')) {
        console.error(`[PDFContext] ❌ Provider ${config.provider} does not support vision/image inputs`);
        throw new Error(`Provider "${config.provider}" does not support vision/image inputs. Configure Claude, OpenAI, or Groq for OCR.`);
      }

      // For CORS or network errors, try Tauri invoke WITH image data
      console.warn('[PDFContext] Browser fetch failed (CORS?), trying Tauri invoke...', fetchError.message);
      
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        
        // Send the full request body through Tauri (including images)
        const requestBody = JSON.stringify({
          model: visionModel,
          messages,
          max_tokens: 4096,
          temperature: 0.1
        });

        const result = await invoke('proxy_api_request', {
          url,
          method: 'POST',
          headers: JSON.stringify({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
          }),
          body: requestBody
        });
        
        if (typeof result === 'string' && result.length > 0) {
          try {
            const data = JSON.parse(result);
            return data.choices?.[0]?.message?.content || '';
          } catch {
            return result;
          }
        }
        throw new Error('Tauri proxy returned empty result');
      } catch (tauriError: any) {
        throw new Error(`Vision API failed (fetch: ${fetchError.message}, tauri: ${tauriError.message})`);
      }
    }
  }

  /**
   * Call Claude's Vision API (different format from OpenAI)
   */
  private async callClaudeVisionAPI(
    config: { apiKey: string; apiBaseUrl: string },
    model: string,
    messages: any[]
  ): Promise<string> {
    // Browser fetch to Anthropic API
    const url = 'https://api.anthropic.com/v1/messages';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 4096,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude API ${response.status}: ${errText.substring(0, 200)}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || '';
  }

  /**
   * Main Vision OCR pipeline:
   * 1. Render PDF pages to images
   * 2. Send to AI Vision API
   * 3. Return extracted text
   */
  private async performVisionOCR(attachment: PdfAttachment, doc: any): Promise<string> {
    const config = this.getApiConfig();
    if (!config) {
      throw new Error('No vision-capable AI provider found. Configure Claude, OpenAI, or Groq (with API key) for scanned PDF OCR.');
    }

    if (!config.apiKey || config.apiKey.length < 5) {
      throw new Error(`No API key for ${config.provider}. Configure your API key first.`);
    }

    const numPages = doc.numPages;
    const maxOcrPages = 10; // Limit to avoid huge API costs
    const pagesToProcess = Math.min(numPages, maxOcrPages);

    console.log(`[PDFContext] 🔍 OCR: ${pagesToProcess} pages via ${config.provider}`);

    const allPageTexts: string[] = [];
    
    // Process pages in batches (max 4 images per API call for most providers)
    const batchSize = 4;
    
    for (let batchStart = 1; batchStart <= pagesToProcess; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize - 1, pagesToProcess);
      const batchImages: string[] = [];

      // Render pages in this batch to images
      for (let i = batchStart; i <= batchEnd; i++) {
        attachment.extractionProgress = 50 + Math.round((i / pagesToProcess) * 30);
        this.updateUI();

        console.log(`[PDFContext] 📸 Rendering page ${i}/${pagesToProcess}...`);
        const base64 = await this.renderPageToBase64(doc, i, 1.5);
        batchImages.push(base64);
      }

      // Send batch to Vision API
      const pageRange = batchStart === batchEnd 
        ? `page ${batchStart}` 
        : `pages ${batchStart}-${batchEnd}`;

      const prompt = `Extract ALL text from ${batchImages.length > 1 ? 'these document pages' : 'this document page'} (${pageRange} of ${numPages}). 
Rules:
- Return ONLY the extracted text, no commentary or explanation
- Preserve the original layout and structure as much as possible
- Include headers, footers, table content, captions
- If text is in columns, read left to right, top to bottom
- Include any visible numbers, codes, or labels
- If a page contains diagrams/images, briefly describe them in [brackets]`;

      attachment.extractionProgress = 50 + Math.round((batchEnd / pagesToProcess) * 40);
      this.updateUI();

      console.log(`[PDFContext] 🤖 Sending ${pageRange} to ${config.provider} for OCR...`);
      
      const batchText = await this.callVisionAPI(config, batchImages, prompt);
      
      // Format batch results with page markers
      for (let i = batchStart; i <= batchEnd; i++) {
        const pageIdx = i - batchStart;
        if (batchImages.length === 1) {
          allPageTexts.push(`[Page ${i}/${numPages}]\n${batchText}`);
        } else {
          // For multi-page batches, the AI usually returns all pages together
          if (pageIdx === 0) {
            allPageTexts.push(`[Pages ${batchStart}-${batchEnd}/${numPages}]\n${batchText}`);
          }
        }
      }
    }

    if (numPages > maxOcrPages) {
      allPageTexts.push(`\n[... OCR limited to first ${maxOcrPages} of ${numPages} pages ...]`);
    }

    let fullText = allPageTexts.join('\n\n');

    // Truncate if too long
    if (fullText.length > this.maxTextLength) {
      fullText = fullText.substring(0, this.maxTextLength) + '\n\n[... content truncated ...]';
    }

    attachment.extractionProgress = 100;
    this.updateUI();

    return fullText;
  }

  // ==========================================================================
  // EVENT SYSTEM
  // ==========================================================================

  onEvent(callback: PdfEventCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private emit(type: PdfEventType, attachment?: PdfAttachment): void {
    for (const listener of this.listeners) {
      try {
        listener(type, attachment);
      } catch (e) {
        console.error('[PDFContext] Listener error:', e);
      }
    }
  }

  // ==========================================================================
  // UI MANAGEMENT
  // ==========================================================================

  private initializeUI(): void {
    const init = () => {
      if (this.uiInitialized) return;
      this.createStyles();
      this.createAttachmentBar();
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => setTimeout(init, 1000));
    } else {
      setTimeout(init, 1000);
    }
  }

  private createStyles(): void {
    if (document.getElementById('pdf-context-styles')) return;

    const style = document.createElement('style');
    style.id = 'pdf-context-styles';
    style.textContent = `
      .pdf-context-bar {
        display: none;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        border: 1px solid #334155;
        border-radius: 8px;
        margin: 8px 0;
        position: relative;
      }

      .pdf-context-bar.visible {
        display: flex;
      }

      .pdf-context-bar.floating {
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10000;
        max-width: 600px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      }

      .pdf-bar-label {
        font-size: 11px;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding-right: 10px;
        border-right: 1px solid #334155;
      }

      .pdf-chip {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 5px 8px 5px 10px;
        background: #334155;
        border-radius: 16px;
        font-size: 12px;
        color: #e2e8f0;
        max-width: 180px;
        transition: all 0.2s ease;
        animation: pdfChipIn 0.2s ease;
      }

      @keyframes pdfChipIn {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
      }

      .pdf-chip.extracting {
        background: linear-gradient(90deg, #1e40af, #3b82f6);
      }

      .pdf-chip.error {
        background: #7f1d1d;
      }

      .pdf-chip.ready {
        background: #14532d;
      }

      .pdf-chip-icon {
        font-size: 14px;
        flex-shrink: 0;
      }

      .pdf-chip-name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 500;
      }

      .pdf-chip-status {
        font-size: 10px;
        color: #94a3b8;
      }

      .pdf-chip-remove {
        background: none;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        padding: 2px;
        font-size: 14px;
        line-height: 1;
        border-radius: 50%;
        transition: all 0.15s;
      }

      .pdf-chip-remove:hover {
        background: rgba(239, 68, 68, 0.3);
        color: #fca5a5;
      }

      .pdf-notification {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 10px 16px;
        border-radius: 8px;
        font-size: 13px;
        color: white;
        z-index: 100000;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        animation: notifIn 0.2s ease;
      }

      @keyframes notifIn {
        from { opacity: 0; transform: translateX(20px); }
        to { opacity: 1; transform: translateX(0); }
      }

      .pdf-notification.success { background: #16a34a; }
      .pdf-notification.error { background: #dc2626; }
      .pdf-notification.warning { background: #d97706; }
      .pdf-notification.info { background: #2563eb; }
    `;
    document.head.appendChild(style);
  }

  private createAttachmentBar(): void {
    if (this.uiInitialized) return;
    
    // Extended list of selectors to find the chat area
    const selectors = [
      '.ai-chat-container',
      '.chat-container',
      '.chat-input-container',
      '.input-area',
      '#chat-input-area',
      '.message-input-container',
      '[data-chat-input]',
      '.assistant-input',
      '.ai-input-area'
    ];

    let container: Element | null = null;
    
    for (const selector of selectors) {
      container = document.querySelector(selector);
      if (container) {
        console.log('[PDFContext] Found container with selector:', selector);
        break;
      }
    }

    // If not found, create a floating bar instead
    if (!container) {
      this.uiRetryCount++;
      
      if (this.uiRetryCount < this.maxUiRetries) {
        setTimeout(() => this.createAttachmentBar(), 2000);
        return;
      }
      
      // After max retries, create a floating bar
      console.log('[PDFContext] Using floating bar mode');
      this.createFloatingBar();
      return;
    }

    if (document.getElementById('pdf-context-bar')) {
      this.uiInitialized = true;
      return;
    }

    const bar = document.createElement('div');
    bar.id = 'pdf-context-bar';
    bar.className = 'pdf-context-bar';

    const label = document.createElement('span');
    label.className = 'pdf-bar-label';
    label.textContent = '📄 PDFs';
    bar.appendChild(label);

    // Insert at the beginning of the container
    container.insertBefore(bar, container.firstChild);
    
    this.uiInitialized = true;
    console.log('[PDFContext] Attachment bar created');
  }

  private createFloatingBar(): void {
    if (document.getElementById('pdf-context-bar')) return;

    const bar = document.createElement('div');
    bar.id = 'pdf-context-bar';
    bar.className = 'pdf-context-bar floating';

    const label = document.createElement('span');
    label.className = 'pdf-bar-label';
    label.textContent = '📄 PDFs';
    bar.appendChild(label);

    document.body.appendChild(bar);
    
    this.uiInitialized = true;
    console.log('[PDFContext] Floating bar created');
  }

  private updateUI(): void {
    const bar = document.getElementById('pdf-context-bar');
    if (!bar) {
      if (!this.uiInitialized) {
        this.createAttachmentBar();
      }
      return;
    }

    bar.classList.toggle('visible', this.attachments.size > 0);

    // Keep label, remove chips
    const label = bar.querySelector('.pdf-bar-label');
    bar.innerHTML = '';
    if (label) bar.appendChild(label);

    for (const attachment of this.attachments.values()) {
      bar.appendChild(this.createChip(attachment));
    }
  }

  private createChip(att: PdfAttachment): HTMLElement {
    const chip = document.createElement('div');
    chip.className = 'pdf-chip';
    chip.dataset.id = att.id;

    if (att.isExtracting) {
      chip.classList.add('extracting');
    } else if (att.error) {
      chip.classList.add('error');
    } else if (att.extractedText) {
      chip.classList.add('ready');
    }

    // Icon
    const icon = document.createElement('span');
    icon.className = 'pdf-chip-icon';
    if (att.error) {
      icon.textContent = '⚠️';
    } else if (att.extractedText) {
      icon.textContent = '✅';
    } else if (att.isExtracting) {
      icon.textContent = '⏳';
    } else {
      icon.textContent = '📄';
    }
    chip.appendChild(icon);

    // Name
    const name = document.createElement('span');
    name.className = 'pdf-chip-name';
    name.textContent = att.fileName;
    name.title = att.path;
    chip.appendChild(name);

    // Status
    if (att.isExtracting) {
      const status = document.createElement('span');
      status.className = 'pdf-chip-status';
      if (att.extractionProgress > 45) {
        status.textContent = `🤖 OCR ${att.extractionProgress}%`;
        chip.classList.remove('extracting');
        chip.style.background = 'linear-gradient(90deg, #7c3aed, #a855f7)';
      } else {
        status.textContent = `${att.extractionProgress}%`;
      }
      chip.appendChild(status);
    } else if (att.extractedText) {
      const status = document.createElement('span');
      status.className = 'pdf-chip-status';
      const sizeLabel = `${Math.round(att.extractedText.length / 1000)}K`;
      status.textContent = att.ocrMethod === 'vision-ai' ? `🤖 ${sizeLabel}` : sizeLabel;
      chip.appendChild(status);
    }

    // Remove button
    const remove = document.createElement('button');
    remove.className = 'pdf-chip-remove';
    remove.innerHTML = '×';
    remove.title = 'Remove';
    remove.onclick = (e) => {
      e.stopPropagation();
      this.removePdf(att.id);
    };
    chip.appendChild(remove);

    return chip;
  }

  private showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    const existing = document.querySelector('.pdf-notification');
    existing?.remove();

    const notif = document.createElement('div');
    notif.className = `pdf-notification ${type}`;
    notif.textContent = message;
    document.body.appendChild(notif);

    setTimeout(() => notif.remove(), 3000);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const pdfContextManager = new PdfContextManager();

(window as any).pdfContextManager = pdfContextManager;

console.log('[PDFContext] Manager ready');
