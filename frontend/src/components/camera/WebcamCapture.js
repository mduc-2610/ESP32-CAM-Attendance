import React, { useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Box, Typography, Button, Paper } from '@mui/material';
import { PhotoCamera } from '@mui/icons-material';
import { useCamera } from '../../context/CameraContext';

const WebcamCapture = ({ onCapture }) => {
  const { 
    cameraMode,
    setWebcamRef, 
    captureImage 
  } = useCamera();
  
  const webcamRef = useRef(null);
  
  useEffect(() => {
    console.log("Webcam ref current:", webcamRef.current);
    if (webcamRef.current) {
      console.log("Setting webcam ref");
      setWebcamRef(webcamRef.current);
    }
  }, [webcamRef, setWebcamRef]);
    

  const handleCapture = useCallback(async () => {
    const imageSrc = await captureImage();
    if (imageSrc && onCapture) {
      onCapture(imageSrc);
    }
  }, [captureImage, onCapture]);
  
  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: "user"
  };
  
  // Only show webcam if camera mode is WEBCAM
  if (cameraMode !== 'WEBCAM') {
    return null;
  }
  
  return (
    <Paper elevation={3} sx={{ p: 2, mb: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Typography variant="h6" gutterBottom>
        Webcam
      </Typography>
      
      <Box sx={{ mb: 2, border: '1px solid #ccc', borderRadius: 1, overflow: 'hidden' }}>
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={videoConstraints}
          width={640}
          height={480}
        />
      </Box>
      
      <Button 
        variant="contained" 
        color="primary"
        startIcon={<PhotoCamera />}
        onClick={handleCapture}
      >
        Capture
      </Button>
    </Paper>
  );
};

export default WebcamCapture;