export interface User {
  _id: string;
  username: string;
  role: 'admin' | 'user';
  isActive: boolean;
  isFirstAccess: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserLog {
  _id: string;
  action: 'create' | 'update' | 'delete';
  userId: {
    _id: string;
    username: string;
  };
  performedBy: {
    _id: string;
    username: string;
  };
  details: any;
  createdAt: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  category: 'Frango' | 'Carne' | 'Peixe' | 'Vegetariano';
  costPrice: number;
  sellingPrice: number;
  ifoodPrice: number;
  quantity: number;
  weight: string;
  expirationDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductDTO {
  name: string;
  description: string;
  category: 'Frango' | 'Carne' | 'Peixe' | 'Vegetariano';
  costPrice: number;
  sellingPrice: number;
  ifoodPrice: number;
  quantity: number;
  weight: string;
  expirationDate: string;
} 