import { PluginApi } from '../../core/pluginInterface';

export const activate = async (api: PluginApi): Promise<void> => {
  console.log('Python Support plugin activated - SIMPLIFIED VERSION');
  
  // Create a simple test button
  const testButton = document.createElement('button');
  testButton.textContent = 'Python Test';
  testButton.style.position = 'fixed';
  testButton.style.top = '10px';
  testButton.style.right = '10px';
  testButton.style.zIndex = '9999';
  testButton.style.backgroundColor = 'red';
  testButton.style.color = 'white';
  testButton.style.padding = '5px 10px';
  
  testButton.addEventListener('click', () => {
    alert('Python plugin is working!');
  });
  
  document.body.appendChild(testButton);
  
  // Show a notification
  api.ui.showNotification({
    title: 'Python Support',
    message: 'Simplified Python plugin loaded',
    type: 'success',
    duration: 15000
  });
};

export const deactivate = async (): Promise<void> => {
  console.log('Python Support plugin deactivated');
};