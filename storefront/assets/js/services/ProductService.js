import { appConfig } from '../config.js';
import { apiClient } from './api-client.js';
import { Product } from '../models/Product.js';

export class ProductService {
  static async getFeaturedProducts() {
    const response = await apiClient.get('/storefront/home');
    const products = Array.isArray(response?.data?.recentProducts)
      ? response.data.recentProducts
      : Array.isArray(response?.data?.products)
        ? response.data.products
        : [];
    return products.map((item) => new Product(item));
  }

  static async listProducts(query = {}) {
    const params = new URLSearchParams();
    if (query.q) params.set('q', query.q);
    if (query.category) params.set('category', query.category);
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));
    if (query.sort) params.set('sort', query.sort);

    const response = await apiClient.get(`/products${params.toString() ? `?${params.toString()}` : ''}`);
    const items = Array.isArray(response?.data) ? response.data : [];
    return {
      items: items.map((item) => new Product(item)),
      pagination: response?.pagination ?? { page: 1, limit: appConfig.defaultPageSize, total: 0 },
    };
  }

  static async getProductById(identifier) {
    const response = await apiClient.get(`/products/${encodeURIComponent(identifier)}`);
    return new Product(response?.data ?? {});
  }

  static async getCategories() {
    const response = await apiClient.get('/categories');
    return Array.isArray(response?.data) ? response.data : [];
  }
}

export default ProductService;
