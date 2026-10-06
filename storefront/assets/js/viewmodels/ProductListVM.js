import ProductService from '../services/ProductService.js';
import { getQueryParam } from '../core/router.js';

export class ProductListVM {
  constructor() {
    this.state = {
      items: [],
      pagination: { page: 1, limit: 12, total: 0 },
      loading: true,
      error: '',
    };
    const query = new URLSearchParams(window.location.search);
    this.q = query.get('q') || '';
    this.category = query.get('category') || '';
    this.sort = query.get('sort') || 'newest';
  }

  async load() {
    try {
      const response = await ProductService.listProducts({
        q: this.q,
        category: this.category,
        sort: this.sort,
        page: 1,
        limit: 12,
      });
      this.state = {
        items: response.items,
        pagination: response.pagination,
        loading: false,
        error: '',
      };
      return this.state;
    } catch (error) {
      this.state = {
        items: [],
        pagination: { page: 1, limit: 12, total: 0 },
        loading: false,
        error: error?.message || 'Can\'t reach the server.',
      };
      return this.state;
    }
  }
}

export default ProductListVM;
