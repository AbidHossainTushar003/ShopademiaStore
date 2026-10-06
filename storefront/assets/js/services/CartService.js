import { apiClient } from './api-client.js';

const CART_STORAGE_KEY = 'shopademia-cart';
const AUTH_STORAGE_KEY = 'shopademia-auth';

export class CartService {
  static getLocalCart() {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    try {
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static saveLocalCart(items) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }

  static getCartCount() {
    return this.getLocalCart().reduce((total, item) => total + Number(item.quantity || 0), 0);
  }

  static addItem(product, quantity = 1) {
    const cart = this.getLocalCart();
    const next = [...cart];
    const existingIndex = next.findIndex((entry) => String(entry.productId) === String(product.id));
    if (existingIndex >= 0) {
      next[existingIndex].quantity = Number(next[existingIndex].quantity || 0) + Number(quantity);
    } else {
      next.push({
        productId: product.id,
        productName: product.name,
        quantity: Number(quantity),
        unitPriceMinor: Number(product.priceMinor ?? product.price_minor ?? 0),
        imageUrl: product.images?.[0]?.url || '',
      });
    }
    this.saveLocalCart(next);
    return next;
  }

  static updateQuantity(productId, quantity) {
    const cart = this.getLocalCart().map((item) => ({ ...item, quantity: Number(item.quantity || 0) }));
    const next = cart.map((item) => (String(item.productId) === String(productId)
      ? { ...item, quantity: Math.max(0, Number(quantity)) }
      : item));
    const filtered = next.filter((item) => Number(item.quantity) > 0);
    this.saveLocalCart(filtered);
    return filtered;
  }

  static removeItem(productId) {
    const filtered = this.getLocalCart().filter((item) => String(item.productId) !== String(productId));
    this.saveLocalCart(filtered);
    return filtered;
  }

  static clearCart() {
    localStorage.removeItem(CART_STORAGE_KEY);
  }

  static getAuthToken() {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed.accessToken || null;
    } catch {
      return null;
    }
  }

  static setAuthToken(tokenData) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(tokenData || {}));
  }

  static clearAuthToken() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  static getCustomer() {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed.customer || null;
    } catch {
      return null;
    }
  }
}

export default CartService;
