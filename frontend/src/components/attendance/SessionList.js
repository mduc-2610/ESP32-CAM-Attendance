// src/components/attendance/SessionList.js
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  TablePagination,
  Button,
  IconButton,
  Chip,
  TextField,
  InputAdornment
} from '@mui/material';
import { 
  AddCircle as AddIcon, 
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  PlayArrow as ResumeIcon,
  Assessment as ReportIcon
} from '@mui/icons-material';
import { attendanceService } from '../../services/api';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import moment from 'moment';

const SessionList = () => {
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  const navigate = useNavigate();
  
  // Load sessions on component mount
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const data = await attendanceService.getAllSessions();
        setSessions(data);
        setFilteredSessions(data);
      } catch (error) {
        toast.error('Failed to load sessions');
        console.error('Error loading sessions:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSessions();
  }, []);
  
  // Filter sessions when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSessions(sessions);
    } else {
      const filtered = sessions.filter(session => 
        session.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (session.description && session.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredSessions(filtered);
    }
    
    setPage(0); // Reset to first page on search
  }, [searchQuery, sessions]);
  
  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };
  
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  const handleDeleteSession = async (sessionId) => {
    if (window.confirm('Are you sure you want to delete this session?')) {
      try {
        await attendanceService.deleteSession(sessionId);
        
        // Update sessions list
        setSessions(sessions.filter(session => session.id !== sessionId));
        toast.success('Session deleted successfully');
      } catch (error) {
        toast.error('Failed to delete session');
        console.error('Error deleting session:', error);
      }
    }
  };
  
  const handleResumeSession = (sessionId) => {
    navigate(`/attendance/sessions/${sessionId}/recognition`);
  };
  
  const renderSessionStatus = (session) => {
    if (session.is_finished) {
      return <Chip label="Finished" color="default" size="small" />;
    } else if (session.is_active) {
      return <Chip label="Active" color="success" size="small" />;
    } else {
      return <Chip label="Inactive" color="error" size="small" />;
    }
  };
  
  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Attendance Sessions</Typography>
        
        <Box>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            component={Link}
            to="/attendance/sessions/create"
            sx={{ mr: 1 }}
          >
            New Session
          </Button>
          
          <Button 
            variant="outlined" 
            color="primary" 
            startIcon={<ReportIcon />}
            component={Link}
            to="/attendance/reports"
          >
            Reports
          </Button>
        </Box>
      </Box>
      
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search sessions..."
        value={searchQuery}
        onChange={handleSearchChange}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />
      
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Camera Mode</TableCell>
              <TableCell>Target Users</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">Loading...</TableCell>
              </TableRow>
            ) : filteredSessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">No sessions found</TableCell>
              </TableRow>
            ) : (
              filteredSessions
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>{session.name}</TableCell>
                    <TableCell>{moment(session.session_date).format('MMM D, YYYY')}</TableCell>
                    <TableCell>{renderSessionStatus(session)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={session.camera_mode === 'WEBCAM' ? 'Webcam' : 'ESP32-CAM'} 
                        color={session.camera_mode === 'WEBCAM' ? 'primary' : 'secondary'}
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>{session.target_users ? session.target_users.length : 0}</TableCell>
                    <TableCell>
                      <IconButton 
                        color="primary" 
                        component={Link}
                        to={`/attendance/sessions/${session.id}/details`}
                        title="View Details"
                      >
                        <ViewIcon />
                      </IconButton>
                      
                      {!session.is_finished && (
                        <IconButton 
                          color="success" 
                          onClick={() => handleResumeSession(session.id)}
                          title="Resume Recognition"
                        >
                          <ResumeIcon />
                        </IconButton>
                      )}
                      
                      {!session.is_finished && (
                        <IconButton 
                          color="error" 
                          onClick={() => handleDeleteSession(session.id)}
                          title="Delete Session"
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <TablePagination
        component="div"
        count={filteredSessions.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25]}
      />
    </Paper>
  );
};

export default SessionList;