import api from './api';
import { LoginRequest, AuthResponse } from '../types/auth';

export const authService = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/login', data);
    if (res.data.token) {
        localStorage.setItem('token', res.data.token);
    }
    return res.data;
  },
  logout: () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  },
  isAuthenticated: () => !!localStorage.getItem('token')
};