// plugins/builtin/pythonSupport/index.js
export const activate = async (api) => {
  console.log('JAVASCRIPT Python Support plugin activated');
  
  // Create a highly visible button
  const testButton = document.createElement('button');
  testButton.textContent = 'JS PYTHON';
  testButton.style.position = 'fixed';
  testButton.style.top = '50px';
  testButton.style.left = '50%';
  testButton.style.zIndex = '9999';
  testButton.style.backgroundColor = 'lime'; // Very visible color
  testButton.style.color = 'black';
  testButton.style.padding = '10px 20px';
  testButton.style.fontWeight = 'bold';
  testButton.style.fontSize = '16px';
  
  testButton.onclick = function() {
    alert('JavaScript Python plugin is working!');
  };
  
  document.body.appendChild(testButton);
  console.log('JS Python button added');
};

export const deactivate = async () => {
  console.log('JS Python Support plugin deactivated');
};