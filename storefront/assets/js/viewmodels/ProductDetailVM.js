import ProductService from '../services/ProductService.js';
import { getQueryParam } from '../core/router.js';

export class ProductDetailVM {
  constructor() {
    this.state = {
      product: null,
      loading: true,
      error: '',
    };
    this.identifier = getQueryParam('id') || getQueryParam('slug') || '1';
  }

  async load() {
    try {
      const product = await ProductService.getProductById(this.identifier);
      this.state = { product, loading: false, error: '' };
      return this.state;
    } catch (error) {
      this.state = {
        product: null,
        loading: false,
        error: error?.message || 'Can\'t reach the server.',
      };
      return this.state;
    }
  }
}

export default ProductDetailVM;
