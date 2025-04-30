import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Grid,
  CircularProgress,
  Divider,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Alert
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  PhotoCamera as PhotoCameraIcon,
  DeleteForever as DeleteIcon
} from '@mui/icons-material';
import { userService, cameraService } from '../../services/api';
import { toast } from 'react-toastify';
import { useCamera } from '../../context/CameraContext';
import CameraSelector from '../camera/CameraSelector';
import WebcamCapture from '../camera/WebcamCapture';
import ESP32Capture from '../camera/ESP32Capture';

const FaceRegistration = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cameraMode } = useCamera();
  
  const [user, setUser] = useState(null);
  const [faceImages, setFaceImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [captureLoading, setCaptureLoading] = useState(false);
  
  // Load user data and face images
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const data = await userService.getUserFaceImages(id);
        setUser(data.user);
        setFaceImages(data.images || []);
      } catch (error) {
        toast.error('Failed to load user data');
        console.error('Error loading user:', error);
        navigate('/users');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [id, navigate]);
  
  // Handle image capture from camera
  const handleCapture = async (imageSrc) => {
    try {
      setCaptureLoading(true);
      
      const data = {
        user_id: id,
        camera_mode: cameraMode,
      };
      
      if (cameraMode === 'WEBCAM') {
        data.image_data = imageSrc;
      } else if (cameraMode === 'ESP32') {
        data.esp32_ip = imageSrc;
      }
      
      const result = await cameraService.registerFace(data);
      
      if (result.success) {
        toast.success('Face registered successfully');
        
        // Add new image to the list
        setFaceImages(prev => [...prev, {
          name: result.face_image.path.split('/').pop(),
          url: result.face_image.url
        }]);
      } else {
        toast.error(result.message || 'Failed to register face');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to register face');
      console.error('Error registering face:', error);
    } finally {
      setCaptureLoading(false);
    }
  };
  
  // Handle image deletion
  const handleDeleteImage = async (imageName) => {
    if (window.confirm('Are you sure you want to delete this image?')) {
      try {
        // Note: Backend API for deletion would be needed for production
        // For this demo, we'll just remove from state
        setFaceImages(prev => prev.filter(img => img.name !== imageName));
        toast.success('Image deleted successfully');
      } catch (error) {
        toast.error('Failed to delete image');
        console.error('Error deleting image:', error);
      }
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (!user) {
    return (
      <Alert severity="error">User not found</Alert>
    );
  }
  
  return (
    <Box>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/users')}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h5">
            Register Face: {user.name}
          </Typography>
        </Box>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Use the camera to capture face images for {user.name}. Multiple images will improve recognition accuracy.
        </Typography>
      </Paper>
      
      <CameraSelector />
      
      <WebcamCapture onCapture={handleCapture} />
      
      <ESP32Capture onCapture={handleCapture} />
      
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Registered Face Images
        </Typography>
        
        {captureLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <CircularProgress size={24} sx={{ mr: 1 }} />
            <Typography>Processing captured image...</Typography>
          </Box>
        )}
        
        {faceImages.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            No face images registered yet. Use the camera above to capture face images.
          </Alert>
        ) : (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {faceImages.map((image, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                <Card>
                  <CardMedia
                    component="img"
                    image={image.url}
                    alt={`Face ${index + 1}`}
                    sx={{ height: 200, objectFit: 'cover' }}
                  />
                  <CardContent sx={{ py: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {image.name}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      color="error" 
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDeleteImage(image.name)}
                    >
                      Delete
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>
    </Box>
  );
};

export default FaceRegistration;