import axios from 'axios';
//const api = axios.create({ baseURL: 'http://localhost:5000/api' });
const api = axios.create({ baseURL:'https://ideal-goggles-rwvj9vg75qph54gg-5250.app.github.dev/api'});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 當 Token 失效時自動登出
api.interceptors.response.use(res => res, err => {
    if (err.response && err.response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
    }
    return Promise.reject(err);
});

export default api;