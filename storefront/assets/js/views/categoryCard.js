import { createElement } from '../core/dom.js';

export function renderCategoryCard(category) {
  const card = createElement('article', { className: 'category-tile' });
  const title = createElement('h3');
  title.textContent = category.name || 'Category';
  const description = createElement('p');
  description.textContent = category.description || 'Shop a curated collection.';
  const action = createElement('a', {
    className: 'secondary-button',
    attributes: { href: `./products.html?category=${encodeURIComponent(category.slug || category.id || '')}` },
  });
  action.textContent = 'Browse';
  card.append(title, description, action);
  return card;
}
