import React, { createContext, useState, useContext, useCallback, useRef } from 'react';
import { cameraService } from '../services/api';
import { toast } from 'react-toastify';

const CameraContext = createContext();

export const CameraProvider = ({ children }) => {
  const [cameraMode, setCameraMode] = useState('WEBCAM'); // 'WEBCAM' or 'ESP32'
  const [esp32IpAddress, setEsp32IpAddress] = useState('');
  const [esp32Status, setEsp32Status] = useState('disconnected'); // 'disconnected', 'connecting', 'connected'
  const [webcamRef, setWebcamRef] = useState(null);
  const [streamUrl, setStreamUrl] = useState('');

  // Use a ref to track active connection requests
  const activeConnectionRef = useRef(null);
  
  // Disconnect from ESP32 by just resetting state
  const disconnectEsp32 = useCallback(() => {
    setEsp32Status('disconnected');
    setEsp32IpAddress('');
    setStreamUrl('');
    
    // Clear any active connection
    if (activeConnectionRef.current) {
      activeConnectionRef.current.abort();
      activeConnectionRef.current = null;
    }
    
    // Give the browser time to clean up connections
    return new Promise(resolve => setTimeout(resolve, 500));
  }, []);
  
  const testEsp32Connection = useCallback(async (ipAddress) => {
    await disconnectEsp32();
    const controller = new AbortController();
    
    try {
      setEsp32Status('connecting');
      
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      activeConnectionRef.current = controller;
      
      const response = await cameraService.testConnection(
        { ip_address: ipAddress },
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
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
      
      if (error.name === 'AbortError') {
        toast.error('Connection timed out');
      } else {
        toast.error(error.response?.data?.message || 'Connection failed');
      }
      
      return false;
    } finally {
      // If this connection is still the active one, clear it
      if (activeConnectionRef.current === controller) {
        activeConnectionRef.current = null;
      }
    }
  }, [disconnectEsp32]);
  
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
      // First disconnect from any existing connection
      
      if (mode === 'WEBCAM') {
        setCameraMode('WEBCAM');
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
  }, [testEsp32Connection, disconnectEsp32]);
  
  // Effect to clean up connections when the provider is unmounted
  React.useEffect(() => {
    return () => {
      // Clean up any active connections
      if (activeConnectionRef.current) {
        activeConnectionRef.current.abort();
        activeConnectionRef.current = null;
      }
      
      // Just reset state - no need to call any stopstream endpoint
      setEsp32Status('disconnected');
      setEsp32IpAddress('');
    };
  }, []);
  
  const value = {
    cameraMode,
    setCameraMode,
    esp32IpAddress,
    setEsp32IpAddress,
    esp32Status,
    setEsp32Status,
    webcamRef,
    setWebcamRef,
    testEsp32Connection,
    captureImage,
    initializeCamera,
    disconnectEsp32,
    streamUrl,
    setStreamUrl,
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