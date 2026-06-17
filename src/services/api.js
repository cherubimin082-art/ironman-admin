import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5002/api' });

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('sia_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      sessionStorage.removeItem('sia_token');
      sessionStorage.removeItem('sia_user');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export default api;
