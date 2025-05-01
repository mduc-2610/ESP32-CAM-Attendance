import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  Tabs,
  Tab,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  ListItemSecondaryAction
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Stop as StopIcon,
  Check as CheckIcon,
  Face as FaceIcon,
  CameraAlt as CameraIcon,
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { attendanceService, cameraService, tagService } from '../../services/api';
import { toast } from 'react-toastify';
import moment from 'moment';
import { useCamera } from '../../context/CameraContext';
import { useAttendance } from '../../context/AttendanceContext';
import CameraSelector from '../camera/CameraSelector';
import WebcamCapture from '../camera/WebcamCapture';
import ESP32Capture from '../camera/ESP32Capture';

// Tab Panel Component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`user-tracking-tabpanel-${index}`}
      aria-labelledby={`user-tracking-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const FaceRecognition = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cameraMode, captureImage } = useCamera();
  const { 
    currentSession, 
    setCurrentSession,
    recognizedUsers,
    setRecognizedUsers,
    recognitionActive,
    setRecognitionActive,
    loadSession,
    finishSession
  } = useAttendance();
  
  const [loading, setLoading] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const [confirmFinishOpen, setConfirmFinishOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  
  // New state for tracking users by tags
  const [usersByTag, setUsersByTag] = useState({});
  const [remainingUsers, setRemainingUsers] = useState([]);
  const [expandedTag, setExpandedTag] = useState(null);
  
  // Recognition interval
  const [autoRecognition, setAutoRecognition] = useState(false);
  const [recognitionInterval, setRecognitionInterval] = useState(null);
  const [countdown, setCountdown] = useState(5);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Load session data
  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        setLoading(true);
        const session = await loadSession(id);
        
        if (session) {
          // Organize users by tag
          const usersByTagMap = {};
          const userMap = {};
          
          // Create user map for quick access
          session.target_users_details.forEach(user => {
            userMap[user.id] = user;
            
            // Add to "No Tag" initially
            if (!usersByTagMap["no-tag"]) {
              usersByTagMap["no-tag"] = {
                id: "no-tag",
                name: "No Tag",
                users: []
              };
            }
            
            if (!user.tags || user.tags.length === 0) {
              usersByTagMap["no-tag"].users.push(user);
            }
          });
          
          // Process users with tags
          session.target_users_details.forEach(user => {
            if (user.tags && user.tags.length > 0) {
              user.tags.forEach(tag => {
                if (!usersByTagMap[tag.id]) {
                  usersByTagMap[tag.id] = {
                    id: tag.id,
                    name: tag.name,
                    users: []
                  };
                }
                usersByTagMap[tag.id].users.push(user);
              });
            }
          });
          
          setUsersByTag(usersByTagMap);
          
          // Set remaining users (not yet recognized)
          const recognizedIds = recognizedUsers.map(u => u.id);
          const remaining = session.target_users_details.filter(
            user => !recognizedIds.includes(user.id)
          );
          setRemainingUsers(remaining);
          
          // Set first tag as expanded by default
          if (Object.keys(usersByTagMap).length > 0) {
            setExpandedTag(Object.keys(usersByTagMap)[0]);
          }
        }
      } catch (error) {
        toast.error('Failed to load session');
        console.error('Error loading session:', error);
        navigate('/attendance/sessions');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSessionData();
    
    // Cleanup function
    return () => {
      if (recognitionInterval) {
        clearInterval(recognitionInterval);
      }
    };
  }, [id, loadSession, navigate, recognitionInterval]);
  
  // Update remaining users when recognized users change
  useEffect(() => {
    if (currentSession) {
      const recognizedIds = recognizedUsers.map(u => u.id);
      const remaining = currentSession.target_users_details.filter(
        user => !recognizedIds.includes(user.id)
      );
      setRemainingUsers(remaining);
      
      // Update users by tag
      const updatedUsersByTag = { ...usersByTag };
      
      Object.keys(updatedUsersByTag).forEach(tagId => {
        updatedUsersByTag[tagId].users = updatedUsersByTag[tagId].users.filter(
          user => !recognizedIds.includes(user.id)
        );
      });
      
      setUsersByTag(updatedUsersByTag);
    }
  }, [currentSession, recognizedUsers]);
  
  // Toggle accordion
  const handleAccordionChange = (tagId) => (event, isExpanded) => {
    setExpandedTag(isExpanded ? tagId : null);
  };
  
  // Perform face recognition
  const performRecognition = useCallback(async () => {
    try {
      if (!currentSession || processingImage) return;
      
      setProcessingImage(true);
      
      // Capture image from camera
      const imageSrc = await captureImage();
      
      if (!imageSrc) {
        toast.error('Failed to capture image');
        return;
      }
      
      // Send image for recognition
      const recognitionData = {
        session_id: currentSession.id,
        camera_mode: cameraMode,
      };
      
      if (cameraMode === 'WEBCAM') {
        recognitionData.image_data = imageSrc;
      } else if (cameraMode === 'ESP32') {
        recognitionData.esp32_ip = imageSrc;
      }
      
      const result = await cameraService.recognizeFace(recognitionData);
      
      if (result.success) {
        if (result.matches && result.matches.length > 0) {
          // Process recognized faces
          result.matches.forEach(match => {
            if (match.attendance_marked) {
              // Add to recognized users if not already present
              if (!recognizedUsers.some(user => user.id === match.user_id)) {
                const recognizedUser = currentSession.target_users_details.find(
                  user => user.id === match.user_id
                );
                
                setRecognizedUsers(prev => [
                  ...prev,
                  {
                    id: match.user_id,
                    name: match.name,
                    timestamp: new Date(),
                    tags: recognizedUser ? recognizedUser.tags : []
                  }
                ]);
                
                toast.success(`Recognized: ${match.name}`);
              }
            }
          });
        } else {
          // No matches found
          if (autoRecognition) {
            // Don't show toast for auto recognition
            console.log('No matches found');
          } else {
            toast.info('No matching faces found');
          }
        }
      } else {
        if (!autoRecognition) {
          toast.warning(result.message || 'Face recognition failed');
        }
      }
    } catch (error) {
      if (!autoRecognition) {
        toast.error(error.response?.data?.message || 'Face recognition failed');
      }
      console.error('Recognition error:', error);
    } finally {
      setProcessingImage(false);
    }
  }, [currentSession, processingImage, captureImage, cameraMode, recognizedUsers, setRecognizedUsers, autoRecognition]);
  
  // Toggle auto recognition
  const toggleAutoRecognition = useCallback(() => {
    if (autoRecognition) {
      // Stop auto recognition
      if (recognitionInterval) {
        clearInterval(recognitionInterval);
        setRecognitionInterval(null);
      }
      setAutoRecognition(false);
      setCountdown(5);
      toast.info('Auto recognition stopped');
    } else {
      // Start auto recognition
      setAutoRecognition(true);
      setCountdown(5);
      
      // Initial countdown
      const countdownTimer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownTimer);
            
            // Start recognition after countdown
            performRecognition();
            
            // Set up interval for continuous recognition
            const interval = setInterval(() => {
              performRecognition();
            }, 5000); // Recognize every 5 seconds
            
            setRecognitionInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      toast.info('Auto recognition started');
    }
  }, [autoRecognition, recognitionInterval, performRecognition]);
  
  // Handle finish session
  const handleFinishSession = async () => {
    try {
      // Stop auto recognition if active
      if (autoRecognition) {
        if (recognitionInterval) {
          clearInterval(recognitionInterval);
          setRecognitionInterval(null);
        }
        setAutoRecognition(false);
      }
      
      const success = await finishSession();
      
      if (success) {
        navigate(`/attendance/sessions/${id}/details`);
      }
    } catch (error) {
      toast.error('Failed to finish session');
      console.error('Error finishing session:', error);
    }
  };
  
  // Calculate attendance statistics
  const calculateStats = () => {
    if (!currentSession) return { total: 0, present: 0, remaining: 0 };
    
    const total = currentSession.target_users.length;
    const present = recognizedUsers.length;
    const remaining = total - present;
    
    return { total, present, remaining };
  };
  
  // Calculate tag-specific statistics
  const calculateTagStats = (tagId) => {
    if (!usersByTag[tagId]) return { total: 0, present: 0, remaining: 0 };
    
    const tagUsers = usersByTag[tagId].users;
    const total = tagUsers.length;
    const remaining = total;
    const present = 0;
    
    return { total, present, remaining };
  };
  
  const stats = calculateStats();
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (!currentSession) {
    return (
      <Alert severity="error">Session not found</Alert>
    );
  }
  
  if (currentSession.is_finished) {
    return (
      <Paper elevation={3} sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          This session is already finished.
        </Alert>
        
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/attendance/sessions/${id}/details`)}
        >
          View Session Details
        </Button>
      </Paper>
    );
  }
  
  return (
    <Box>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/attendance/sessions')}
          >
            Back
          </Button>
          
          <Typography variant="h5" sx={{ flex: 1, minWidth: 200 }}>
            Face Recognition: {currentSession.name}
          </Typography>
          
          <Button
            variant="contained"
            color="secondary"
            startIcon={autoRecognition ? <StopIcon /> : <CameraIcon />}
            onClick={toggleAutoRecognition}
            disabled={processingImage}
          >
            {autoRecognition ? (
              countdown > 0 ? `Starting in ${countdown}...` : 'Stop Auto Recognition'
            ) : (
              'Start Auto Recognition'
            )}
          </Button>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<CheckIcon />}
            onClick={() => setConfirmFinishOpen(true)}
          >
            Finish Session
          </Button>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6">Total Users</Typography>
              <Typography variant="h3">{stats.total}</Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper elevation={1} sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light' }}>
              <Typography variant="h6">Present</Typography>
              <Typography variant="h3">{stats.present}</Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper elevation={1} sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light' }}>
              <Typography variant="h6">Remaining</Typography>
              <Typography variant="h3">{stats.remaining}</Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Camera Configuration
            </Typography>
            
            <CameraSelector />
            
            {cameraMode === 'WEBCAM' && <WebcamCapture onCapture={performRecognition} />}
            
            {cameraMode === 'ESP32' && <ESP32Capture onCapture={performRecognition} />}
            
            {!autoRecognition && (
              <Box sx={{ textAlign: 'center', mt: 3 }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={<CameraIcon />}
                  onClick={performRecognition}
                  disabled={processingImage}
                  sx={{ minWidth: 200 }}
                >
                  {processingImage ? 'Processing...' : 'Capture & Recognize'}
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange} 
              variant="fullWidth" 
              sx={{ mb: 1 }}
            >
              <Tab icon={<PersonIcon />} label="Recognized" />
              <Tab 
                icon={
                  <Badge badgeContent={remainingUsers.length} color="error">
                    <GroupIcon />
                  </Badge>
                } 
                label="Remaining" 
              />
            </Tabs>
            
            <TabPanel value={tabValue} index={0}>
              <Typography variant="h6" gutterBottom>
                Recognized Users ({recognizedUsers.length})
              </Typography>
              
              {recognizedUsers.length === 0 ? (
                <Alert severity="info">
                  No users recognized yet. Start capturing to mark attendance.
                </Alert>
              ) : (
                <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {recognizedUsers.map((user, index) => (
                    <React.Fragment key={user.id}>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            <FaceIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText 
                          primary={user.name} 
                          secondary={
                            <Box>
                              <Typography variant="body2" component="span">
                                {moment(user.timestamp).format('h:mm:ss A')}
                              </Typography>
                              
                              {user.tags && user.tags.length > 0 && (
                                <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {user.tags.map(tag => (
                                    <Chip 
                                      key={tag.id}
                                      label={tag.name}
                                      size="small"
                                      color="primary"
                                      variant="outlined"
                                    />
                                  ))}
                                </Box>
                              )}
                            </Box>
                          } 
                        />
                        <ListItemSecondaryAction>
                          <CheckCircleIcon color="success" />
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < recognizedUsers.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </TabPanel>
            
            <TabPanel value={tabValue} index={1}>
              <Typography variant="h6" gutterBottom>
                Remaining Users ({remainingUsers.length})
              </Typography>
              
              {remainingUsers.length === 0 ? (
                <Alert severity="success">
                  All users have been recognized!
                </Alert>
              ) : (
                <Box>
                  {Object.keys(usersByTag).map((tagId) => {
                    const tag = usersByTag[tagId];
                    
                    // Skip empty tags
                    if (tag.users.length === 0) return null;
                    
                    return (
                      <Accordion 
                        key={tagId}
                        expanded={expandedTag === tagId}
                        onChange={handleAccordionChange(tagId)}
                      >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                            <Typography>
                              {tag.name}
                            </Typography>
                            <Chip 
                              label={`${tag.users.length} users`} 
                              size="small"
                              color="primary"
                            />
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <List dense>
                            {tag.users.map((user) => (
                              <ListItem key={user.id}>
                                <ListItemText 
                                  primary={user.name} 
                                  secondary={user.email} 
                                />
                              </ListItem>
                            ))}
                          </List>
                        </AccordionDetails>
                      </Accordion>
                    );
                  })}
                </Box>
              )}
            </TabPanel>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Confirm Finish Dialog */}
      <Dialog
        open={confirmFinishOpen}
        onClose={() => setConfirmFinishOpen(false)}
      >
        <DialogTitle>Finish Attendance Session</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to finish this attendance session?
            <br /><br />
            <strong>Present:</strong> {stats.present} out of {stats.total} users
            <br />
            <strong>Absent:</strong> {stats.remaining} users
            <br /><br />
            All absent users will be marked as absent in the system.
            Once finished, the session cannot be reopened for recognition.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmFinishOpen(false)}>Cancel</Button>
          <Button onClick={handleFinishSession} color="primary" variant="contained">
            Finish Session
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FaceRecognition;