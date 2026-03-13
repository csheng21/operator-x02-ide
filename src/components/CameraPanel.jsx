// src/components/CameraPanel.jsx
import React, { useState } from 'react';
import CameraView from './CameraView';

function CameraPanel() {
  const [isEnabled, setIsEnabled] = useState(true);

  return (
    <div className="panel camera-panel panel-collapsible">
      <div className="panel-header">
        <div className="panel-title">
          <span className="panel-icon">📹</span>
          Camera
          <span className="panel-toggle-icon"></span>
        </div>
        <div className="panel-actions">
          <button 
            className="icon-button"
            title={isEnabled ? "Disable Camera" : "Enable Camera"}
            onClick={() => setIsEnabled(!isEnabled)}
          >
            {isEnabled ? "🚫" : "✅"}
          </button>
        </div>
      </div>
      <div className="panel-content">
        <CameraView enabled={isEnabled} />
      </div>
    </div>
  );
}

export default CameraPanel;