import React, { useState } from 'react';
import { 
  Box, 
  FormControl, 
  FormControlLabel, 
  RadioGroup, 
  Radio, 
  Typography, 
  Paper,
  TextField,
  Button,
  CircularProgress
} from '@mui/material';
import { useCamera } from '../../context/CameraContext';

const CameraSelector = () => {
  const { 
    cameraMode, 
    setCameraMode,
    esp32IpAddress, 
    setEsp32IpAddress,
    esp32Status,
    testEsp32Connection,
    initializeCamera
  } = useCamera();
  
  const [tempIpAddress, setTempIpAddress] = useState(esp32IpAddress || '');
  const [isConnecting, setIsConnecting] = useState(false);
  
  const handleCameraModeChange = (event) => {
    setCameraMode(event.target.value);
  };
  
  const handleConnectEsp32 = async () => {
    try {
      setIsConnecting(true);
      await initializeCamera('ESP32', tempIpAddress);
    } finally {
      setIsConnecting(false);
    }
  };
  
  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Camera Mode
      </Typography>
      
      <FormControl component="fieldset">
        <RadioGroup
          name="camera-mode-group"
          value={cameraMode}
          onChange={handleCameraModeChange}
        >
          <FormControlLabel value="WEBCAM" control={<Radio />} label="Laptop Webcam" />
          <FormControlLabel value="ESP32" control={<Radio />} label="ESP32-CAM" />
        </RadioGroup>
      </FormControl>
      
      {cameraMode === 'ESP32' && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            ESP32-CAM Configuration
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <TextField
              label="IP Address"
              variant="outlined"
              value={tempIpAddress}
              onChange={(e) => setTempIpAddress(e.target.value)}
              placeholder="192.168.1.100"
              size="small"
              sx={{ minWidth: 200 }}
              disabled={isConnecting}
            />
            
            <Button 
              variant="contained" 
              onClick={handleConnectEsp32}
              disabled={!tempIpAddress || isConnecting}
              startIcon={isConnecting ? <CircularProgress size={20} /> : null}
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </Button>
          </Box>
          
          <Typography 
            variant="body2" 
            sx={{ 
              mt: 1,
              color: esp32Status === 'connected' 
                ? 'success.main' 
                : esp32Status === 'connecting' 
                  ? 'warning.main' 
                  : 'error.main'
            }}
          >
            Status: {esp32Status === 'connected' 
              ? 'Connected' 
              : esp32Status === 'connecting' 
                ? 'Connecting...' 
                : 'Disconnected'}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default CameraSelector;