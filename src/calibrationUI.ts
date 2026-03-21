// calibrationUI.ts - Professional Calibration Panel UI
// ============================================================================
// Enhanced UI with consistent sizing, smooth animations, and compact design
// ============================================================================

import { 
  getCalibrationManager, 
  CapabilityStatus,
  TestResult 
} from './providerCalibration';
import { ProviderName, TaskType } from './multiProviderOrchestrator';

// ============================================================================
// PROVIDER ICONS AND COLORS
// ============================================================================

const PROVIDER_ICONS: Record<ProviderName, string> = {
  operator_x02: '🔮',
  groq: '⚡',
  gemini: '✨',
  deepseek: '🔵',
  claude: '🟠',
  openai: '🟢'
};

const PROVIDER_COLORS: Record<ProviderName, string> = {
  operator_x02: '#9c27b0',
  groq: '#f55036',
  gemini: '#ff9800',
  deepseek: '#2196f3',
  claude: '#ff7043',
  openai: '#10a37f'
};

// SVG Icons for tasks - professional look
const TASK_ICONS: Record<TaskType, string> = {
  code_generation: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`,
  code_fix: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>`,
  code_explain: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`,
  quick_answer: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
  complex_reasoning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a8 8 0 0 0-8 8c0 3.5 2.5 6.5 6 7.5V22h4v-4.5c3.5-1 6-4 6-7.5a8 8 0 0 0-8-8z"></path><path d="M12 6v4"></path><circle cx="12" cy="14" r="1"></circle></svg>`,
  creative_writing: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>`,
  image_analysis: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`,
  translation: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`,
  summarize: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
  general: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`
};

const TASK_SHORT_LABELS: Record<TaskType, string> = {
  code_generation: 'Code',
  code_fix: 'Fix',
  code_explain: 'Docs',
  quick_answer: 'Quick',
  complex_reasoning: 'Think',
  creative_writing: 'Write',
  image_analysis: 'Vision',
  translation: 'Lang',
  summarize: 'Sum',
  general: 'Chat'
};

// Provider SVG icons
const PROVIDER_SVG_ICONS: Record<ProviderName, string> = {
  operator_x02: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>`,
  groq: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f55036" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  gemini: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff9800" stroke-width="2"><path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z"/><path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z"/></svg>`,
  deepseek: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2196f3" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>`,
  claude: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff7043" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
  openai: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10a37f" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`
};

// ============================================================================
// STYLES
// ============================================================================

const CALIBRATION_STYLES = `
  @keyframes calFadeIn {
    from { opacity: 0; transform: scale(0.96) translateY(-10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes calSlideIn {
    from { opacity: 0; transform: translateX(-10px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes calPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
  @keyframes calShimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  
  #calibration-panel {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(8px);
    z-index: 100001;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: calFadeIn 0.25s ease-out;
  }
  
  .cal-panel {
    background: linear-gradient(145deg, #1e1e2e 0%, #13131d 100%);
    border-radius: 12px;
    width: 760px;
    height: 520px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.08);
    overflow: hidden;
  }
  
  .cal-header {
    padding: 14px 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(0, 0, 0, 0.25);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }
  
  .cal-header h2 {
    margin: 0;
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .cal-header-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    color: #a78bfa;
  }
  
  .cal-close {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255,255,255,0.6);
    width: 28px;
    height: 28px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .cal-close:hover {
    background: rgba(255, 77, 77, 0.15);
    border-color: rgba(255, 77, 77, 0.3);
    color: #ff6b6b;
  }
  
  /* Tabs */
  .cal-tabs {
    display: flex;
    gap: 2px;
    padding: 10px 18px;
    background: rgba(0, 0, 0, 0.15);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  
  .cal-tab {
    padding: 8px 14px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  
  .cal-tab:hover {
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.8);
  }
  
  .cal-tab.active {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.25) 0%, rgba(118, 75, 162, 0.25) 100%);
    border-color: rgba(102, 126, 234, 0.4);
    color: #a5b4fc;
  }
  
  .cal-tab-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .cal-tab-icon svg {
    width: 14px;
    height: 14px;
  }
  
  /* Content Area - Fixed Height */
  .cal-content {
    flex: 1;
    overflow: hidden;
    position: relative;
    height: 360px;
  }
  
  .cal-tab-content {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    padding: 14px 18px;
    overflow-y: auto;
    overflow-x: hidden;
    opacity: 0;
    transform: translateX(10px);
    transition: opacity 0.2s ease, transform 0.2s ease;
    pointer-events: none;
  }
  
  .cal-tab-content.active {
    opacity: 1;
    transform: translateX(0);
    pointer-events: auto;
  }
  
  .cal-tab-content::-webkit-scrollbar {
    width: 6px;
  }
  
  .cal-tab-content::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .cal-tab-content::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 3px;
  }
  
  .cal-tab-content::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.25);
  }
  
  /* Footer */
  .cal-footer {
    padding: 12px 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(0, 0, 0, 0.2);
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }
  
  .cal-footer-left {
    display: flex;
    gap: 8px;
  }
  
  .cal-btn {
    padding: 7px 14px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    gap: 6px;
    border: 1px solid transparent;
  }
  
  .cal-btn-danger {
    background: rgba(244, 67, 54, 0.12);
    border-color: rgba(244, 67, 54, 0.25);
    color: #ef5350;
  }
  
  .cal-btn-danger:hover {
    background: rgba(244, 67, 54, 0.2);
    border-color: rgba(244, 67, 54, 0.4);
  }
  
  .cal-btn-secondary {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);
  }
  
  .cal-btn-secondary:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }
  
  .cal-btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
  }
  
  .cal-btn-primary:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }
  
  /* ==================== MATRIX VIEW ==================== */
  .cal-matrix {
    width: 100%;
  }
  
  .cal-legend {
    display: flex;
    gap: 12px;
    margin-bottom: 12px;
    padding: 8px 12px;
    background: rgba(0,0,0,0.2);
    border-radius: 6px;
    font-size: 10px;
  }
  
  .cal-legend-item {
    display: flex;
    align-items: center;
    gap: 5px;
    color: rgba(255,255,255,0.6);
  }
  
  .cal-legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 3px;
  }
  
  .cal-matrix-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 2px;
    font-size: 11px;
  }
  
  .cal-matrix-table th {
    padding: 8px 4px;
    text-align: center;
    color: rgba(255, 255, 255, 0.5);
    font-weight: 500;
    font-size: 13px;
    vertical-align: bottom;
  }
  
  .cal-matrix-table th:first-child {
    text-align: left;
    padding-left: 8px;
    width: 130px;
  }
  
  .cal-th-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  
  .cal-th-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.6);
    opacity: 0.8;
  }
  
  .cal-th-icon svg {
    width: 15px;
    height: 15px;
  }
  
  .cal-th-label {
    font-size: 9px;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.3px;
    font-weight: 500;
  }
  
  .cal-matrix-table td {
    padding: 3px;
    text-align: center;
  }
  
  .cal-provider-cell {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    background: rgba(255,255,255,0.03);
    border-radius: 6px;
  }
  
  .cal-provider-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
  }
  
  .cal-provider-icon svg {
    width: 18px;
    height: 18px;
  }
  
  .cal-provider-name {
    color: rgba(255,255,255,0.9);
    font-weight: 500;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  
  /* Capability Cell */
  .cal-cap-cell {
    position: relative;
    cursor: pointer;
    border-radius: 4px;
    padding: 4px 2px;
    min-width: 48px;
    transition: all 0.15s ease;
    border: 1px solid transparent;
  }
  
  .cal-cap-cell:hover {
    transform: scale(1.08);
    z-index: 10;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }
  
  .cal-cap-score {
    font-weight: 600;
    font-size: 11px;
  }
  
  .cal-cap-cell.high {
    background: rgba(76, 175, 80, 0.18);
    color: #66bb6a;
    border-color: rgba(76, 175, 80, 0.25);
  }
  
  .cal-cap-cell.medium {
    background: rgba(255, 193, 7, 0.18);
    color: #ffca28;
    border-color: rgba(255, 193, 7, 0.25);
  }
  
  .cal-cap-cell.low {
    background: rgba(255, 87, 34, 0.18);
    color: #ff7043;
    border-color: rgba(255, 87, 34, 0.25);
  }
  
  .cal-cap-cell.disabled {
    background: rgba(100, 100, 100, 0.15);
    color: rgba(255,255,255,0.35);
    border-color: rgba(255,255,255,0.08);
  }
  
  .cal-cap-cell.disabled .cal-cap-score {
    font-size: 10px;
    font-weight: 400;
  }
  
  .cal-cap-cell.override {
    box-shadow: inset 0 0 0 2px currentColor;
  }
  
  /* ==================== SUMMARY VIEW ==================== */
  .cal-summary-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  
  .cal-provider-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    padding: 12px;
    transition: all 0.15s ease;
  }
  
  .cal-provider-card:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
  }
  
  .cal-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }
  
  .cal-card-title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: white;
    font-weight: 500;
    font-size: 12px;
  }
  
  .cal-card-title-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
  }
  
  .cal-card-title-icon svg {
    width: 20px;
    height: 20px;
  }
  
  .cal-card-score {
    font-size: 18px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 4px;
  }
  
  .cal-card-score.high { background: rgba(76,175,80,0.2); color: #66bb6a; }
  .cal-card-score.medium { background: rgba(255,193,7,0.2); color: #ffca28; }
  .cal-card-score.low { background: rgba(255,87,34,0.2); color: #ff7043; }
  
  .cal-card-section {
    margin-top: 8px;
  }
  
  .cal-card-label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: rgba(255,255,255,0.4);
    margin-bottom: 4px;
  }
  
  .cal-task-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  
  .cal-task-pill {
    padding: 3px 7px;
    border-radius: 4px;
    font-size: 10px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .cal-task-pill-icon {
    display: flex;
    align-items: center;
  }
  
  .cal-task-pill-icon svg {
    width: 11px;
    height: 11px;
  }
  
  .cal-task-pill.strong {
    background: rgba(76, 175, 80, 0.15);
    color: #66bb6a;
  }
  
  .cal-task-pill.weak {
    background: rgba(255, 87, 34, 0.15);
    color: #ff7043;
  }
  
  .cal-task-pill.disabled {
    background: rgba(158, 158, 158, 0.15);
    color: #9e9e9e;
    text-decoration: line-through;
  }
  
  /* ==================== HISTORY VIEW ==================== */
  .cal-history-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: rgba(255,255,255,0.4);
    text-align: center;
  }
  
  .cal-history-empty-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
    opacity: 0.4;
    color: rgba(255, 255, 255, 0.5);
  }
  
  .cal-history-empty-text {
    font-size: 13px;
    margin-bottom: 4px;
  }
  
  .cal-history-empty-hint {
    font-size: 11px;
    opacity: 0.6;
  }
  
  .cal-history-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .cal-history-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    background: rgba(255,255,255,0.03);
    border-radius: 6px;
    font-size: 11px;
    transition: all 0.15s ease;
    animation: calSlideIn 0.2s ease-out;
  }
  
  .cal-history-item:hover {
    background: rgba(255,255,255,0.06);
  }
  
  .cal-history-status {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    flex-shrink: 0;
  }
  
  .cal-history-status.success {
    background: rgba(76,175,80,0.2);
    color: #66bb6a;
  }
  
  .cal-history-status.failure {
    background: rgba(244,67,54,0.2);
    color: #ef5350;
  }
  
  .cal-history-info {
    flex: 1;
    min-width: 0;
  }
  
  .cal-history-provider {
    color: white;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  
  .cal-history-provider-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
  }
  
  .cal-history-provider-icon svg {
    width: 14px;
    height: 14px;
  }
  
  .cal-history-task {
    color: rgba(255,255,255,0.5);
    font-size: 10px;
    margin-top: 2px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .cal-history-task-icon {
    display: flex;
    align-items: center;
    opacity: 0.7;
  }
  
  .cal-history-task-icon svg {
    width: 10px;
    height: 10px;
  }
  
  .cal-history-meta {
    text-align: right;
    flex-shrink: 0;
  }
  
  .cal-history-latency {
    color: rgba(255,255,255,0.7);
    font-family: monospace;
    font-size: 10px;
  }
  
  .cal-history-time {
    color: rgba(255,255,255,0.4);
    font-size: 9px;
    margin-top: 2px;
  }
  
  .cal-history-actions {
    display: flex;
    gap: 4px;
  }
  
  .cal-history-btn {
    width: 22px;
    height: 22px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    transition: all 0.15s ease;
    opacity: 0.6;
  }
  
  .cal-history-btn:hover {
    opacity: 1;
  }
  
  .cal-history-btn.correct {
    background: rgba(76,175,80,0.2);
    color: #66bb6a;
  }
  
  .cal-history-btn.wrong {
    background: rgba(244,67,54,0.2);
    color: #ef5350;
  }
  
  /* ==================== SETTINGS VIEW ==================== */
  .cal-settings-section {
    margin-bottom: 16px;
  }
  
  .cal-settings-title {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: rgba(255,255,255,0.4);
    margin-bottom: 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  
  .cal-setting-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    background: rgba(255,255,255,0.03);
    border-radius: 6px;
    margin-bottom: 6px;
  }
  
  .cal-setting-label {
    color: rgba(255,255,255,0.85);
    font-size: 12px;
  }
  
  .cal-setting-desc {
    color: rgba(255,255,255,0.4);
    font-size: 10px;
    margin-top: 2px;
  }
  
  /* Toggle Switch */
  .cal-toggle {
    width: 36px;
    height: 20px;
    background: rgba(255,255,255,0.15);
    border-radius: 10px;
    position: relative;
    cursor: pointer;
    transition: background 0.2s ease;
  }
  
  .cal-toggle.active {
    background: #667eea;
  }
  
  .cal-toggle::after {
    content: '';
    position: absolute;
    width: 16px;
    height: 16px;
    background: white;
    border-radius: 50%;
    top: 2px;
    left: 2px;
    transition: transform 0.2s ease;
  }
  
  .cal-toggle.active::after {
    transform: translateX(16px);
  }
  
  /* Slider */
  .cal-slider-container {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .cal-slider {
    width: 100px;
    height: 4px;
    -webkit-appearance: none;
    background: rgba(255,255,255,0.15);
    border-radius: 2px;
    outline: none;
  }
  
  .cal-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    background: #667eea;
    border-radius: 50%;
    cursor: pointer;
    transition: transform 0.15s ease;
  }
  
  .cal-slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
  }
  
  .cal-slider-value {
    min-width: 35px;
    text-align: center;
    font-size: 11px;
    font-weight: 600;
    color: #667eea;
    background: rgba(102,126,234,0.15);
    padding: 3px 6px;
    border-radius: 4px;
  }
  
  /* Context Menu */
  .cal-context-menu {
    position: fixed;
    background: linear-gradient(145deg, #252535 0%, #1a1a28 100%);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    padding: 4px;
    min-width: 140px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.4);
    z-index: 100010;
    animation: calFadeIn 0.15s ease-out;
  }
  
  .cal-context-item {
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    color: rgba(255,255,255,0.8);
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.1s ease;
  }
  
  .cal-context-item:hover {
    background: rgba(255,255,255,0.08);
    color: white;
  }
  
  .cal-context-item.enable { color: #66bb6a; }
  .cal-context-item.disable { color: #ef5350; }
  .cal-context-item.reset { color: #64b5f6; }
`;

// ============================================================================
// CUSTOM DIALOG
// ============================================================================

function showCustomDialog(options: {
  title: string;
  message: string;
  placeholder?: string;
  confirmText?: string;
  confirmColor?: string;
  icon?: string;
}): Promise<string | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 100020;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: calFadeIn 0.15s ease;
    `;

    overlay.innerHTML = `
      <div style="
        background: linear-gradient(145deg, #252535 0%, #1a1a28 100%);
        border-radius: 10px;
        padding: 18px;
        width: 320px;
        box-shadow: 0 15px 40px rgba(0,0,0,0.4);
        border: 1px solid rgba(255,255,255,0.1);
        animation: calFadeIn 0.2s ease;
      ">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
          <span style="font-size: 20px;">${options.icon || '💬'}</span>
          <span style="color: white; font-size: 14px; font-weight: 600;">${options.title}</span>
        </div>
        <div style="color: rgba(255,255,255,0.7); font-size: 12px; margin-bottom: 12px; line-height: 1.4;">
          ${options.message}
        </div>
        <input type="text" id="cal-dialog-input" placeholder="${options.placeholder || ''}" style="
          width: 100%;
          padding: 10px 12px;
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
          color: white;
          font-size: 12px;
          outline: none;
          box-sizing: border-box;
          margin-bottom: 14px;
        ">
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button id="cal-dialog-cancel" style="
            padding: 8px 16px;
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 6px;
            color: rgba(255,255,255,0.7);
            font-size: 12px;
            cursor: pointer;
          ">Cancel</button>
          <button id="cal-dialog-confirm" style="
            padding: 8px 16px;
            background: ${options.confirmColor || '#667eea'};
            border: none;
            border-radius: 6px;
            color: white;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
          ">${options.confirmText || 'Confirm'}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = overlay.querySelector('#cal-dialog-input') as HTMLInputElement;
    const cancelBtn = overlay.querySelector('#cal-dialog-cancel');
    const confirmBtn = overlay.querySelector('#cal-dialog-confirm');

    input?.focus();

    const close = (value: string | null) => {
      overlay.remove();
      resolve(value);
    };

    cancelBtn?.addEventListener('click', () => close(null));
    confirmBtn?.addEventListener('click', () => close(input?.value || ''));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(null);
    });
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') close(input.value);
      if (e.key === 'Escape') close(null);
    });
  });
}

function showConfirmDialog(options: {
  title: string;
  message: string;
  confirmText?: string;
  icon?: string;
}): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 100020;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: calFadeIn 0.15s ease;
    `;

    overlay.innerHTML = `
      <div style="
        background: linear-gradient(145deg, #252535 0%, #1a1a28 100%);
        border-radius: 10px;
        padding: 18px;
        width: 300px;
        box-shadow: 0 15px 40px rgba(0,0,0,0.4);
        border: 1px solid rgba(255,255,255,0.1);
      ">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
          <span style="font-size: 20px;">${options.icon || '⚠️'}</span>
          <span style="color: white; font-size: 14px; font-weight: 600;">${options.title}</span>
        </div>
        <div style="color: rgba(255,255,255,0.7); font-size: 12px; margin-bottom: 16px; line-height: 1.4;">
          ${options.message}
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button id="cal-confirm-cancel" style="
            padding: 8px 16px;
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 6px;
            color: rgba(255,255,255,0.7);
            font-size: 12px;
            cursor: pointer;
          ">Cancel</button>
          <button id="cal-confirm-ok" style="
            padding: 8px 16px;
            background: #ef5350;
            border: none;
            border-radius: 6px;
            color: white;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
          ">${options.confirmText || 'Confirm'}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = (result: boolean) => {
      overlay.remove();
      resolve(result);
    };

    overlay.querySelector('#cal-confirm-cancel')?.addEventListener('click', () => close(false));
    overlay.querySelector('#cal-confirm-ok')?.addEventListener('click', () => close(true));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false);
    });
    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Escape') { close(false); document.removeEventListener('keydown', handler); }
      if (e.key === 'Enter') { close(true); document.removeEventListener('keydown', handler); }
    });
  });
}

// ============================================================================
// MAIN CALIBRATION PANEL
// ============================================================================

export function showCalibrationPanel(): void {
  // Guard: only open when user explicitly triggers (not on startup)
  if (!(window as any).__calibrationUserTriggered) {
    console.log('[X02] Calibration panel blocked (startup auto-show). Use Ctrl+Shift+C or click button.');
    return;
  }
  // Reset flag after use
  (window as any).__calibrationUserTriggered = false;
  const existing = document.getElementById('calibration-panel');
  if (existing) existing.remove();

  const manager = getCalibrationManager();
  const allProviders: ProviderName[] = ['operator_x02', 'groq', 'gemini', 'deepseek', 'claude', 'openai'];
  const allTasks: TaskType[] = ['code_generation', 'code_fix', 'code_explain', 'quick_answer', 'complex_reasoning', 'creative_writing', 'image_analysis', 'translation', 'summarize', 'general'];

  // Add styles
  if (!document.getElementById('calibration-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'calibration-styles';
    styleEl.textContent = CALIBRATION_STYLES;
    document.head.appendChild(styleEl);
  }

  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'calibration-panel';

  overlay.innerHTML = `
    <div class="cal-panel">
      <div class="cal-header">
        <h2>
          <span class="cal-header-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <circle cx="12" cy="12" r="6"></circle>
              <circle cx="12" cy="12" r="2"></circle>
            </svg>
          </span>
          Provider Calibration
        </h2>
        <button class="cal-close">×</button>
      </div>
      
      <div class="cal-tabs">
        <button class="cal-tab active" data-tab="matrix">
          <span class="cal-tab-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          </span>
          <span>Matrix</span>
        </button>
        <button class="cal-tab" data-tab="summary">
          <span class="cal-tab-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          </span>
          <span>Summary</span>
        </button>
        <button class="cal-tab" data-tab="history">
          <span class="cal-tab-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </span>
          <span>History</span>
        </button>
        <button class="cal-tab" data-tab="settings">
          <span class="cal-tab-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          </span>
          <span>Settings</span>
        </button>
      </div>
      
      <div class="cal-content">
        <div class="cal-tab-content active" data-content="matrix"></div>
        <div class="cal-tab-content" data-content="summary"></div>
        <div class="cal-tab-content" data-content="history"></div>
        <div class="cal-tab-content" data-content="settings"></div>
      </div>
      
      <div class="cal-footer">
        <div class="cal-footer-left">
          <button class="cal-btn cal-btn-danger" id="cal-reset-all">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            <span>Reset All</span>
          </button>
          <button class="cal-btn cal-btn-secondary" id="cal-export">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            <span>Export</span>
          </button>
        </div>
        <button class="cal-btn cal-btn-primary" id="cal-done">Done</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Tab switching with animation
  const tabs = overlay.querySelectorAll('.cal-tab');
  const contents = overlay.querySelectorAll('.cal-tab-content');
  
  function switchTab(tabName: string) {
    tabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === tabName));
    contents.forEach(c => c.classList.toggle('active', c.getAttribute('data-content') === tabName));
    
    // Load content
    if (tabName === 'matrix') renderMatrixView();
    if (tabName === 'summary') renderSummaryView();
    if (tabName === 'history') renderHistoryView();
    if (tabName === 'settings') renderSettingsView();
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');
      if (tabName) switchTab(tabName);
    });
  });

  // Render Matrix View
  function renderMatrixView() {
    const container = overlay.querySelector('[data-content="matrix"]');
    if (!container) return;

    let html = `
      <div class="cal-legend">
        <div class="cal-legend-item">
          <div class="cal-legend-dot" style="background: rgba(76,175,80,0.5);"></div>
          <span>High (70%+)</span>
        </div>
        <div class="cal-legend-item">
          <div class="cal-legend-dot" style="background: rgba(255,193,7,0.5);"></div>
          <span>Medium (40-69%)</span>
        </div>
        <div class="cal-legend-item">
          <div class="cal-legend-dot" style="background: rgba(255,87,34,0.5);"></div>
          <span>Low (&lt;40%)</span>
        </div>
        <div class="cal-legend-item">
          <div class="cal-legend-dot" style="background: rgba(100,100,100,0.3);"></div>
          <span>Disabled</span>
        </div>
        <div class="cal-legend-item">
          <div class="cal-legend-dot" style="background: transparent; border: 2px solid #667eea;"></div>
          <span>Override</span>
        </div>
      </div>
      
      <div class="cal-matrix">
        <table class="cal-matrix-table">
          <thead>
            <tr>
              <th>Provider</th>
              ${allTasks.map(t => `
                <th>
                  <div class="cal-th-content">
                    <div class="cal-th-icon">${TASK_ICONS[t]}</div>
                    <div class="cal-th-label">${TASK_SHORT_LABELS[t]}</div>
                  </div>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
    `;

    allProviders.forEach(provider => {
      html += `
        <tr>
          <td>
            <div class="cal-provider-cell">
              <span class="cal-provider-icon">${PROVIDER_SVG_ICONS[provider]}</span>
              <span class="cal-provider-name">${provider.replace('_', ' ')}</span>
            </div>
          </td>
      `;

      allTasks.forEach(task => {
        // Use getCapability method which exists
        const cap = manager.getCapability(provider, task);
        const score = cap?.confidenceScore ?? 50;
        const status = cap?.manualOverride || 'auto';
        
        let cellClass = 'low';
        if (status === 'disabled') cellClass = 'disabled';
        else if (score >= 70) cellClass = 'high';
        else if (score >= 40) cellClass = 'medium';
        
        const hasOverride = status === 'enabled' || status === 'disabled';
        
        html += `
          <td>
            <div class="cal-cap-cell ${cellClass} ${hasOverride ? 'override' : ''}"
                 data-provider="${provider}" 
                 data-task="${task}"
                 title="${TASK_SHORT_LABELS[task]}: ${score}%${hasOverride ? ' (Override)' : ''}">
              <div class="cal-cap-score">${status === 'disabled' ? '—' : score + '%'}</div>
              ${hasOverride ? '<div style="font-size:7px;opacity:0.7;">OVERRIDE</div>' : ''}
            </div>
          </td>
        `;
      });

      html += '</tr>';
    });

    html += `
          </tbody>
        </table>
      </div>
      <div style="text-align: center; margin-top: 10px; font-size: 10px; color: rgba(255,255,255,0.4);">
        Click any cell to enable/disable or reset to auto-learning
      </div>
    `;

    container.innerHTML = html;

    // Cell click handlers
    container.querySelectorAll('.cal-cap-cell').forEach(cell => {
      cell.addEventListener('click', (e) => {
        const provider = cell.getAttribute('data-provider') as ProviderName;
        const task = cell.getAttribute('data-task') as TaskType;
        showCellContextMenu(e as MouseEvent, provider, task);
      });
    });
  }

  // Context Menu
  function showCellContextMenu(e: MouseEvent, provider: ProviderName, task: TaskType) {
    const existing = document.querySelector('.cal-context-menu');
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.className = 'cal-context-menu';
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';

    menu.innerHTML = `
      <div class="cal-context-item enable" data-action="enable">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        <span>Force Enable</span>
      </div>
      <div class="cal-context-item disable" data-action="disable">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
        <span>Force Disable</span>
      </div>
      <div class="cal-context-item reset" data-action="reset">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
        <span>Reset to Auto</span>
      </div>
    `;

    document.body.appendChild(menu);

    // Adjust position if off-screen
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 10) + 'px';
    if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height - 10) + 'px';

    menu.querySelectorAll('.cal-context-item').forEach(item => {
      item.addEventListener('click', async () => {
        const action = item.getAttribute('data-action');
        menu.remove();

        if (action === 'enable') {
          const reason = await showCustomDialog({
            title: 'Force Enable',
            message: `Always use ${provider.replace('_', ' ')} for ${TASK_SHORT_LABELS[task]}?`,
            placeholder: 'Reason (optional)',
            confirmText: 'Enable',
            confirmColor: '#4caf50',
            icon: '✅'
          });
          if (reason !== null) {
            manager.setManualOverride(provider, task, 'enabled', reason || undefined);
            renderMatrixView();
          }
        } else if (action === 'disable') {
          const reason = await showCustomDialog({
            title: 'Force Disable',
            message: `Never use ${provider.replace('_', ' ')} for ${TASK_SHORT_LABELS[task]}?`,
            placeholder: 'Reason (optional)',
            confirmText: 'Disable',
            confirmColor: '#f44336',
            icon: '🚫'
          });
          if (reason !== null) {
            manager.setManualOverride(provider, task, 'disabled', reason || undefined);
            renderMatrixView();
          }
        } else if (action === 'reset') {
          manager.setManualOverride(provider, task, 'auto');
          renderMatrixView();
        }
      });
    });

    // Close on click outside
    setTimeout(() => {
      document.addEventListener('click', function handler(ev) {
        if (!menu.contains(ev.target as Node)) {
          menu.remove();
          document.removeEventListener('click', handler);
        }
      });
    }, 10);
  }

  // Render Summary View
  function renderSummaryView() {
    const container = overlay.querySelector('[data-content="summary"]');
    if (!container) return;

    let html = '<div class="cal-summary-grid">';

    allProviders.forEach(provider => {
      // Use getProviderSummary which exists
      const summary = manager.getProviderSummary(provider);
      const overallScore = summary?.overallScore ?? 50;
      
      let scoreClass = 'low';
      if (overallScore >= 70) scoreClass = 'high';
      else if (overallScore >= 40) scoreClass = 'medium';

      const strongTasks = summary?.strongTasks || [];
      const weakTasks = summary?.weakTasks || [];
      const disabledTasks = summary?.disabledTasks || [];

      html += `
        <div class="cal-provider-card">
          <div class="cal-card-header">
            <div class="cal-card-title">
              <span class="cal-card-title-icon">${PROVIDER_SVG_ICONS[provider]}</span>
              <span>${provider.replace('_', ' ').toUpperCase()}</span>
            </div>
            <div class="cal-card-score ${scoreClass}">${overallScore}%</div>
          </div>
          
          ${strongTasks.length > 0 ? `
            <div class="cal-card-section">
              <div class="cal-card-label">Strong at</div>
              <div class="cal-task-pills">
                ${strongTasks.map(t => `<div class="cal-task-pill strong"><span class="cal-task-pill-icon">${TASK_ICONS[t]}</span>${TASK_SHORT_LABELS[t]}</div>`).join('')}
              </div>
            </div>
          ` : ''}
          
          ${weakTasks.length > 0 ? `
            <div class="cal-card-section">
              <div class="cal-card-label">Weak at</div>
              <div class="cal-task-pills">
                ${weakTasks.map(t => `<div class="cal-task-pill weak"><span class="cal-task-pill-icon">${TASK_ICONS[t]}</span>${TASK_SHORT_LABELS[t]}</div>`).join('')}
              </div>
            </div>
          ` : ''}
          
          ${disabledTasks.length > 0 ? `
            <div class="cal-card-section">
              <div class="cal-card-label">Disabled</div>
              <div class="cal-task-pills">
                ${disabledTasks.map(t => `<div class="cal-task-pill disabled"><span class="cal-task-pill-icon">${TASK_ICONS[t]}</span>${TASK_SHORT_LABELS[t]}</div>`).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;
  }

  // Render History View
  function renderHistoryView() {
    const container = overlay.querySelector('[data-content="history"]');
    if (!container) return;

    // Try to get history from manager first, then fall back to localStorage
    let history: any[] = [];
    try {
      history = manager.getTestHistory({ limit: 50 });
    } catch (e) {
      console.warn('Manager getTestHistory failed, reading from localStorage directly');
    }
    
    // Fallback: Read directly from localStorage
    if (!history || history.length === 0) {
      try {
        const saved = localStorage.getItem('calibrationTestHistory');
        if (saved) {
          const allHistory = JSON.parse(saved);
          // Get last 50 items, sorted by timestamp descending
          history = allHistory
            .sort((a: any, b: any) => b.timestamp - a.timestamp)
            .slice(0, 50);
          console.log(`📊 Loaded ${history.length} history items from localStorage`);
        }
      } catch (e) {
        console.warn('Failed to read history from localStorage:', e);
      }
    }
    
    if (!history || history.length === 0) {
      container.innerHTML = `
        <div class="cal-history-empty">
          <div class="cal-history-empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div class="cal-history-empty-text">No test results yet</div>
          <div class="cal-history-empty-hint">Start using the AI providers and results will appear here</div>
        </div>
      `;
      return;
    }
    
    let html = '<div class="cal-history-list">';
    
    history.forEach((result, idx) => {
      const time = new Date(result.timestamp);
      const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      
      html += `
        <div class="cal-history-item" style="animation-delay: ${idx * 0.03}s">
          <div class="cal-history-status ${result.success ? 'success' : 'failure'}">
            ${result.success ? '✓' : '✗'}
          </div>
          <div class="cal-history-info">
            <div class="cal-history-provider">
              <span class="cal-history-provider-icon">${PROVIDER_SVG_ICONS[result.provider]}</span>
              <span>${result.provider.replace('_', ' ')}</span>
            </div>
            <div class="cal-history-task">
              <span class="cal-history-task-icon">${TASK_ICONS[result.taskType]}</span>
              <span>${TASK_SHORT_LABELS[result.taskType]}</span>
            </div>
          </div>
          <div class="cal-history-meta">
            <div class="cal-history-latency">${result.latency}ms</div>
            <div class="cal-history-time">${timeStr}</div>
          </div>
          <div class="cal-history-actions">
            <button class="cal-history-btn correct" data-provider="${result.provider}" data-task="${result.taskType}" data-success="${result.success}" title="Mark as correct">✓</button>
            <button class="cal-history-btn wrong" data-provider="${result.provider}" data-task="${result.taskType}" data-success="${result.success}" title="Mark as wrong">✗</button>
          </div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;

    // Correction handlers - record new result instead of correcting old one
    container.querySelectorAll('.cal-history-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const provider = btn.getAttribute('data-provider') as ProviderName;
        const task = btn.getAttribute('data-task') as TaskType;
        const wasSuccess = btn.getAttribute('data-success') === 'true';
        const isCorrectBtn = btn.classList.contains('correct');
        
        // If clicking correct but was already success, or wrong but was already failure, do nothing
        if ((isCorrectBtn && wasSuccess) || (!isCorrectBtn && !wasSuccess)) {
          return;
        }
        
        // Record a corrective result with user feedback
        const correctedResult: TestResult = {
          provider,
          taskType: task,
          success: isCorrectBtn,
          latency: 0,
          timestamp: Date.now(),
          userFeedback: isCorrectBtn ? 'good' : 'bad',
          notes: 'Manual correction'
        };
        
        manager.recordTestResult(correctedResult);
        renderHistoryView();
      });
    });
  }

  // Render Settings View
  function renderSettingsView() {
    const container = overlay.querySelector('[data-content="settings"]');
    if (!container) return;

    const config = manager.getConfig();

    container.innerHTML = `
      <div class="cal-settings-section">
        <div class="cal-settings-title">Learning Settings</div>
        
        <div class="cal-setting-row">
          <div>
            <div class="cal-setting-label">Auto-Learning</div>
            <div class="cal-setting-desc">Automatically learn from AI responses</div>
          </div>
          <div class="cal-toggle ${config.autoLearnEnabled ? 'active' : ''}" id="cal-toggle-autolearn"></div>
        </div>
        
        <div class="cal-setting-row">
          <div>
            <div class="cal-setting-label">User Feedback</div>
            <div class="cal-setting-desc">Show 👍/👎 buttons after responses</div>
          </div>
          <div class="cal-toggle ${config.enableUserFeedback ? 'active' : ''}" id="cal-toggle-feedback"></div>
        </div>
      </div>
      
      <div class="cal-settings-section">
        <div class="cal-settings-title">Thresholds</div>
        
        <div class="cal-setting-row">
          <div>
            <div class="cal-setting-label">Confidence Threshold</div>
            <div class="cal-setting-desc">Min confidence to auto-route</div>
          </div>
          <div class="cal-slider-container">
            <input type="range" class="cal-slider" id="cal-slider-confidence" min="50" max="95" value="${config.confidenceThreshold}">
            <span class="cal-slider-value" id="cal-value-confidence">${config.confidenceThreshold}%</span>
          </div>
        </div>
        
        <div class="cal-setting-row">
          <div>
            <div class="cal-setting-label">Min Tests Required</div>
            <div class="cal-setting-desc">Tests before trusting results</div>
          </div>
          <div class="cal-slider-container">
            <input type="range" class="cal-slider" id="cal-slider-mintests" min="1" max="10" value="${config.minTestsRequired}">
            <span class="cal-slider-value" id="cal-value-mintests">${config.minTestsRequired}</span>
          </div>
        </div>
      </div>
    `;

    // Toggle handlers
    container.querySelector('#cal-toggle-autolearn')?.addEventListener('click', function() {
      this.classList.toggle('active');
      manager.updateConfig({ autoLearnEnabled: this.classList.contains('active') });
    });

    container.querySelector('#cal-toggle-feedback')?.addEventListener('click', function() {
      this.classList.toggle('active');
      manager.updateConfig({ enableUserFeedback: this.classList.contains('active') });
    });

    // Slider handlers
    const confSlider = container.querySelector('#cal-slider-confidence') as HTMLInputElement;
    const confValue = container.querySelector('#cal-value-confidence');
    confSlider?.addEventListener('input', () => {
      if (confValue) confValue.textContent = confSlider.value + '%';
      manager.updateConfig({ confidenceThreshold: parseInt(confSlider.value) });
    });

    const testSlider = container.querySelector('#cal-slider-mintests') as HTMLInputElement;
    const testValue = container.querySelector('#cal-value-mintests');
    testSlider?.addEventListener('input', () => {
      if (testValue) testValue.textContent = testSlider.value;
      manager.updateConfig({ minTestsRequired: parseInt(testSlider.value) });
    });
  }

  // Initialize
  renderMatrixView();

  // Event handlers
  overlay.querySelector('.cal-close')?.addEventListener('click', () => overlay.remove());
  overlay.querySelector('#cal-done')?.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  overlay.querySelector('#cal-reset-all')?.addEventListener('click', async () => {
    const confirmed = await showConfirmDialog({
      title: 'Reset All Data',
      message: 'This will clear all calibration data, test history, and manual overrides. Continue?',
      confirmText: 'Reset All',
      icon: '🗑️'
    });
    if (confirmed) {
      manager.resetAll();
      renderMatrixView();
    }
  });

  overlay.querySelector('#cal-export')?.addEventListener('click', () => {
    // Export calibration data directly from localStorage
    const data = {
      capabilities: localStorage.getItem('calibration_capabilities'),
      config: localStorage.getItem('calibration_config'),
      history: localStorage.getItem('calibration_history'),
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calibration-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

// ============================================================================
// FEEDBACK WIDGET
// ============================================================================

export function showFeedbackWidget(provider: ProviderName, taskType: TaskType, latency: number): void {
  const existing = document.getElementById('cal-feedback-widget');
  if (existing) existing.remove();

  const widget = document.createElement('div');
  widget.id = 'cal-feedback-widget';
  widget.style.cssText = `
    position: fixed;
    bottom: 80px;
    right: 20px;
    background: linear-gradient(145deg, #252535 0%, #1a1a28 100%);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    padding: 10px 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    z-index: 99999;
    animation: calSlideIn 0.2s ease-out;
    font-size: 12px;
  `;

  widget.innerHTML = `
    <span style="color: rgba(255,255,255,0.6);">Was this helpful?</span>
    <button id="cal-fb-good" style="
      background: rgba(76,175,80,0.15);
      border: 1px solid rgba(76,175,80,0.3);
      color: #66bb6a;
      padding: 5px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    ">👍</button>
    <button id="cal-fb-bad" style="
      background: rgba(244,67,54,0.15);
      border: 1px solid rgba(244,67,54,0.3);
      color: #ef5350;
      padding: 5px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    ">👎</button>
  `;

  document.body.appendChild(widget);

  const manager = getCalibrationManager();

  widget.querySelector('#cal-fb-good')?.addEventListener('click', () => {
    // Record positive feedback as a test result
    manager.recordTestResult({
      provider,
      taskType,
      success: true,
      latency,
      timestamp: Date.now(),
      userFeedback: 'good'
    });
    widget.remove();
  });

  widget.querySelector('#cal-fb-bad')?.addEventListener('click', () => {
    // Record negative feedback as a test result
    manager.recordTestResult({
      provider,
      taskType,
      success: false,
      latency,
      timestamp: Date.now(),
      userFeedback: 'bad'
    });
    widget.remove();
  });

  // Auto-remove after 10 seconds
  setTimeout(() => widget.remove(), 10000);
}

// ============================================================================
// EXPOSE GLOBALLY
// ============================================================================

(window as any).showCalibrationPanel = showCalibrationPanel;
(window as any).showFeedbackWidget = showFeedbackWidget;
