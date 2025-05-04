import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Button, Paper, CircularProgress, Alert } from '@mui/material';
import { PhotoCamera, Refresh } from '@mui/icons-material';
import { useCamera } from '../../context/CameraContext';

const ESP32Capture = ({ onCapture }) => {
  const { 
    cameraMode, 
    esp32IpAddress, 
    setEsp32IpAddress,
    esp32Status,
    setEsp32Status,
    streamUrl,
    setStreamUrl,
    captureImage,
  } = useCamera();
  
  const [isLoading, setIsLoading] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const [streamKey, setStreamKey] = useState(0);
  
  const stopStream = useCallback(() => {
    setStreamUrl('');
    setStreamKey(prev => prev + 1);
    console.log("Stream stopped by setting empty URL");
    
    return new Promise(resolve => setTimeout(resolve, 300));
  }, []);
  
  useEffect(() => {
    const timestamp = new Date().getTime();

    if (cameraMode === 'ESP32' && esp32Status === 'connected' && esp32IpAddress) {
      setStreamUrl(`http://${esp32IpAddress}/stream?t=${timestamp}`);
      setStreamError(false);
    } else {
      setStreamUrl('');
    }
  
    return () => {
      setStreamUrl('');
      setStreamKey(prev => prev + 1);
      
      console.log("Component cleanup: stream URL cleared");
    };
  }, [cameraMode, esp32Status, esp32IpAddress]);
  
  const handleCapture = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Stop the stream before capture
      await stopStream();
  
      if (cameraMode === 'ESP32' && esp32Status === 'connected') {
        const ipAddress = await captureImage();
        if (ipAddress && onCapture) {
          await onCapture(ipAddress);
        }
      }
  
      // Wait a moment before restarting the stream
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Only restart the stream if we're still in ESP32 mode and connected
      if (cameraMode === 'ESP32' && esp32Status === 'connected') {
        const timestamp = new Date().getTime();
        setStreamUrl(`http://${esp32IpAddress}/stream?t=${timestamp}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [cameraMode, esp32Status, captureImage, onCapture, esp32IpAddress, stopStream]);
  
  const handleStreamError = () => {
    setStreamError(true);
  };
  
  const handleRefreshStream = async () => {
    // Stop the stream first
    await stopStream();
    
    // Wait a moment before restarting
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Reset error state and restart stream
    setStreamError(false);
    const timestamp = new Date().getTime();
    setStreamUrl(`http://${esp32IpAddress}/stream?t=${timestamp}`);
  };
  
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
              width: 640,
              height: 480,
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
                {streamUrl ? (
                  <img 
                    key={streamKey}
                    src={streamUrl} 
                    alt="ESP32-CAM Stream" 
                    style={{ maxWidth: '100%', maxHeight: '100%' }}
                    onError={handleStreamError}
                  />
                ) : (
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    height: '100%',
                    width: '100%',
                    bgcolor: '#f5f5f5'
                  }}>
                    <Typography variant="body2" color="textSecondary">
                      Stream inactive
                    </Typography>
                  </Box>
                )}
                
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
        <Box sx={{ 
            width: 640,
            height: 480,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            p: 3,
          }}>
          <Alert severity="info">
            Please connect to an ESP32-CAM device to view the stream
          </Alert>
        </Box>
      )}
    </Paper>
  );
};

export default ESP32Capture;
