// src/components/attendance/SessionForm.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  Grid,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  InputLabel,
  MenuItem,
  Select,
  Chip,
  Divider,
  Alert
} from '@mui/material';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { LocalizationProvider, DatePicker, TimePicker } from '@mui/x-date-pickers';
import { Save as SaveIcon, ArrowBack as ArrowBackIcon, PersonAdd as PersonAddIcon } from '@mui/icons-material';
import { attendanceService } from '../../services/api';
import { toast } from 'react-toastify';
import moment from 'moment';
import UserSearch from '../users/UserSearch';
import CameraSelector from '../camera/CameraSelector';
import { useCamera } from '../../context/CameraContext';

const SessionForm = () => {
  const navigate = useNavigate();
  const { cameraMode, esp32IpAddress, esp32Status } = useCamera();
  
  const [session, setSession] = useState({
    name: '',
    description: '',
    session_date: moment().format('YYYY-MM-DD'),
    start_time: moment().format(),
    camera_mode: cameraMode,
    target_users: []
  });
  
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setSession({
      ...session,
      [name]: value
    });
  };
  
  // Handle date change
  const handleDateChange = (date) => {
    setSession({
      ...session,
      session_date: moment(date).format('YYYY-MM-DD')
    });
  };
  
  // Handle time change
  const handleTimeChange = (time) => {
    setSession({
      ...session,
      start_time: moment(time).format()
    });
  };
  
  // Handle user selection
  const handleUserSelect = (user) => {
    if (!selectedUsers.some(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
  };
  
  // Handle user removal
  const handleRemoveUser = (userId) => {
    setSelectedUsers(selectedUsers.filter(user => user.id !== userId));
  };
  
  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Simple validation
    if (!session.name.trim()) {
      toast.error('Session name is required');
      return;
    }
    
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one target user');
      return;
    }
    
    if (cameraMode === 'ESP32' && (esp32Status !== 'connected' || !esp32IpAddress)) {
      toast.error('Please connect to ESP32-CAM before proceeding');
      return;
    }
    
    // Prepare session data
    const sessionData = {
      ...session,
      camera_mode: cameraMode,
      esp32_ip: cameraMode === 'ESP32' ? esp32IpAddress : null,
      target_users: selectedUsers.map(user => user.id),
      is_active: true
    };
    
    try {
      setSubmitLoading(true);
      const newSession = await attendanceService.createSession(sessionData);
      
      toast.success('Session created successfully');
      
      // Navigate to recognition page
      navigate(`/attendance/sessions/${newSession.id}/recognition`);
    } catch (error) {
      toast.error('Failed to create session');
      console.error('Error creating session:', error);
    } finally {
      setSubmitLoading(false);
    }
  };
  
  return (
    <LocalizationProvider dateAdapter={AdapterMoment}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/attendance/sessions')}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h5">
            Create Attendance Session
          </Typography>
        </Box>
        
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                name="name"
                label="Session Name"
                value={session.name}
                onChange={handleChange}
                fullWidth
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Description"
                value={session.description}
                onChange={handleChange}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <DatePicker
                label="Session Date"
                value={moment(session.session_date)}
                onChange={handleDateChange}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TimePicker
                label="Start Time"
                value={moment(session.start_time)}
                onChange={handleTimeChange}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Camera Configuration
              </Typography>
              
              <CameraSelector />
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Target Users
              </Typography>
              
              <UserSearch 
                onUserSelect={handleUserSelect} 
                selectedUsers={selectedUsers}
                label="Add Users"
                placeholder="Search and add users to this session"
              />
              
              {selectedUsers.length > 0 ? (
                <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {selectedUsers.map(user => (
                    <Chip
                      key={user.id}
                      label={`${user.name} ${user.tag ? `(${user.tag})` : ''}`}
                      onDelete={() => handleRemoveUser(user.id)}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              ) : (
                <Alert severity="info" sx={{ mt: 2 }}>
                  No users selected. Please add at least one user.
                </Alert>
              )}
            </Grid>
            
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                disabled={submitLoading}
                sx={{ mt: 2 }}
              >
                {submitLoading ? 'Creating...' : 'Create Session & Start Recognition'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </LocalizationProvider>
  );
};

export default SessionForm;