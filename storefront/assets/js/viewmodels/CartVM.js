import CartService from '../services/CartService.js';

export class CartVM {
  constructor() {
    this.state = {
      items: [],
      loading: false,
      error: '',
    };
  }

  load() {
    const items = CartService.getLocalCart();
    this.state = { items, loading: false, error: '' };
    return this.state;
  }

  addItem(product, quantity = 1) {
    const items = CartService.addItem(product, quantity);
    this.state = { items, loading: false, error: '' };
    return this.state;
  }

  updateQuantity(productId, quantity) {
    const items = CartService.updateQuantity(productId, quantity);
    this.state = { items, loading: false, error: '' };
    return this.state;
  }

  removeItem(productId) {
    const items = CartService.removeItem(productId);
    this.state = { items, loading: false, error: '' };
    return this.state;
  }

  get subtotalMinor() {
    return this.state.items.reduce((total, item) => total + Number(item.unitPriceMinor || 0) * Number(item.quantity || 0), 0);
  }
}

export default CartVM;
