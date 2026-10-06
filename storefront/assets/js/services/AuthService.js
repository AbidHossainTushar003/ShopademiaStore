import { apiClient } from './api-client.js';
import CartService from './CartService.js';

export class AuthService {
  static async register({ email, displayName, password }) {
    const response = await apiClient.post('/auth/register', { email, displayName, password });
    return response?.data ?? null;
  }

  static async login({ email, password }) {
    const response = await apiClient.post('/auth/login', { email, password });
    const token = response?.data ?? null;
    if (token?.accessToken) {
      CartService.setAuthToken(token);
    }
    return token;
  }

  static getSession() {
    const token = CartService.getAuthToken();
    return token ? { accessToken: token } : null;
  }

  static async getProfile() {
    const token = CartService.getAuthToken();
    if (!token) return null;
    const response = await apiClient.get('/customers/me', { auth: true });
    return response?.data ?? null;
  }

  static async getOrders() {
    const response = await apiClient.get('/orders', { auth: true });
    return Array.isArray(response?.data) ? response.data : [];
  }
}

export default AuthService;
