import axios from 'axios';

const baseURL =
  (process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:3002') + '/api';

const api = axios.create({
  baseURL,
  withCredentials: true,
});

export const setupApiInterceptors = (onUnauthorized: () => void) => {
  const interceptor = api.interceptors.response.use(
    (res) => res,
    (err) => {
      const status = err?.response?.status;
      const skip = err?.config?.headers?.['x-skip-token-modal'] || err?.config?.headers?.['X-Skip-Token-Modal'];
      if (status === 401 && !skip && typeof window !== 'undefined') {
        try {
          onUnauthorized();
        } catch (e) {
          console.warn('onUnauthorized handler failed', e);
        }
      }
      return Promise.reject(err);
    }
  );
  return () => api.interceptors.response.eject(interceptor);
};

export const setAuthToken = (token: string | null) => {
  if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  else delete api.defaults.headers.common['Authorization'];
};

export const refreshAccessToken = async () => {
  const resp = await api.post('/users/auth/refresh-token');
  return resp.data;
};

export default api;
