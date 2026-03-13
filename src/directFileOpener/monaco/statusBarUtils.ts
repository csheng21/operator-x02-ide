// src/directFileOpener/monaco/statusBarUtils.ts

/**
 * Update the status bar with file info
 */
export function updateStatusBar(language: string, filePath: string): void {
  updateLanguageIndicator(language);
  updateFilePathIndicator(filePath);
  updateEncodingIndicator();
}

/**
 * Update language indicator in status bar
 */
function updateLanguageIndicator(language: string): void {
  const langElement = document.getElementById('language-status');
  if (langElement) {
    const displayLang = capitalizeFirstLetter(language);
    langElement.textContent = displayLang;
  }
}

/**
 * Update file path indicator in status bar
 */
function updateFilePathIndicator(filePath: string): void {
  const pathElement = document.getElementById('file-path-status');
  if (pathElement) {
    pathElement.textContent = filePath;
  }
}

/**
 * Update encoding indicator in status bar
 */
function updateEncodingIndicator(encoding: string = 'UTF-8'): void {
  const encodingElement = document.getElementById('encoding-status');
  if (encodingElement) {
    encodingElement.textContent = encoding;
  }
}

/**
 * Capitalize the first letter of a string
 */
function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}