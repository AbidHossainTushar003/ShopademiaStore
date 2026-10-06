import { formatMoneyBDT } from '../core/format.js';
import { createElement } from '../core/dom.js';

export function renderProductCard(product, options = {}) {
  const article = createElement('article', { className: 'product-card' });
  const imageWrap = createElement('div', { className: 'product-image-wrap' });
  const img = createElement('img', {
    attributes: {
      src: product.images?.[0]?.url || '',
      alt: product.name || 'Product image',
      loading: 'lazy',
    },
  });
  imageWrap.appendChild(img);

  const body = createElement('div', { className: 'product-card-body' });
  const name = createElement('h3');
  name.textContent = product.name;

  const meta = createElement('div', { className: 'product-meta' });
  const category = createElement('span');
  category.textContent = product.category?.name || 'Catalog';
  const status = createElement('span', { className: `stock-status ${product.availability || 'in_stock'}` });
  status.textContent = product.availability === 'out_of_stock' ? 'Out of stock' : product.availability === 'low_stock' ? 'Low stock' : 'In stock';
  meta.append(category, status);

  const price = createElement('div', { className: 'inline-price' });
  price.textContent = formatMoneyBDT(product.priceMinor);

  const actions = createElement('div', { className: 'hero-actions' });
  const link = createElement('a', { className: 'secondary-button', attributes: { href: `./product.html?id=${product.id || product.slug || ''}` } });
  link.textContent = 'View';

  const addButton = createElement('button', { className: 'primary-button' });
  addButton.type = 'button';
  addButton.textContent = 'Add to cart';
  addButton.disabled = (product.availability || 'in_stock') === 'out_of_stock';
  addButton.addEventListener('click', () => options.onAdd && options.onAdd(product));

  actions.append(link, addButton);
  body.append(name, meta, price, actions);
  article.append(imageWrap, body);
  return article;
}
