import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Button, Paper, CircularProgress, Alert } from '@mui/material';
import { PhotoCamera, Refresh } from '@mui/icons-material';
import { useCamera } from '../../context/CameraContext';

const ESP32Capture = ({ onCapture }) => {
  const { 
    cameraMode, 
    esp32IpAddress, 
    esp32Status,
    captureImage 
  } = useCamera();
  
  const [streamUrl, setStreamUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamError, setStreamError] = useState(false);
  
  // Set stream URL when ESP32 is connected
  useEffect(() => {
    if (cameraMode === 'ESP32' && esp32Status === 'connected' && esp32IpAddress) {
      setStreamUrl(`http://${esp32IpAddress}/stream`);
      setStreamError(false);
    } else {
      setStreamUrl('');
    }
  }, [cameraMode, esp32Status, esp32IpAddress]);
  
  // Handle image capture
  const handleCapture = useCallback(async () => {
    try {
      setIsLoading(true);
      
      if (cameraMode === 'ESP32' && esp32Status === 'connected') {
        const ipAddress = await captureImage();
        if (ipAddress && onCapture) {
          onCapture(ipAddress);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [cameraMode, esp32Status, captureImage, onCapture]);
  
  // Handle stream error
  const handleStreamError = () => {
    setStreamError(true);
  };
  
  // Refresh stream
  const handleRefreshStream = () => {
    setStreamError(false);
    
    // Force reload by updating URL with timestamp
    const timestamp = new Date().getTime();
    setStreamUrl(`http://${esp32IpAddress}/stream?t=${timestamp}`);
  };
  
  // Only show ESP32 stream if camera mode is ESP32
  if (cameraMode !== 'ESP32') {
    return null;
  }
  
  return (
    <Paper elevation={3} sx={{ p: 2, mb: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Typography variant="h6" gutterBottom>
        ESP32-CAM Stream
      </Typography>
      
      {esp32Status === 'connected' ? (
        <>
          <Box 
            sx={{ 
              mb: 2, 
              width: '100%',
              height: 480,
              maxWidth: 640,
              border: '1px solid #ccc', 
              borderRadius: 1, 
              overflow: 'hidden',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative'
            }}
          >
            {streamError ? (
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                  Failed to load stream
                </Alert>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={handleRefreshStream}
                >
                  Refresh Stream
                </Button>
              </Box>
            ) : (
              <>
                <img 
                  src={streamUrl} 
                  alt="ESP32-CAM Stream" 
                  style={{ maxWidth: '100%', maxHeight: '100%' }}
                  onError={handleStreamError}
                />
                {isLoading && (
                  <Box 
                    sx={{ 
                      position: 'absolute', 
                      top: 0, 
                      left: 0, 
                      right: 0, 
                      bottom: 0, 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      zIndex: 1
                    }}
                  >
                    <CircularProgress color="primary" />
                  </Box>
                )}
              </>
            )}
          </Box>
          
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<PhotoCamera />}
            onClick={handleCapture}
            disabled={isLoading || streamError}
          >
            {isLoading ? 'Capturing...' : 'Capture'}
          </Button>
        </>
      ) : (
        <Box sx={{ textAlign: 'center', p: 3 }}>
          <Alert severity="info">
            Please connect to an ESP32-CAM device to view the stream
          </Alert>
        </Box>
      )}
    </Paper>
  );
};

export default ESP32Capture;