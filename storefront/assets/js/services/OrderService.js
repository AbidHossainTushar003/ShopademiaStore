import { apiClient } from './api-client.js';

export class OrderService {
  static async checkout(payload) {
    const response = await apiClient.post('/checkout', payload, { auth: true });
    return response?.data ?? null;
  }

  static async listOrders() {
    const response = await apiClient.get('/orders', { auth: true });
    return Array.isArray(response?.data) ? response.data : [];
  }
}

export default OrderService;
