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
  }
};

// export const cameraService = {
//   getAllCameraConfigs: async () => {
//       const response = await api.get('/camera/configs/');
//       return response.data;
//     },

//   testConnection: async (data) => {
//     // First try a simple test endpoint that's lightweight
//     try {
//       // Try the test endpoint first (if available)
//       await axios.get(`http://${data.ip_address}/test`, { timeout: 5000 });
//       console.log("Preliminary connection test successful");
//     } catch (error) {
//       console.log("Preliminary test failed, continuing with main test");
//       // Continue anyway - the ESP32 might not have the test endpoint
//     }
    
//     // Then do the actual connection test
//     try {
//       const response = await retryableRequest(
//         () => cameraAxios.post('/api/camera/test-connection', data)
//       );
//       return response.data;
//     } catch (error) {
//       console.error("Connection test failed:", error);
//       throw error;
//     }
//   },
  
//   // Register a face
//   registerFace: async (data) => {
//     try {
//       const response = await retryableRequest(
//         () => cameraAxios.post('/api/camera/register-face', data)
//       );
//       return response.data;
//     } catch (error) {
//       console.error("Face registration failed:", error);
//       throw error;
//     }
//   },
  
//   // Recognize a face
//   recognizeFace: async (data) => {
//     try {
//       // For ESP32 mode, implement progressive timeout strategy
//       if (data.camera_mode === 'ESP32') {
//         // Clear any stream connection first by making a test request
//         try {
//           await fetch(`http://${data.esp32_ip}/test`, { 
//             method: 'GET',
//             mode: 'no-cors',
//             cache: 'no-cache',
//             headers: {
//               'Cache-Control': 'no-cache',
//               'Pragma': 'no-cache'
//             },
//             timeout: 1000
//           });
//         } catch (e) {
//           // Ignore errors on warm-up
//           console.log("Warm-up request completed");
//         }
        
//         // Short delay to let connections reset
//         await new Promise(resolve => setTimeout(resolve, 300));
//       }
      
//       // Main recognition request with retries
//       const response = await retryableRequest(
//         () => cameraAxios.post('/api/camera/recognize-face', data)
//       );
//       return response.data;
//     } catch (error) {
//       // Custom error handling for common issues
//       if (error.code === 'ECONNABORTED') {
//         return {
//           success: false,
//           message: 'Request timed out. The camera may be busy. Please try again.'
//         };
//       }
      
//       console.error("Face recognition failed:", error);
//       throw error;
//     }
//   },
  
//   // Train the face recognition model
//   trainModel: async () => {
//     try {
//       const response = await retryableRequest(
//         () => cameraAxios.post('/api/camera/train-model')
//       );
//       return response.data;
//     } catch (error) {
//       console.error("Model training failed:", error);
//       throw error;
//     }
//   }
// };

// const cameraAxios = axios.create({
//   timeout: 15000 
// });

// const retryableRequest = async (request, maxRetries = 3) => {
//   let retries = 0;
  
//   while (retries < maxRetries) {
//     try {
//       return await request();
//     } catch (error) {
//       retries++;
      
//       // If it's the last retry, throw the error
//       if (retries >= maxRetries) {
//         throw error;
//       }
      
//       // Wait before retrying (increasing delay with each retry)
//       await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      
//       console.log(`Retrying request (${retries}/${maxRetries})...`);
//     }
//   }
// };

export default api;