import { createElement } from '../core/dom.js';

export function renderProductSkeletons(count = 4) {
  const wrapper = createElement('div', { className: 'product-grid' });
  for (let index = 0; index < count; index += 1) {
    const card = createElement('div', { className: 'product-card' });
    const image = createElement('div', { className: 'product-image-wrap' });
    image.style.background = 'linear-gradient(135deg, #e2e8f0, #f1f5f9)';
    const body = createElement('div', { className: 'product-card-body' });
    body.innerHTML = '<div style="height:20px;background:#e2e8f0;border-radius:999px;margin-bottom:10px"></div><div style="height:14px;background:#e2e8f0;border-radius:999px;width:60%;margin-bottom:14px"></div><div style="height:18px;background:#e2e8f0;border-radius:999px;width:40%"></div>';
    card.append(image, body);
    wrapper.appendChild(card);
  }
  return wrapper;
}

export function renderCategorySkeletons(count = 4) {
  const wrapper = createElement('div', { className: 'category-grid' });
  for (let index = 0; index < count; index += 1) {
    const card = createElement('div', { className: 'category-tile' });
    card.innerHTML = '<div style="height:18px;background:#e2e8f0;border-radius:999px;width:55%;margin-bottom:16px"></div><div style="height:12px;background:#e2e8f0;border-radius:999px;width:90%;margin-bottom:10px"></div><div style="height:12px;background:#e2e8f0;border-radius:999px;width:70%"></div>';
    wrapper.appendChild(card);
  }
  return wrapper;
}
