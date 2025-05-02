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
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
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
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState(null);
  
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
          id: result.face_image.id,
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
  
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (image) => {
    setImageToDelete(image);
    setConfirmDeleteOpen(true);
  };
  
  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setConfirmDeleteOpen(false);
    setImageToDelete(null);
  };
  
  // Handle image deletion
  const handleDeleteImage = async () => {
    if (!imageToDelete) return;
    
    try {
      setDeleteLoading(true);
      
      // Call the API to delete the image
      const result = await cameraService.deleteFaceImage(imageToDelete.id);
      
      if (result.success) {
        // Remove from state
        setFaceImages(prev => prev.filter(img => img.id !== imageToDelete.id));
        
        // Show different messages based on whether all images were deleted
        if (result.remaining_images === 0) {
          toast.warning('All face images for this user have been deleted. They will no longer be recognized by the system.');
        } else {
          toast.success('Image deleted successfully');
          
          // Show model status messages
          if (result.model_status === "retrained") {
            toast.info('Face recognition model has been retrained');
          } else if (result.model_status === "insufficient_users") {
            toast.warning('Not enough users with face images for effective recognition');
          } else if (result.model_status === "insufficient_images") {
            toast.warning('Not enough face images for effective recognition');
          }
        }
      } else {
        toast.error(result.message || 'Failed to delete image');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete image');
      console.error('Error deleting image:', error);
    } finally {
      setDeleteLoading(false);
      handleCloseDeleteDialog();
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
          <Alert severity="warning" sx={{ mb: 2 }}>
            No face images registered yet. This user will not be recognized by the system. Use the camera above to capture face images.
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
                      onClick={() => handleOpenDeleteDialog(image)}
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={handleCloseDeleteDialog}
      >
        <DialogTitle>Delete Face Image</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this face image? This will also update the face recognition model.
            
            {/* Warning for last image */}
            {faceImages.length === 1 && (
              <Box sx={{ mt: 2, color: 'error.main', fontWeight: 'bold' }}>
                Warning: This is the last face image for this user. Deleting it will remove this user from the recognition system completely.
              </Box>
            )}
            
            {/* Warning for low number of images */}
            {faceImages.length > 1 && faceImages.length <= 3 && (
              <Box sx={{ mt: 2, color: 'warning.main' }}>
                Warning: Having fewer face images may reduce recognition accuracy. It's recommended to have at least 3 images per user.
              </Box>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button 
            onClick={handleDeleteImage} 
            color="error" 
            disabled={deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={24} /> : null}
          >
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FaceRegistration;