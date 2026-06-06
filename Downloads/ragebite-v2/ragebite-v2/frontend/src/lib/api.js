import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://ragebite-production.up.railway.app/api',
  withCredentials: true,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── IN-MEMORY TOKEN STORE ────────────────────────────────────────────────────
let accessToken = null;
export const setToken  = (t) => { accessToken = t; };
export const getToken  = ()  => accessToken;
export const clearToken = () => { accessToken = null; };

// ─── REQUEST: attach token ────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// ─── RESPONSE: auto-refresh on 401 ───────────────────────────────────────────
let isRefreshing = false;
let queue = [];

function processQueue(err, token) {
  queue.forEach(p => err ? p.reject(err) : p.resolve(token));
  queue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const orig = err.config;
    if (
      err.response?.status === 401 &&
      !orig._retry &&
      !orig.url.includes('/auth/refresh') &&
      !orig.url.includes('/auth/login')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        }).then((token) => {
          orig.headers.Authorization = `Bearer ${token}`;
          return api(orig);
        });
      }

      orig._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post('/auth/refresh');
        if (data.accessToken) {
          setToken(data.accessToken);
          orig.headers.Authorization = `Bearer ${data.accessToken}`;
          processQueue(null, data.accessToken);
        }
        return api(orig);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        clearToken();
        window.location.href = '/login?session=expired';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  register:       (d) => api.post('/auth/register', d),
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
