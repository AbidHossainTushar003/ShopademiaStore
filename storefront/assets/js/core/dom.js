export function qs(selector, parent = document) {
  return parent.querySelector(selector);
}

export function qsa(selector, parent = document) {
  return Array.from(parent.querySelectorAll(selector));
}

export function setText(node, value) {
  if (!node) return;
  node.textContent = value ?? '';
}

export function createElement(tagName, options = {}) {
  const element = document.createElement(tagName);
  if (options.className) element.className = options.className;
  if (options.text) element.textContent = options.text;
  if (options.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      element.setAttribute(key, String(value));
    });
  }
  return element;
}

export function showToast(message, tone = 'info') {
  const stack = qs('.toast-stack') || document.body.appendChild(createElement('div', { className: 'toast-stack' }));
  const toast = createElement('div', { className: `toast toast-${tone}` });
  toast.textContent = message;
  stack.appendChild(toast);
  window.setTimeout(() => {
    toast.remove();
  }, 2800);
}

export function renderLoadingState(message = 'Loading…') {
  const wrapper = createElement('div', { className: 'loading-state' });
  wrapper.textContent = message;
  return wrapper;
}

export function renderEmptyState(title, message) {
  const wrapper = createElement('div', { className: 'empty-state' });
  const heading = createElement('h3');
  heading.textContent = title;
  const detail = createElement('p');
  detail.textContent = message;
  wrapper.append(heading, detail);
  return wrapper;
}

export function renderErrorState(message) {
  const wrapper = createElement('div', { className: 'error-state' });
  wrapper.textContent = message;
  return wrapper;
}
