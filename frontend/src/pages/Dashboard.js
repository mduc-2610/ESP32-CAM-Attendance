import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Paper, 
  Typography, 
  Box,
  Card,
  CardContent,
  Button
} from '@mui/material';
import {
  Person as PersonIcon,
  Event as EventIcon,
  FeaturedPlayList as SessionIcon,
  CheckCircle as PresentIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { userService, attendanceService } from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSessions: 0,
    totalSessions: 0,
    recentAttendance: 0
  });
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch users
        const users = await userService.getAllUsers();
        
        // Fetch sessions
        const sessions = await attendanceService.getAllSessions();
        
        // Calculate stats
        const activeSessions = sessions.filter(session => session.is_active && !session.is_finished).length;
        const totalSessions = sessions.length;
        
        // Get recent attendance (last 7 days)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        let recentAttendance = 0;
        sessions.forEach(session => {
          const sessionDate = new Date(session.session_date);
          if (sessionDate >= oneWeekAgo) {
            recentAttendance += session.attendances.filter(a => a.is_present).length;
          }
        });
        
        setStats({
          totalUsers: users.length,
          activeSessions,
          totalSessions,
          recentAttendance
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats.totalUsers}</Typography>
                  <Typography variant="subtitle1">Total Users</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <EventIcon sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats.activeSessions}</Typography>
                  <Typography variant="subtitle1">Active Sessions</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ bgcolor: 'info.light', color: 'info.contrastText' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <SessionIcon sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats.totalSessions}</Typography>
                  <Typography variant="subtitle1">Total Sessions</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ bgcolor: 'secondary.light', color: 'secondary.contrastText' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PresentIcon sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats.recentAttendance}</Typography>
                  <Typography variant="subtitle1">Recent Attendances</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Quick Actions */}
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
            <Typography variant="h5" gutterBottom>
              Quick Actions
            </Typography>
            
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  component={Link}
                  to="/users/create"
                  sx={{ py: 2 }}
                >
                  Add New User
                </Button>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="contained"
                  color="secondary"
                  fullWidth
                  component={Link}
                  to="/attendance/sessions/create"
                  sx={{ py: 2 }}
                >
                  Start Attendance Session
                </Button>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="contained"
                  color="info"
                  fullWidth
                  component={Link}
                  to="/users"
                  sx={{ py: 2 }}
                >
                  Manage Users
                </Button>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="contained"
                  color="success"
                  fullWidth
                  component={Link}
                  to="/attendance/reports"
                  sx={{ py: 2 }}
                >
                  View Reports
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;