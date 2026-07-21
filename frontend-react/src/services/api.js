import axios from 'axios';

const api = axios.create({
  baseURL: '/api' // Proxied in Vite dev, and matches root in production
});

// Request Interceptor to attach the token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('chef_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor to handle errors globally just in case
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    const message = error.response?.data?.detail || error.message || 'Request failed';
    return Promise.reject(new Error(message));
  }
);

export default api;
