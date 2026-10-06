import AuthService from '../services/AuthService.js';

export class AuthVM {
  constructor() {
    this.state = {
      loading: false,
      error: '',
      customer: null,
    };
  }

  async login({ email, password }) {
    this.state = { ...this.state, loading: true, error: '' };
    try {
      const token = await AuthService.login({ email, password });
      return token;
    } catch (error) {
      this.state = { ...this.state, loading: false, error: error?.message || 'Login failed.' };
      throw error;
    }
  }

  async register({ email, displayName, password }) {
    this.state = { ...this.state, loading: true, error: '' };
    try {
      const customer = await AuthService.register({ email, displayName, password });
      return customer;
    } catch (error) {
      this.state = { ...this.state, loading: false, error: error?.message || 'Registration failed.' };
      throw error;
    }
  }

  async loadProfile() {
    try {
      const customer = await AuthService.getProfile();
      this.state = { ...this.state, customer, loading: false, error: '' };
      return customer;
    } catch (error) {
      this.state = { ...this.state, loading: false, error: error?.message || 'Profile unavailable.' };
      return null;
    }
  }
}

export default AuthVM;
