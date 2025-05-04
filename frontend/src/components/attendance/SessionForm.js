import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  Grid,
  Divider,
  Chip,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { LocalizationProvider, DatePicker, TimePicker } from '@mui/x-date-pickers';
import { 
  Save as SaveIcon, 
  ArrowBack as ArrowBackIcon, 
  Group as GroupIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { attendanceService, tagService, userService } from '../../services/api';
import { toast } from 'react-toastify';
import moment from 'moment';
import UserSearch from '../users/UserSearch';
import TagSearch from '../users/TagSearch';
import UsersByTagList from '../users/UsersByTagList';
import CameraSelector from '../camera/CameraSelector';
import { useCamera } from '../../context/CameraContext';

// Tab Panel Component
const TabPanel = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`user-selection-tabpanel-${index}`}
      aria-labelledby={`user-selection-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

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
  const [selectedTags, setSelectedTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [currentTagId, setCurrentTagId] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  
  // Load available tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tags = await tagService.getAllTags();
        setAvailableTags(tags);
      } catch (error) {
        console.error('Error loading tags:', error);
      }
    };
    
    fetchTags();
  }, []);
  
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
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Handle individual user selection
  const handleUserSelect = (user) => {
    if (!selectedUsers.some(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
  };
  
  // Handle individual user removal
  const handleRemoveUser = (userId) => {
    setSelectedUsers(selectedUsers.filter(user => user.id !== userId));
  };
  
  // Handle tag selection
  const handleTagSelect = (tag) => {
    if (!selectedTags.some(t => t.id === tag.id)) {
      setSelectedTags([...selectedTags, tag]);
      setCurrentTagId(tag.id);
    }
  };
  
  // Handle tag removal
  const handleRemoveTag = (tagId) => {
    setSelectedTags(selectedTags.filter(tag => tag.id !== tagId));
    
    // Also remove users that were only selected because of this tag
    const tagUsers = selectedUsers.filter(user => 
      user.tags.some(t => t.id === tagId) && 
      !user.tags.some(t => selectedTags.some(st => st.id !== tagId && st.id === t.id))
    );
    
    if (tagUsers.length > 0) {
      const userIds = tagUsers.map(u => u.id);
      setSelectedUsers(selectedUsers.filter(user => !userIds.includes(user.id)));
    }
    
    // Set current tag to first remaining tag or null
    if (currentTagId === tagId) {
      const remainingTags = selectedTags.filter(tag => tag.id !== tagId);
      setCurrentTagId(remainingTags.length > 0 ? remainingTags[0].id : null);
    }
  };
  
  // Select all users for the current tag
  const handleSelectAllUsers = (usersToSelect) => {
    // Create a new array with existing selected users
    const updatedUsers = [...selectedUsers];
    
    // Add each user that's not already selected
    usersToSelect.forEach(user => {
      if (!updatedUsers.some(u => u.id === user.id)) {
        updatedUsers.push(user);
      }
    });
    
    setSelectedUsers(updatedUsers);
  };
  
  // Deselect all users for the current tag
  const handleDeselectAllUsers = (usersToDeselect) => {
    // Filter out all users that are in the usersToDeselect array
    const userIdsToRemove = usersToDeselect.map(u => u.id);
    setSelectedUsers(selectedUsers.filter(user => !userIdsToRemove.includes(user.id)));
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
                Target Users ({selectedUsers.length})
              </Typography>
              
              <Tabs 
                value={tabValue} 
                onChange={handleTabChange} 
                variant="fullWidth" 
                sx={{ mb: 2 }}
              >
                <Tab icon={<PersonIcon />} label="Individual Users" />
                <Tab icon={<GroupIcon />} label="Users by Tag" />
              </Tabs>
              
              <TabPanel value={tabValue} index={0}>
                <UserSearch 
                  onUserSelect={handleUserSelect} 
                  selectedUsers={selectedUsers}
                  label="Add Users"
                  placeholder="Search and add users to this session"
                />
              </TabPanel>
              
              <TabPanel value={tabValue} index={1}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TagSearch 
                      onTagSelect={handleTagSelect}
                      selectedTags={selectedTags}
                      label="Add Tags"
                      placeholder="Search and add tags to include users"
                    />
                  </Grid>
                  
                  {selectedTags.length > 0 && (
                    <Grid item xs={12}>
                      <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          Selected Tags:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {selectedTags.map(tag => (
                            <Chip
                              key={tag.id}
                              label={tag.name}
                              color="primary"
                              onClick={() => setCurrentTagId(tag.id)}
                              onDelete={() => handleRemoveTag(tag.id)}
                              variant={currentTagId === tag.id ? "filled" : "outlined"}
                            />
                          ))}
                        </Box>
                      </Paper>
                    </Grid>
                  )}
                  
                  {currentTagId && (
                    <Grid item xs={12}>
                      <UsersByTagList
                        tagId={currentTagId}
                        selectedUsers={selectedUsers}
                        onUserSelect={handleUserSelect}
                        onUserDeselect={handleRemoveUser}
                        onSelectAll={handleSelectAllUsers}
                        onDeselectAll={handleDeselectAllUsers}
                      />
                    </Grid>
                  )}
                </Grid>
              </TabPanel>
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