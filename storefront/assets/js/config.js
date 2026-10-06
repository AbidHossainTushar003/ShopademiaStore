const defaultConfig = Object.freeze({
  // Set the real production values in the deployed storefront before launch.
  apiBaseUrl: 'https://api.shopademia.store/api/v1',
  storeKey: 'REPLACE_WITH_VALID_STORE_KEY',
  defaultPageSize: 12,
  appName: 'Shopademia',
});

const runtimeConfig = globalThis.__SHOPADEMIA_CONFIG__ || {};

export const appConfig = {
  ...defaultConfig,
  ...runtimeConfig,
};

export default appConfig;
