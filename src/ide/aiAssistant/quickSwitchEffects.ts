// quickSwitchEffects.ts
// ============================================================================
// QUICK SWITCH DROPDOWN - ENHANCED VISUAL EFFECTS
// ============================================================================
//
// Add this import to apiProviderManager.ts:
// import './quickSwitchEffects';
//
// ============================================================================

// Inject the CSS styles
const quickSwitchCSS = `
/* ============================================================================
   QUICK SWITCH DROPDOWN - HIGHLIGHTING & ANIMATIONS
   ============================================================================ */

/* DROPDOWN ITEM BASE STYLES */
.quick-provider-dropdown .dropdown-item {
  position: relative;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
  overflow: hidden;
}

/* Pseudo-element for glow effect */
.quick-provider-dropdown .dropdown-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.1),
    transparent
  );
  transition: left 0.5s ease;
  pointer-events: none;
}

/* HOVER EFFECT - Dark subtle highlight */
.quick-provider-dropdown .dropdown-item:hover {
  background: rgba(255, 255, 255, 0.03) !important;
  border-left-color: rgba(79, 195, 247, 0.4);
  transform: translateX(2px);
}

.quick-provider-dropdown .dropdown-item:hover::before {
  left: 100%;
}

/* Subtle glow on hover */
.quick-provider-dropdown .dropdown-item:hover .provider-icon {
  filter: drop-shadow(0 0 4px rgba(79, 195, 247, 0.4));
  transform: scale(1.05);
  transition: all 0.2s ease;
}

/* ACTIVE/SELECTED PROVIDER - Dark highlight */
.quick-provider-dropdown .dropdown-item.active {
  background: rgba(14, 99, 156, 0.12) !important;
  border-left-color: #0e639c !important;
  box-shadow: 
    inset 0 0 15px rgba(14, 99, 156, 0.08),
    0 0 5px rgba(14, 99, 156, 0.05);
}

.quick-provider-dropdown .dropdown-item.active .provider-name {
  color: #4fc3f7 !important;
  font-weight: 600;
}

.quick-provider-dropdown .dropdown-item.active .provider-icon {
  filter: drop-shadow(0 0 4px rgba(79, 195, 247, 0.5));
}

/* Pulsing border for active item */
.quick-provider-dropdown .dropdown-item.active::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, #4fc3f7, #0e639c, #4fc3f7);
  background-size: 100% 200%;
  animation: activePulse 2s ease infinite;
}

@keyframes activePulse {
  0%, 100% { background-position: 0% 0%; }
  50% { background-position: 0% 100%; }
}

/* DEFAULT PROVIDER BADGE */
.quick-provider-dropdown .dropdown-item .provider-name span[style*="color:#4caf50"] {
  animation: defaultBadgePulse 3s ease infinite;
}

@keyframes defaultBadgePulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* PROVIDER ICON ANIMATIONS */
.quick-provider-dropdown .dropdown-item .provider-icon {
  transition: all 0.2s ease;
}

/* Different colors for different providers on hover - subtle glow */
.quick-provider-dropdown .dropdown-item[data-provider="operator_x02"]:hover .provider-icon {
  filter: drop-shadow(0 0 4px rgba(156, 39, 176, 0.5)); /* Purple */
}

.quick-provider-dropdown .dropdown-item[data-provider="groq"]:hover .provider-icon {
  filter: drop-shadow(0 0 4px rgba(255, 152, 0, 0.5)); /* Orange */
}

.quick-provider-dropdown .dropdown-item[data-provider="openai"]:hover .provider-icon {
  filter: drop-shadow(0 0 4px rgba(76, 175, 80, 0.5)); /* Green */
}

.quick-provider-dropdown .dropdown-item[data-provider="deepseek"]:hover .provider-icon {
  filter: drop-shadow(0 0 4px rgba(33, 150, 243, 0.5)); /* Blue */
}

.quick-provider-dropdown .dropdown-item[data-provider="claude"]:hover .provider-icon {
  filter: drop-shadow(0 0 4px rgba(244, 67, 54, 0.5)); /* Red */
}

.quick-provider-dropdown .dropdown-item[data-provider="gemini"]:hover .provider-icon {
  filter: drop-shadow(0 0 4px rgba(255, 235, 59, 0.5)); /* Yellow */
}

/* ROLE DROPDOWN HIGHLIGHT - subtle */
.quick-provider-dropdown .dropdown-item .role-select:not(:disabled) {
  transition: all 0.2s ease;
}

.quick-provider-dropdown .dropdown-item:hover .role-select:not(:disabled) {
  border-color: rgba(79, 195, 247, 0.3) !important;
  box-shadow: 0 0 4px rgba(79, 195, 247, 0.1);
}

/* TEST BUTTON HOVER - subtle */
.quick-provider-dropdown .dropdown-item .test-api-btn {
  transition: all 0.2s ease;
}

.quick-provider-dropdown .dropdown-item:hover .test-api-btn:not(:disabled) {
  background: rgba(76, 175, 80, 0.15) !important;
  box-shadow: 0 0 6px rgba(76, 175, 80, 0.15);
  transform: scale(1.02);
}

/* SETTINGS BUTTON HOVER */
.quick-provider-dropdown .dropdown-item .settings-key-btn {
  transition: all 0.2s ease;
}

.quick-provider-dropdown .dropdown-item:hover .settings-key-btn {
  background: rgba(255, 255, 255, 0.1);
  transform: rotate(45deg);
}

/* AUTO-ROUTE TOGGLE SECTION */
.quick-provider-dropdown .orchestrator-settings {
  transition: all 0.2s ease;
}

.quick-provider-dropdown .orchestrator-settings:hover {
  background: rgba(255, 255, 255, 0.03);
}

/* Active toggle glow - subtle */
.quick-provider-dropdown .mini-toggle.active {
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.3);
}

/* RIPPLE EFFECT ON CLICK - darker */
.dropdown-item-ripple {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  transform: scale(0);
  animation: rippleEffect 0.6s linear;
  pointer-events: none;
}

@keyframes rippleEffect {
  to {
    transform: scale(4);
    opacity: 0;
  }
}

/* SHINE EFFECT ON HOVER */
@keyframes shineEffect {
  0% { left: -100%; }
  100% { left: 100%; }
}

.quick-provider-dropdown .dropdown-item:hover::before {
  animation: shineEffect 0.5s ease forwards;
}
`;

// Inject styles
function injectQuickSwitchStyles(): void {
  const existingStyle = document.getElementById('quick-switch-effects-styles');
  if (existingStyle) {
    existingStyle.remove();
  }
  
  const styleEl = document.createElement('style');
  styleEl.id = 'quick-switch-effects-styles';
  styleEl.textContent = quickSwitchCSS;
  document.head.appendChild(styleEl);
  
  console.log('✅ Quick Switch visual effects loaded');
}

// Add ripple effect on click
function addRippleEffect(element: HTMLElement, event: MouseEvent): void {
  const ripple = document.createElement('span');
  ripple.className = 'dropdown-item-ripple';
  
  const rect = element.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
  
  element.appendChild(ripple);
  
  ripple.addEventListener('animationend', () => {
    ripple.remove();
  });
}

// Setup event listeners for dropdown items
function setupDropdownEffects(): void {
  // Use event delegation on document
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const dropdownItem = target.closest('.quick-provider-dropdown .dropdown-item');
    
    if (dropdownItem) {
      addRippleEffect(dropdownItem as HTMLElement, e);
    }
  });
  
  // Add hover sound effect (optional - uncomment if you want)
  // document.addEventListener('mouseenter', (e) => {
  //   const target = e.target as HTMLElement;
  //   if (target.closest('.quick-provider-dropdown .dropdown-item')) {
  //     // Play subtle hover sound
  //   }
  // }, true);
}

// Initialize
function initQuickSwitchEffects(): void {
  injectQuickSwitchStyles();
  setupDropdownEffects();
}

// Run on load
if (typeof window !== 'undefined') {
  // Run immediately if DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initQuickSwitchEffects);
  } else {
    initQuickSwitchEffects();
  }
  
  // Also expose for manual re-initialization
  (window as any).initQuickSwitchEffects = initQuickSwitchEffects;
}

export { initQuickSwitchEffects };
