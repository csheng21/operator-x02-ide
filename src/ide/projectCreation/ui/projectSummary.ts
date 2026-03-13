// src/ide/projectCreation/ui/projectSummary.ts
import { currentProjectOptions } from '../projectOptions';
import { TEMPLATES } from '../templates';

// Update the project summary
export function updateProjectSummary(): void {
  const summaryElement = document.querySelector('.selected-template');
  if (!summaryElement) return;
  
  // Find the template
  const template = TEMPLATES[currentProjectOptions.templateType]?.find(
    t => t.id === currentProjectOptions.template
  );
  
  if (!template) return;
  
  // Create summary text
  const typePart = template.type.charAt(0).toUpperCase() + template.type.slice(1);
  const tsPart = currentProjectOptions.useTypeScript ? 'with TypeScript' : 'with JavaScript';
  
  summaryElement.textContent = `${template.name} ${typePart} Application ${tsPart}`;
  
  // If project name is set, add it
  if (currentProjectOptions.name) {
    summaryElement.textContent += ` - "${currentProjectOptions.name}"`;
  }
}