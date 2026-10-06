import ProductService from '../services/ProductService.js';
import CategoryService from '../services/CategoryService.js';

export class HomeVM {
  constructor() {
    this.state = {
      categories: [],
      products: [],
      loading: true,
      error: '',
    };
  }

  async load() {
    try {
      const [categories, home] = await Promise.all([
        CategoryService.listCategories(),
        ProductService.getFeaturedProducts(),
      ]);
      this.state = {
        categories: Array.isArray(categories) ? categories.slice(0, 8) : [],
        products: Array.isArray(home) ? home.slice(0, 8) : [],
        loading: false,
        error: '',
      };
      return this.state;
    } catch (error) {
      this.state = {
        categories: [],
        products: [],
        loading: false,
        error: error?.message || 'Can\'t reach the server.',
      };
      return this.state;
    }
  }
}

export default HomeVM;
