// src/components/attendance/SessionDetails.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  IconButton
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  PlayArrow as ResumeIcon,
  Check as PresentIcon,
  Close as AbsentIcon
} from '@mui/icons-material';
import { attendanceService } from '../../services/api';
import { toast } from 'react-toastify';
import moment from 'moment';

const SessionDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Load session data
  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        setLoading(true);
        const data = await attendanceService.getSessionById(id);
        setSession(data);
      } catch (error) {
        toast.error('Failed to load session data');
        console.error('Error loading session:', error);
        navigate('/attendance/sessions');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSessionData();
  }, [id, navigate]);
  
  const handleResumeSession = () => {
    navigate(`/attendance/sessions/${id}/recognition`);
  };
  
  // Calculate attendance statistics
  const calculateStats = () => {
    if (!session) return { total: 0, present: 0, absent: 0, percentage: 0 };
    
    const total = session.target_users.length;
    const present = session.attendances.filter(a => a.is_present).length;
    const absent = session.attendances.filter(a => !a.is_present).length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    
    return { total, present, absent, percentage };
  };
  
  const stats = calculateStats();
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (!session) {
    return (
      <Alert severity="error">Session not found</Alert>
    );
  }
  
  return (
    <Box>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/attendance/sessions')}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h5">
            Session Details: {session.name}
          </Typography>
          
          {!session.is_finished && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<ResumeIcon />}
              onClick={handleResumeSession}
              sx={{ ml: 'auto' }}
            >
              Resume Recognition
            </Button>
          )}
        </Box>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1">Session Information</Typography>
            <Box sx={{ mt: 1 }}>
              <Typography variant="body1">
                <strong>Date:</strong> {moment(session.session_date).format('MMMM D, YYYY')}
              </Typography>
              <Typography variant="body1">
                <strong>Start Time:</strong> {moment(session.start_time).format('h:mm A')}
              </Typography>
              {session.end_time && (
                <Typography variant="body1">
                  <strong>End Time:</strong> {moment(session.end_time).format('h:mm A')}
                </Typography>
              )}
              <Typography variant="body1">
                <strong>Status:</strong>{' '}
                {session.is_finished ? (
                  <Chip label="Finished" color="default" size="small" />
                ) : session.is_active ? (
                  <Chip label="Active" color="success" size="small" />
                ) : (
                  <Chip label="Inactive" color="error" size="small" />
                )}
              </Typography>
              <Typography variant="body1">
                <strong>Camera Mode:</strong>{' '}
                <Chip 
                  label={session.camera_mode === 'WEBCAM' ? 'Webcam' : 'ESP32-CAM'} 
                  color={session.camera_mode === 'WEBCAM' ? 'primary' : 'secondary'}
                  size="small" 
                />
              </Typography>
              {session.description && (
                <Typography variant="body1">
                  <strong>Description:</strong> {session.description}
                </Typography>
              )}
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1">Attendance Summary</Typography>
            <Box sx={{ mt: 1, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Paper elevation={1} sx={{ p: 2, flex: 1, minWidth: 100, textAlign: 'center' }}>
                <Typography variant="h4">{stats.total}</Typography>
                <Typography variant="body2">Total Users</Typography>
              </Paper>
              
              <Paper elevation={1} sx={{ p: 2, flex: 1, minWidth: 100, textAlign: 'center', bgcolor: 'success.light' }}>
                <Typography variant="h4">{stats.present}</Typography>
                <Typography variant="body2">Present</Typography>
              </Paper>
              
              <Paper elevation={1} sx={{ p: 2, flex: 1, minWidth: 100, textAlign: 'center', bgcolor: 'error.light' }}>
                <Typography variant="h4">{stats.absent}</Typography>
                <Typography variant="body2">Absent</Typography>
              </Paper>
              
              <Paper elevation={1} sx={{ p: 2, flex: 1, minWidth: 100, textAlign: 'center', bgcolor: 'info.light' }}>
                <Typography variant="h4">{stats.percentage}%</Typography>
                <Typography variant="body2">Attendance Rate</Typography>
              </Paper>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Attendance Records
        </Typography>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Tag</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Timestamp</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {session.target_users_details.map((user) => {
                const attendanceRecord = session.attendances.find(a => a.user === user.id);
                const isPresent = attendanceRecord ? attendanceRecord.is_present : false;
                
                return (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.tag || '-'}</TableCell>
                    <TableCell>
                      {attendanceRecord ? (
                        isPresent ? (
                          <Chip 
                            icon={<PresentIcon />} 
                            label="Present" 
                            color="success" 
                            size="small" 
                          />
                        ) : (
                          <Chip 
                            icon={<AbsentIcon />} 
                            label="Absent" 
                            color="error" 
                            size="small" 
                          />
                        )
                      ) : (
                        <Chip 
                          icon={<AbsentIcon />} 
                          label="Not Recorded" 
                          color="default" 
                          size="small" 
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {attendanceRecord ? 
                        moment(attendanceRecord.timestamp).format('MMM D, YYYY h:mm A') : 
                        '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default SessionDetails;