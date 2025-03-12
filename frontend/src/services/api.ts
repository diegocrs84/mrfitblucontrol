import axios from 'axios';
import { config } from '../config/env';
import { LoginResponse, User, UserLog } from '../types';

export const api = axios.create({
  baseURL: config.apiUrl,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', {
      username,
      password,
    });
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
  },
};

export const userService = {
  createUser: async (data: { username: string; password: string; role: string }): Promise<User> => {
    const response = await api.post<User>('/users', data);
    return response.data;
  },

  getUsers: async (): Promise<User[]> => {
    const response = await api.get<User[]>('/users');
    return response.data;
  },

  toggleUserStatus: async (userId: string): Promise<User> => {
    const response = await api.patch<User>(`/users/${userId}/toggle-status`);
    return response.data;
  },

  getUserLogs: async (): Promise<UserLog[]> => {
    const response = await api.get<UserLog[]>('/users/logs');
    return response.data;
  },
};

export default api; 