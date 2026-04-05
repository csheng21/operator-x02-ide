// ============================================================
// loadingScreen.ts  |  Operator X02
// Extracted from main.ts by refactor_main.ps1
// showLoadingScreen / removeLoadingScreen
// ============================================================

export function showLoadingScreen(): void {
  // Only create once
  if (document.getElementById('app-loader')) return;
  
  const loader = document.createElement('div');
  loader.id = 'app-loader';
  loader.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: #1e1e1e;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 999999;
    ">
      <div style="
        width: 60px;
        height: 60px;
        border: 4px solid #333;
        border-top-color: #007acc;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      "></div>
      <div style="
        margin-top: 20px;
        color: #cccccc;
        font-family: 'Segoe UI', sans-serif;
        font-size: 14px;
      " id="loader-text">Loading AI IDE...</div>
    </div>
    <style>
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  `;
  document.body.appendChild(loader);
  console.log('?? Loading screen displayed');
}

export function removeLoadingScreen(): void {
  const loader = document.getElementById('app-loader');
  if (loader) {
    loader.style.opacity = '0';
    loader.style.transition = 'opacity 0.3s ease';
    setTimeout(() => {
      loader.remove();
      console.log('? Loading screen removed');
    }, 300);
  }
}

