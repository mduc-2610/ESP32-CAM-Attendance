import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <Paper elevation={3} sx={{ p: 5, textAlign: 'center' }}>
      <Typography variant="h1" color="primary" sx={{ fontSize: '6rem' }}>
        404
      </Typography>
      
      <Typography variant="h4" gutterBottom>
        Page Not Found
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 4 }}>
        The page you are looking for does not exist or has been moved.
      </Typography>
      
      <Button
        variant="contained"
        color="primary"
        component={Link}
        to="/"
        size="large"
      >
        Go to Dashboard
      </Button>
    </Paper>
  );
};

export default NotFound;