import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5002/api' });

api.interceptors.request.use((config) => {
  const role = sessionStorage.getItem('sia_active_role');
  const token = role ? localStorage.getItem(`sia_token_${role}`) : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      const role = sessionStorage.getItem('sia_active_role');
      if (role) {
        localStorage.removeItem(`sia_token_${role}`);
        localStorage.removeItem(`sia_user_${role}`);
      }
      sessionStorage.removeItem('sia_active_role');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export default api;
