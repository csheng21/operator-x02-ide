// components/CameraView.jsx
import React, { useRef, useEffect, useState } from 'react';

function CameraView({ enabled = true, width = '100%', height = '240px' }) {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);
  const [stream, setStream] = useState(null);

  useEffect(() => {
    let mediaStream = null;

    const startCamera = async () => {
      try {
        // Request camera access
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: false 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        
        setStream(mediaStream);
        setError(null);
      } catch (err) {
        console.error('Camera access error:', err);
        setError(`Camera access denied: ${err.message}`);
      }
    };

    if (enabled) {
      startCamera();
    }

    // Cleanup function to stop camera when component unmounts
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [enabled]);

  return (
    <div className="camera-container" style={{ width, height }}>
      {error ? (
        <div className="camera-error">{error}</div>
      ) : (
        <video 
          ref={videoRef}
          autoPlay
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
    </div>
  );
}

export default CameraView;