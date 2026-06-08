import axios from 'axios';

const API = 'https://ragebite-production.up.railway.app/api';

const api = axios.create({
  baseURL: API,
  withCredentials: true,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

let accessToken = null;
export const setToken = (t) => { accessToken = t; };
export const getToken = () => accessToken;
export const clearToken = () => { accessToken = null; };

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
);

export const authAPI = {
  register:       (d) => api.post('/auth/signup', d),
  verifyOTP:      (d) => api.post('/auth/verify-otp', d),
  resendOTP:      (d) => api.post('/auth/resend-otp', d),
  login:          (d) => api.post('/auth/login', d),
  logout:         ()  => api.post('/auth/logout'),
  me:             ()  => api.get('/auth/me'),
  checkUsername:  (u) => api.post('/auth/check-username', { username: u }),
  forgotPassword: (e) => api.post('/auth/forgot-password', { email: e }),
  resetPassword:  (d) => api.post('/auth/reset-password', d),
};

export const userAPI = {
  dashboard:    () => api.get('/user/dashboard'),
  leaderboard:  () => api.get('/user/leaderboard'),
  updateProfile:(d) => api.patch('/user/profile', d),
};

export default api;
