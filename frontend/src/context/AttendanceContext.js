import React, { createContext, useState, useContext, useCallback } from 'react';
import { attendanceService } from '../services/api';
import { toast } from 'react-toastify';

const AttendanceContext = createContext();

export const AttendanceProvider = ({ children }) => {
  const [currentSession, setCurrentSession] = useState(null);
  const [recognizedUsers, setRecognizedUsers] = useState([]);
  const [recognitionActive, setRecognitionActive] = useState(false);
  
  // Start new attendance session
  const startSession = useCallback(async (sessionData) => {
    try {
      const newSession = await attendanceService.createSession(sessionData);
      setCurrentSession(newSession);
      setRecognizedUsers([]);
      toast.success('Session started successfully');
      return newSession;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start session');
      return null;
    }
  }, []);
  
  // Load existing session
  const loadSession = useCallback(async (sessionId) => {
    try {
      const session = await attendanceService.getSessionById(sessionId);
      
      if (session.is_finished) {
        toast.info('This session is already finished');
      }
      
      setCurrentSession(session);
      
      // Get already recognized users from attendance records
      const recognizedUsers = session.attendances
        .filter(attendance => attendance.is_present)
        .map(attendance => ({
          id: attendance.user,
          name: attendance.user_details.name,
          timestamp: new Date(attendance.timestamp),
        }));
      
      setRecognizedUsers(recognizedUsers);
      return session;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load session');
      return null;
    }
  }, []);
  
  // Mark attendance for a user
  const markAttendance = useCallback(async (userId) => {
    if (!currentSession) {
      toast.error('No active session');
      return false;
    }
    
    try {
      const result = await attendanceService.markAttendance(currentSession.id, {
        user_id: userId,
        is_present: true
      });
      
      if (result.success) {
        // Update recognized users list
        const user = currentSession.target_users_details.find(u => u.id === userId);
        
        if (user && !recognizedUsers.some(ru => ru.id === userId)) {
          setRecognizedUsers(prev => [
            ...prev,
            {
              id: userId,
              name: user.name,
              timestamp: new Date(),
            }
          ]);
        }
        
        return true;
      } else {
        toast.error('Failed to mark attendance');
        return false;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to mark attendance');
      return false;
    }
  }, [currentSession, recognizedUsers]);
  
  // Finish attendance session
  const finishSession = useCallback(async () => {
    if (!currentSession) {
      toast.error('No active session');
      return false;
    }
    
    try {
      const result = await attendanceService.finishSession(currentSession.id);
      
      if (result.success) {
        setCurrentSession({
          ...currentSession,
          is_active: false,
          is_finished: true,
          end_time: new Date().toISOString()
        });
        
        setRecognitionActive(false);
        toast.success('Session finished successfully');
        return true;
      } else {
        toast.error('Failed to finish session');
        return false;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to finish session');
      return false;
    }
  }, [currentSession]);
  
  const value = {
    currentSession,
    setCurrentSession,
    recognizedUsers,
    setRecognizedUsers,
    recognitionActive,
    setRecognitionActive,
    startSession,
    loadSession,
    markAttendance,
    finishSession,
  };
  
  return (
    <AttendanceContext.Provider value={value}>
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
};