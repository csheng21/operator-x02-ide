// src/plugins/builtin/fletAssistant/src/errorDetector.ts

/**
 * Detect Flet-specific errors in console output
 */
export function detectFletErrors(output: string): any | null {
  console.log("Analyzing terminal output for Flet errors:", output.substring(0, 100) + "...");
  
  // Check for Flet colors error - more flexible pattern matching
  if ((output.includes("module 'flet'") || output.includes('module "flet"') || 
       output.includes("flet")) && 
      (output.includes("has no attribute 'colors'") || output.includes('attribute "colors"'))) {
    console.log("Detected Flet colors error!");
    return {
      title: 'Flet Colors Error',
      message: 'Your code uses the deprecated Flet colors API. This needs to be updated to work with newer versions of Flet.',
      actions: [
        {
          title: 'Fix Colors',
          callback: (api: any) => {
            api.ui.executeCommand('fletAssistant.fixColors');
          }
        },
        {
          title: 'Learn More',
          callback: (api: any) => {
            api.ui.openUrl('https://flet.dev/docs/controls/colors');
          }
        }
      ]
    };
  }
  
  // Check for import error - enhanced pattern
  if (output.includes("ModuleNotFoundError") && 
      (output.includes("No module named 'flet'") || output.includes('No module named "flet"'))) {
    console.log("Detected Flet not installed error!");
    return {
      title: 'Flet Not Installed',
      message: 'The Flet package is not installed. You need to install it to run Flet applications.',
      actions: [
        {
          title: 'Install Flet',
          callback: (api: any) => {
            api.terminal.execute('pip install flet')
              .then(() => {
                api.ui.showNotification({
                  message: 'Flet installed successfully!',
                  type: 'success'
                });
              })
              .catch((error: any) => {
                api.ui.showNotification({
                  title: 'Installation Failed',
                  message: error.message || 'Failed to install Flet',
                  type: 'error'
                });
              });
          }
        }
      ]
    };
  }
  
  // Version mismatch detection
  if (output.includes("AttributeError") && output.includes("flet") && 
      (output.includes("has no attribute") || output.includes("object has no attribute"))) {
    console.log("Detected possible Flet version mismatch error!");
    return {
      title: 'Possible Flet Version Issue',
      message: 'This error might be caused by a mismatch between your code and the installed Flet version.',
      actions: [
        {
          title: 'Update Flet',
          callback: (api: any) => {
            api.terminal.execute('pip install --upgrade flet')
              .then(() => {
                api.ui.showNotification({
                  message: 'Flet updated successfully!',
                  type: 'success'
                });
              })
              .catch((error: any) => {
                api.ui.showNotification({
                  title: 'Update Failed',
                  message: error.message || 'Failed to update Flet',
                  type: 'error'
                });
              });
          }
        }
      ]
    };
  }
  
  // Other error patterns can be added here
  
  return null;
}