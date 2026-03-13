// src/plugins/builtin/fletAssistant/src/colorFixer.ts

/**
 * Fix Flet colors in code
 */
export function fixFletColors(code: string): string {
  const colorMap = getFletColorMap();
  let updatedCode = code;
  
  // Replace color patterns
  for (const [colorName, hexValue] of Object.entries(colorMap)) {
    const pattern = new RegExp(`ft\\.colors\\.${colorName}`, 'g');
    updatedCode = updatedCode.replace(pattern, `"${hexValue}"`);
  }
  
  return updatedCode;
}

/**
 * Get Flet color map
 */
export function getFletColorMap(): Record<string, string> {
  return {
    'BLUE_GREY_100': '#B0BEC5',
    'RED_100': '#FFCDD2',
    'BLUE_100': '#BBDEFB',
    'ORANGE_300': '#FFB74D',
    'WHITE': '#FFFFFF',
    'BLACK12': '#1F000000',
    'BLUE_GREY_300': '#90A4AE',
    // Add more color mappings as needed
    'RED_500': '#F44336',
    'GREEN_500': '#4CAF50',
    'BLUE_500': '#2196F3',
    'PURPLE_500': '#9C27B0'
  };
}