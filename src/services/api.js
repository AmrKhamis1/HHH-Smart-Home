import axios from 'axios';

const API_BASE_URL = 'http://192.168.1.6:3001';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

const getStoredToken = () => {
  try {
    const storedData = localStorage.getItem('accessToken');
    if (!storedData) return null;
    const parsed = JSON.parse(storedData);
    return parsed.success;
  } catch (error) {
    return null;
  }
};

// Auth API calls
export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (fname, lname, email, password) => {
    const response = await api.post('/auth', { fname, lname, email, password });
    return response.data;
  },

  verifyToken: async (token) => {
    const response = await api.get('/auth/verify', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};

// Sensor API calls (placeholder for your implementation)
export const sensorAPI = {
  getAllSensors: async () => {
    // Placeholder - implement when you add sensor endpoints
    const response = await api.get('/sensors');
    return response.data;
  },

  getSensorData: async (sensorId) => {
    // Placeholder - implement when you add sensor endpoints
    const response = await api.get(`/sensors/${sensorId}`);
    return response.data;
  },

  updateSensorSettings: async (sensorId, settings) => {
    // Placeholder - implement when you add sensor endpoints
    const response = await api.put(`/sensors/${sensorId}`, settings);
    return response.data;
  }
};

export default api;