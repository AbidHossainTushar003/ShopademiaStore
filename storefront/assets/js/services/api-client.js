import { appConfig } from '../config.js';

function getTokenFromStorage() {
  try {
    const raw = localStorage.getItem('shopademia-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.accessToken || null;
  } catch {
    return null;
  }
}

function normaliseError(error, response) {
  const payload = response && typeof response === 'object' ? response : {};
  const message = payload.error?.message || payload.message || error?.message || 'Request failed.';
  const normalized = new Error(message);
  normalized.status = response?.status ?? error?.status ?? 0;
  normalized.code = payload.error?.code || payload.code || 'REQUEST_FAILED';
  return normalized;
}

export class ApiClient {
  constructor() {
    this.baseUrl = appConfig.apiBaseUrl;
  }

  buildUrl(path) {
    const cleanPath = String(path || '').startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${cleanPath}`;
  }

  async request(path, options = {}) {
    const { method = 'GET', body, headers = {}, auth = false, timeoutMs = 15000 } = options;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const mergedHeaders = {
        'Content-Type': 'application/json',
        ...headers,
      };

      if (appConfig.storeKey && appConfig.storeKey !== 'REPLACE_WITH_VALID_STORE_KEY') {
        mergedHeaders['X-Store-Key'] = appConfig.storeKey;
      }

      if (auth) {
        const token = getTokenFromStorage();
        if (token) {
          mergedHeaders.Authorization = `Bearer ${token}`;
        }
      }

      const requestOptions = {
        method,
        headers: mergedHeaders,
        signal: controller.signal,
      };

      if (body !== undefined && body !== null) {
        requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      const response = await fetch(this.buildUrl(path), requestOptions);
      const rawText = await response.text();
      let payload = null;

      try {
        payload = rawText ? JSON.parse(rawText) : null;
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const errorPayload = payload && typeof payload === 'object' ? payload : { message: 'Request failed.' };
        throw normaliseError(new Error('Request failed'), { ...errorPayload, status: response.status });
      }

      return payload;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Can\'t reach the server.');
      }
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async get(path, options = {}) {
    return this.request(path, { ...options, method: 'GET' });
  }

  async post(path, body, options = {}) {
    return this.request(path, { ...options, method: 'POST', body });
  }

  async patch(path, body, options = {}) {
    return this.request(path, { ...options, method: 'PATCH', body });
  }

  async put(path, body, options = {}) {
    return this.request(path, { ...options, method: 'PUT', body });
  }

  async delete(path, options = {}) {
    return this.request(path, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
export default apiClient;