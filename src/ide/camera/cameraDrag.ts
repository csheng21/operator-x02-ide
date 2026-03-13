// src/ide/camera/cameraDrag.ts

// Make the camera panel draggable
export function makeCameraDraggable(panel) {
  if (!panel) return;
  
  const header = panel.querySelector('.panel-header');
  if (!header) return;
  
  let isDragging = false;
  let offsetX, offsetY;
  
  header.addEventListener('mousedown', (e) => {
    // Only start dragging on the header but not its buttons
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
      return;
    }
    
    isDragging = true;
    panel.classList.add('dragging');
    
    // Calculate offset from panel top-left corner
    const rect = panel.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
  });
  
  function drag(e) {
    if (!isDragging) return;
    
    // Calculate new position
    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;
    
    // Apply constraints to keep within viewport
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const panelWidth = panel.offsetWidth;
    const panelHeight = panel.offsetHeight;
    
    // Constrain to window dimensions
    const constrainedX = Math.max(0, Math.min(x, windowWidth - panelWidth));
    const constrainedY = Math.max(0, Math.min(y, windowHeight - panelHeight));
    
    // Update position
    panel.style.left = `${constrainedX}px`;
    panel.style.top = `${constrainedY}px`;
  }
  
  function stopDrag() {
    isDragging = false;
    panel.classList.remove('dragging');
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDrag);
  }
}

// Export functionality to update cameraManager.ts
export function addDragToExistingPanel() {
  const panel = document.querySelector('.camera-panel');
  if (panel) {
    makeCameraDraggable(panel);
  }
}