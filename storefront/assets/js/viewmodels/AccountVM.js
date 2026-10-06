import AuthService from '../services/AuthService.js';

export class AccountVM {
  constructor() {
    this.state = {
      customer: null,
      orders: [],
      loading: true,
      error: '',
    };
  }

  async load() {
    try {
      const [customer, orders] = await Promise.all([
        AuthService.getProfile(),
        AuthService.getOrders(),
      ]);
      this.state = { customer, orders, loading: false, error: '' };
      return this.state;
    } catch (error) {
      this.state = {
        customer: null,
        orders: [],
        loading: false,
        error: error?.message || 'Account data is unavailable.',
      };
      return this.state;
    }
  }
}

export default AccountVM;
