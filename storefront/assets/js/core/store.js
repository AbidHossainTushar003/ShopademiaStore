class AppStore {
  constructor() {
    this.state = {
      cart: [],
      auth: null,
      toast: [],
    };
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setState(patch) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener(this.state));
  }

  getState() {
    return this.state;
  }
}

export const appStore = new AppStore();
export default appStore;
