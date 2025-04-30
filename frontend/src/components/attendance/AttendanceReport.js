// src/components/attendance/AttendanceReport.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Card,
  CardContent,
  TextField,
  IconButton
} from '@mui/material';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { 
  ArrowBack as ArrowBackIcon,
  FilterList as FilterIcon,
  FileDownload as DownloadIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { attendanceService } from '../../services/api';
import { toast } from 'react-toastify';
import moment from 'moment';

const AttendanceReport = () => {
  const navigate = useNavigate();
  
  const [startDate, setStartDate] = useState(moment().subtract(30, 'days'));
  const [endDate, setEndDate] = useState(moment());
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Load report data
  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      const formattedStartDate = startDate.format('YYYY-MM-DD');
      const formattedEndDate = endDate.format('YYYY-MM-DD');
      
      const data = await attendanceService.generateReport(formattedStartDate, formattedEndDate);
      setReportData(data);
    } catch (error) {
      toast.error('Failed to generate report');
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Load initial report on component mount
  useEffect(() => {
    fetchReportData();
  }, []);
  
  // Handle date changes
  const handleStartDateChange = (date) => {
    setStartDate(moment(date));
  };
  
  const handleEndDateChange = (date) => {
    setEndDate(moment(date));
  };
  
  // Handle filter button click
  const handleFilterClick = () => {
    fetchReportData();
  };
  
  // Export report as CSV
  const handleExportCSV = () => {
    if (!reportData || !reportData.sessions || reportData.sessions.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    try {
      // Create CSV content
      const headers = ['Session Name', 'Date', 'Status', 'Total Users', 'Present', 'Absent', 'Attendance Rate (%)'];
      
      const rows = reportData.sessions.map(session => [
        session.name,
        moment(session.date).format('MM/DD/YYYY'),
        session.is_finished ? 'Finished' : 'Active',
        session.total_users,
        session.present_users,
        session.absent_users,
        ((session.present_users / session.total_users) * 100).toFixed(1)
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      // Create and download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_report_${moment().format('YYYY-MM-DD')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Report exported successfully');
    } catch (error) {
      toast.error('Failed to export report');
      console.error('Error exporting report:', error);
    }
  };
  
  // Calculate overall statistics
  const calculateOverallStats = () => {
    if (!reportData || !reportData.sessions || reportData.sessions.length === 0) {
      return { sessions: 0, totalUsers: 0, totalPresent: 0, totalAbsent: 0, averageRate: 0 };
    }
    
    const sessions = reportData.sessions.length;
    const totalUsers = reportData.sessions.reduce((sum, session) => sum + session.total_users, 0);
    const totalPresent = reportData.sessions.reduce((sum, session) => sum + session.present_users, 0);
    const totalAbsent = reportData.sessions.reduce((sum, session) => sum + session.absent_users, 0);
    const averageRate = totalUsers > 0 ? Math.round((totalPresent / totalUsers) * 100) : 0;
    
    return { sessions, totalUsers, totalPresent, totalAbsent, averageRate };
  };
  
  const stats = calculateOverallStats();
  
  return (
    <LocalizationProvider dateAdapter={AdapterMoment}>
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
            Attendance Reports
          </Typography>
        </Box>
        
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={handleStartDateChange}
              renderInput={(params) => <TextField {...params} fullWidth />}
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={handleEndDateChange}
              minDate={startDate}
              renderInput={(params) => <TextField {...params} fullWidth />}
            />
          </Grid>
          
          <Grid item xs={12} md={4} sx={{ display: 'flex', alignItems: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<FilterIcon />}
              onClick={handleFilterClick}
              disabled={loading}
              sx={{ mr: 2 }}
            >
              Apply Filter
            </Button>
            
            <Button
              variant="outlined"
              color="primary"
              startIcon={<DownloadIcon />}
              onClick={handleExportCSV}
              disabled={loading || !reportData || reportData.sessions.length === 0}
            >
              Export CSV
            </Button>
          </Grid>
        </Grid>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {reportData && reportData.sessions && reportData.sessions.length > 0 ? (
              <>
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={6} md={2.4}>
                    <Card sx={{ bgcolor: 'background.paper' }}>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h6">Sessions</Typography>
                        <Typography variant="h4">{stats.sessions}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={2.4}>
                    <Card sx={{ bgcolor: 'background.paper' }}>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h6">Total Users</Typography>
                        <Typography variant="h4">{stats.totalUsers}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={2.4}>
                    <Card sx={{ bgcolor: 'success.light' }}>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h6">Present</Typography>
                        <Typography variant="h4">{stats.totalPresent}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={2.4}>
                    <Card sx={{ bgcolor: 'error.light' }}>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h6">Absent</Typography>
                        <Typography variant="h4">{stats.totalAbsent}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={2.4}>
                    <Card sx={{ bgcolor: 'info.light' }}>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h6">Average Rate</Typography>
                        <Typography variant="h4">{stats.averageRate}%</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
                
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Session Name</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Total Users</TableCell>
                        <TableCell>Present</TableCell>
                        <TableCell>Absent</TableCell>
                        <TableCell>Rate</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reportData.sessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell>{session.name}</TableCell>
                          <TableCell>{moment(session.date).format('MMM D, YYYY')}</TableCell>
                          <TableCell>
                            {session.is_finished ? (
                              <Chip label="Finished" color="default" size="small" />
                            ) : (
                              <Chip label="Active" color="success" size="small" />
                            )}
                          </TableCell>
                          <TableCell>{session.total_users}</TableCell>
                          <TableCell>{session.present_users}</TableCell>
                          <TableCell>{session.absent_users}</TableCell>
                          <TableCell>
                            {session.total_users > 0 ? 
                              `${Math.round((session.present_users / session.total_users) * 100)}%` : 
                              '0%'}
                          </TableCell>
                          <TableCell>
                            <IconButton 
                              color="primary" 
                              onClick={() => navigate(`/attendance/sessions/${session.id}/details`)}
                              title="View Details"
                            >
                              <ViewIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            ) : (
              <Alert severity="info">
                No sessions found for the selected date range.
              </Alert>
            )}
          </>
        )}
      </Paper>
    </LocalizationProvider>
  );
};

export default AttendanceReport;