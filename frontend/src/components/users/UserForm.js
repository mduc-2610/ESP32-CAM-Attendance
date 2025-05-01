import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  Grid,
  CircularProgress,
  Autocomplete,
  Chip
} from '@mui/material';
import { Save as SaveIcon, ArrowBack as ArrowBackIcon, Add as AddIcon } from '@mui/icons-material';
import { userService, tagService } from '../../services/api';
import { toast } from 'react-toastify';

const UserForm = ({ isEdit = false }) => {
  const [user, setUser] = useState({
    name: '',
    email: '',
    tag_ids: []
  });
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [newTagName, setNewTagName] = useState('');
  
  const navigate = useNavigate();
  const { id } = useParams();
  
  // Load tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tags = await tagService.getAllTags();
        setAvailableTags(tags);
      } catch (error) {
        console.error('Error loading tags:', error);
        toast.error('Failed to load tags');
      }
    };
    
    fetchTags();
  }, []);
  
  // Load user data if editing
  useEffect(() => {
    if (isEdit && id) {
      const fetchUser = async () => {
        try {
          setLoading(true);
          const userData = await userService.getUserById(id);
          
          setUser({
            name: userData.name,
            email: userData.email,
            tag_ids: userData.tags.map(tag => tag.id)
          });
          
          setSelectedTags(userData.tags);
        } catch (error) {
          toast.error('Failed to load user data');
          console.error('Error loading user:', error);
          navigate('/users');
        } finally {
          setLoading(false);
        }
      };
      
      fetchUser();
    }
  }, [isEdit, id, navigate]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setUser(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleTagChange = (event, newTags) => {
    setSelectedTags(newTags);
    setUser(prev => ({
      ...prev,
      tag_ids: newTags.map(tag => tag.id)
    }));
  };
  
  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast.error('Tag name cannot be empty');
      return;
    }
    
    // Check if tag already exists
    if (availableTags.some(tag => tag.name.toLowerCase() === newTagName.toLowerCase())) {
      toast.error('Tag already exists');
      return;
    }
    
    try {
      const newTag = await tagService.createTag({ name: newTagName });
      setAvailableTags([...availableTags, newTag]);
      setSelectedTags([...selectedTags, newTag]);
      setUser(prev => ({
        ...prev,
        tag_ids: [...prev.tag_ids, newTag.id]
      }));
      
      setNewTagName('');
      toast.success('Tag created successfully');
    } catch (error) {
      toast.error('Failed to create tag');
      console.error('Error creating tag:', error);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Simple validation
    if (!user.name.trim() || !user.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user.email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    try {
      setSubmitLoading(true);
      
      if (isEdit) {
        await userService.updateUser(id, user);
        toast.success('User updated successfully');
      } else {
        await userService.createUser(user);
        toast.success('User created successfully');
      }
      
      navigate('/users');
    } catch (error) {
      const errorMessage = error.response?.data?.email 
        ? 'Email already exists' 
        : 'Failed to save user';
      
      toast.error(errorMessage);
      console.error('Error saving user:', error);
    } finally {
      setSubmitLoading(false);
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/users')}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h5">
          {isEdit ? 'Edit User' : 'Create User'}
        </Typography>
      </Box>
      
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              name="name"
              label="Name"
              value={user.name}
              onChange={handleChange}
              fullWidth
              required
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              name="email"
              label="Email"
              type="email"
              value={user.email}
              onChange={handleChange}
              fullWidth
              required
            />
          </Grid>
          
          <Grid item xs={12}>
            <Autocomplete
              multiple
              id="tags"
              options={availableTags}
              value={selectedTags}
              onChange={handleTagChange}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip 
                    variant="outlined" 
                    label={option.name} 
                    {...getTagProps({ index })} 
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Tags"
                  placeholder="Select tags"
                  helperText="Select or create tags to group users"
                />
              )}
            />
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                name="newTagName"
                label="New Tag Name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                fullWidth
              />
              <Button
                variant="contained"
                color="secondary"
                startIcon={<AddIcon />}
                onClick={handleCreateTag}
                disabled={!newTagName.trim()}
              >
                Add
              </Button>
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              disabled={submitLoading}
            >
              {submitLoading ? 'Saving...' : 'Save'}
            </Button>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};

export default UserForm;