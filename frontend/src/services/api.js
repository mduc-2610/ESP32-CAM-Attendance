// src/services/api.js
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Create axios instance with defaults
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// User API Service
export const userService = {
  getAllUsers: async () => {
    const response = await api.get('/users/');
    return response.data;
  },
  
  searchUsers: async (query) => {
    const response = await api.get(`/users/?search=${query}`);
    return response.data;
  },
  
  getUserById: async (id) => {
    const response = await api.get(`/users/${id}/`);
    return response.data;
  },
  
  getUserFaceImages: async (id) => {
    const response = await api.get(`/users/${id}/face_images/`);
    return response.data;
  },
  
  createUser: async (userData) => {
    const response = await api.post('/users/', userData);
    return response.data;
  },
  
  updateUser: async (id, userData) => {
    const response = await api.put(`/users/${id}/`, userData);
    return response.data;
  },
  
  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}/`);
    return response.data;
  },
  
  getUsersByTag: async (tagId) => {
    const response = await api.get(`/users/by_tag/?tag_id=${tagId}`);
    return response.data;
  }
};

// UserTag API Service
export const tagService = {
  getAllTags: async () => {
    const response = await api.get('/user-tags/');
    return response.data;
  },
  
  searchTags: async (query) => {
    const response = await api.get(`/user-tags/?search=${query}`);
    return response.data;
  },
  
  getTagById: async (id) => {
    const response = await api.get(`/user-tags/${id}/`);
    return response.data;
  },
  
  createTag: async (tagData) => {
    const response = await api.post('/user-tags/', tagData);
    return response.data;
  },
  
  updateTag: async (id, tagData) => {
    const response = await api.put(`/user-tags/${id}/`, tagData);
    return response.data;
  },
  
  deleteTag: async (id) => {
    const response = await api.delete(`/user-tags/${id}/`);
    return response.data;
  },
  
  getUsersByTag: async (id) => {
    const response = await api.get(`/user-tags/${id}/users/`);
    return response.data;
  }
};

// Attendance Session API Service
export const attendanceService = {
  getAllSessions: async () => {
    const response = await api.get('/attendance/sessions/');
    return response.data;
  },
  
  getSessionById: async (id) => {
    const response = await api.get(`/attendance/sessions/${id}/`);
    return response.data;
  },
  
  createSession: async (sessionData) => {
    const response = await api.post('/attendance/sessions/', sessionData);
    return response.data;
  },
  
  updateSession: async (id, sessionData) => {
    const response = await api.put(`/attendance/sessions/${id}/`, sessionData);
    return response.data;
  },
  
  deleteSession: async (id) => {
    const response = await api.delete(`/attendance/sessions/${id}/`);
    return response.data;
  },
  
  markAttendance: async (sessionId, data) => {
    const response = await api.post(`/attendance/sessions/${sessionId}/mark_attendance/`, data);
    return response.data;
  },
  
  finishSession: async (sessionId) => {
    const response = await api.post(`/attendance/sessions/${sessionId}/finish_session/`);
    return response.data;
  },
  
  generateReport: async (startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const response = await api.get(`/attendance/sessions/report/?${params.toString()}`);
    return response.data;
  }
};

// Camera API Service
export const cameraService = {
  getAllCameraConfigs: async () => {
    const response = await api.get('/camera/configs/');
    return response.data;
  },
  
  testConnection: async (ipData) => {
    const response = await api.post('/camera/configs/test_connection/', ipData);
    return response.data;
  },
  
  registerFace: async (data) => {
    const response = await api.post('/face-recognition/register_face/', data);
    return response.data;
  },
  
  recognizeFace: async (data) => {
    const response = await api.post('/face-recognition/recognize_face/', data);
    return response.data;
  },

  deleteFaceImage: async (imageId) => {
    const response = await api.post('/face-recognition/delete_face_image/', { image_id: imageId });
    return response.data;
  },
};

export default api;