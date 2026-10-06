import { apiClient } from './api-client.js';

export class CategoryService {
  static async listCategories() {
    const response = await apiClient.get('/categories');
    return Array.isArray(response?.data) ? response.data : [];
  }
}

export default CategoryService;
