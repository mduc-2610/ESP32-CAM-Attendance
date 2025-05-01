import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';

// Context Providers
import { CameraProvider } from './context/CameraContext';
import { AttendanceProvider } from './context/AttendanceContext';

// Layout Components
import AppLayout from './components/shared/AppLayout';

// Pages
import Dashboard from './pages/Dashboard';
import UserList from './pages/users/UserList';
import UserForm from './pages/users/UserForm';
import FaceRegistration from './pages/users/FaceRegistration';
import SessionList from './pages/attendance/SessionList';
import SessionForm from './pages/attendance/SessionForm';
import SessionDetails from './pages/attendance/SessionDetails';
import FaceRecognition from './pages/attendance/FaceRecognition';
import AttendanceReport from './pages/attendance/AttendanceReport';
import TagManagement from './pages/users/TagManagement';
import NotFound from './pages/NotFound';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <CameraProvider>
        <AttendanceProvider>
          <Router>
            <ToastContainer position="top-right" autoClose={3000} />
            <Routes>
              <Route path="/" element={<AppLayout />}>
                <Route index element={<Dashboard />} />
                
                {/* User Routes */}
                <Route path="users">
                  <Route index element={<UserList />} />
                  <Route path="create" element={<UserForm isEdit={false} />} />
                  <Route path=":id/edit" element={<UserForm isEdit={true} />} />
                  <Route path=":id/register-face" element={<FaceRegistration />} />
                  <Route path="tags" element={<TagManagement />} />
                </Route>
                
                {/* Attendance Routes */}
                <Route path="attendance">
                  <Route path="sessions">
                    <Route index element={<SessionList />} />
                    <Route path="create" element={<SessionForm />} />
                    <Route path=":id/details" element={<SessionDetails />} />
                    <Route path=":id/recognition" element={<FaceRecognition />} />
                  </Route>
                  <Route path="reports" element={<AttendanceReport />} />
                </Route>
                
                {/* Catch-all route */}
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Router>
        </AttendanceProvider>
      </CameraProvider>
    </ThemeProvider>
  );
}

export default App;