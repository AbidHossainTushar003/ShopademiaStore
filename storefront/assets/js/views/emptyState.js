import { createElement } from '../core/dom.js';

export function renderEmptyState(title, message) {
  const wrapper = createElement('div', { className: 'empty-state' });
  const heading = createElement('h3');
  heading.textContent = title;
  const detail = createElement('p');
  detail.textContent = message;
  wrapper.append(heading, detail);
  return wrapper;
}
