import React, { createContext, useState, useContext, useCallback } from 'react';
import { cameraService } from '../services/api';
import { toast } from 'react-toastify';

const CameraContext = createContext();

export const CameraProvider = ({ children }) => {
  const [cameraMode, setCameraMode] = useState('WEBCAM'); // 'WEBCAM' or 'ESP32'
  const [esp32IpAddress, setEsp32IpAddress] = useState('');
  const [esp32Status, setEsp32Status] = useState('disconnected'); // 'disconnected', 'connecting', 'connected'
  const [webcamRef, setWebcamRef] = useState(null);
  const [stream, setStream] = useState(null);
  
  // Test connection to ESP32-CAM
  const testEsp32Connection = useCallback(async (ipAddress) => {
    try {
      setEsp32Status('connecting');
      const response = await cameraService.testConnection({ ip_address: ipAddress });
      
      if (response.success) {
        setEsp32Status('connected');
        setEsp32IpAddress(ipAddress);
        toast.success('ESP32-CAM connected successfully');
        return true;
      } else {
        setEsp32Status('disconnected');
        toast.error(response.message || 'Connection failed');
        return false;
      }
    } catch (error) {
      setEsp32Status('disconnected');
      toast.error(error.response?.data?.message || 'Connection failed');
      return false;
    }
  }, []);
  
  // Capture image from camera (webcam or ESP32)
  const captureImage = useCallback(async () => {
    try {
      if (cameraMode === 'WEBCAM') {
        if (!webcamRef) {
          toast.error('Webcam not initialized');
          return null;
        }
        
        const imageSrc = webcamRef.getScreenshot();
        return imageSrc;
      } else if (cameraMode === 'ESP32') {
        if (!esp32IpAddress || esp32Status !== 'connected') {
          toast.error('ESP32-CAM not connected');
          return null;
        }
        
        // For ESP32, we'll pass the IP to the backend which will capture the image
        return esp32IpAddress;
      }
    } catch (error) {
      toast.error('Error capturing image');
      console.error('Capture error:', error);
      return null;
    }
  }, [cameraMode, webcamRef, esp32IpAddress, esp32Status]);
  
  // Initialize camera
  const initializeCamera = useCallback(async (mode, ipAddress = null) => {
    try {
      if (mode === 'WEBCAM') {
        setCameraMode('WEBCAM');
        setEsp32Status('disconnected');
      } else if (mode === 'ESP32' && ipAddress) {
        const connected = await testEsp32Connection(ipAddress);
        if (connected) {
          setCameraMode('ESP32');
        }
      }
    } catch (error) {
      toast.error('Error initializing camera');
      console.error('Camera init error:', error);
    }
  }, [testEsp32Connection]);
  
  const value = {
    cameraMode,
    setCameraMode,
    esp32IpAddress,
    setEsp32IpAddress,
    esp32Status,
    setEsp32Status,
    webcamRef,
    setWebcamRef,
    stream,
    setStream,
    testEsp32Connection,
    captureImage,
    initializeCamera,
  };
  
  return (
    <CameraContext.Provider value={value}>
      {children}
    </CameraContext.Provider>
  );
};

export const useCamera = () => {
  const context = useContext(CameraContext);
  if (!context) {
    throw new Error('useCamera must be used within a CameraProvider');
  }
  return context;
};
