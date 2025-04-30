import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  Grid,
  CircularProgress
} from '@mui/material';
import { Save as SaveIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { userService } from '../../services/api';
import { toast } from 'react-toastify';

const UserForm = ({ isEdit = false }) => {
  const [user, setUser] = useState({
    name: '',
    email: '',
    tag: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  const navigate = useNavigate();
  const { id } = useParams();
  
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
            tag: userData.tag || ''
          });
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
            <TextField
              name="tag"
              label="Tag (e.g., CNMP4)"
              value={user.tag}
              onChange={handleChange}
              fullWidth
              helperText="Optional tag for grouping users"
            />
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