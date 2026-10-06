import CartService from '../services/CartService.js';
import OrderService from '../services/OrderService.js';

export class CheckoutVM {
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

  get subtotalMinor() {
    return this.state.items.reduce((total, item) => total + Number(item.unitPriceMinor || 0) * Number(item.quantity || 0), 0);
  }

  async submit(shipping, paymentMethod = 'COD') {
    try {
      const payload = {
        recipientName: shipping.recipientName,
        phone: shipping.phone,
        addressLine1: shipping.addressLine1,
        addressLine2: shipping.addressLine2 || null,
        city: shipping.city,
        region: shipping.region,
        postalCode: shipping.postalCode,
        countryCode: shipping.countryCode || 'BD',
      };
      const result = await OrderService.checkout(payload);
      localStorage.setItem('shopademia-last-order', JSON.stringify(result));
      return result;
    } catch (error) {
      this.state = { ...this.state, error: error?.message || 'Checkout could not be completed.' };
      throw error;
    }
  }
}

export default CheckoutVM;
