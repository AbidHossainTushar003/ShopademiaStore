import { createElement } from '../core/dom.js';

export function renderErrorState(message) {
  const wrapper = createElement('div', { className: 'error-state' });
  const title = createElement('h3');
  title.textContent = 'Something went wrong';
  const detail = createElement('p');
  detail.textContent = message || 'Please try again.';
  wrapper.append(title, detail);
  return wrapper;
}
