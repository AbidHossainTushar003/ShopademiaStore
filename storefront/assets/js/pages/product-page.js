import { mountLayout } from '../views/header.js';
import { renderFooter } from '../views/footer.js';
import { renderEmptyState } from '../views/emptyState.js';
import { renderErrorState } from '../views/errorState.js';
import { showToast } from '../views/toasts.js';
import ProductDetailVM from '../viewmodels/ProductDetailVM.js';
import CartService from '../services/CartService.js';
import { formatMoneyBDT } from '../core/format.js';

const main = mountLayout();
main.innerHTML = '<div id="product-shell"></div>';

const vm = new ProductDetailVM();
const shell = document.getElementById('product-shell');

async function renderProduct() {
  const state = await vm.load();
  if (state.error) {
    shell.replaceChildren(renderErrorState('Can\'t reach the server. Please try again later.'));
    return;
  }

  if (!state.product) {
    shell.replaceChildren(renderEmptyState('Product unavailable', 'This product is not available in the current storefront.'));
    return;
  }

  const product = state.product;
  const images = product.images?.length ? product.images : [{ url: '', altText: product.name || 'Product image' }];
  const mainImage = images[0]?.url || '';
  shell.innerHTML = `
    <section class="product-detail-layout">
      <div class="gallery">
        <div class="gallery-main">
          <img src="${mainImage}" alt="${product.name || 'Product'}" />
        </div>
        <div class="gallery-thumbs">
          ${images.map((image) => `<button class="gallery-thumb" type="button" aria-label="View product image"><img src="${image.url}" alt="${product.name || 'Product'}" /></button>`).join('')}
        </div>
      </div>

      <div class="summary-panel">
        <div>
          <span class="badge">${product.category?.name || 'Catalog'}</span>
          <h1 style="margin-top:1rem;">${product.name || 'Product'}</h1>
          <p>${product.description || 'No description available.'}</p>
        </div>

        <div class="inline-price" style="font-size:2rem;">${formatMoneyBDT(product.priceMinor)}</div>
        <div class="stock-status ${product.availability || 'in_stock'}">${product.availability === 'out_of_stock' ? 'Out of stock' : product.availability === 'low_stock' ? 'Low stock' : 'In stock'}</div>

        <div class="quantity-stepper" aria-label="Choose quantity">
          <button type="button" data-action="decrease">−</button>
          <span id="quantity-value">1</span>
          <button type="button" data-action="increase">+</button>
        </div>

        <div class="hero-actions">
          <button class="primary-button" id="add-to-cart" type="button">Add to cart</button>
          <a class="ghost-button" href="./products.html">Continue shopping</a>
        </div>
      </div>
    </section>
  `;

  const quantityValue = document.getElementById('quantity-value');
  let quantity = 1;
  document.querySelector('[data-action="decrease"]').addEventListener('click', () => {
    quantity = Math.max(1, quantity - 1);
    quantityValue.textContent = String(quantity);
  });
  document.querySelector('[data-action="increase"]').addEventListener('click', () => {
    quantity = Math.min(10, quantity + 1);
    quantityValue.textContent = String(quantity);
  });

  document.getElementById('add-to-cart').addEventListener('click', () => {
    CartService.addItem(product, quantity);
    showToast(`${product.name} added to cart.`);
  });
}

renderProduct();
renderFooter();
