import axios from 'axios';
import { config } from '../config/env';
import { LoginResponse, User, UserLog, Product, CreateProductDTO } from '../types';

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

export const productService = {
  createProduct: async (data: CreateProductDTO): Promise<Product> => {
    const response = await api.post<Product>('/products', data);
    return response.data;
  },

  getProducts: async (): Promise<Product[]> => {
    const response = await api.get<Product[]>('/products');
    return response.data;
  },

  updateProduct: async (id: string, data: Partial<CreateProductDTO>): Promise<Product> => {
    const response = await api.put<Product>(`/products/${id}`, data);
    return response.data;
  },

  toggleProductStatus: async (id: string): Promise<Product> => {
    const response = await api.patch<Product>(`/products/${id}/toggle-status`);
    return response.data;
  },

  deleteProduct: async (id: string): Promise<void> => {
    await api.delete(`/products/${id}`);
  }
};

export default api; 