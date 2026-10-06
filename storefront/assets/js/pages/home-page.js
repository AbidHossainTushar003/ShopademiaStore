import { mountLayout } from '../views/header.js';
import { renderFooter } from '../views/footer.js';
import { renderProductCard } from '../views/productCard.js';
import { renderCategoryCard } from '../views/categoryCard.js';
import { renderEmptyState } from '../views/emptyState.js';
import { renderErrorState } from '../views/errorState.js';
import { showToast } from '../views/toasts.js';
import HomeVM from '../viewmodels/HomeVM.js';
import CartService from '../services/CartService.js';

const main = mountLayout();
main.innerHTML = `
  <section class="hero">
    <div class="hero-copy">
      <span class="badge">Modern catalog</span>
      <h1>Discover curated essentials for everyday life.</h1>
      <p>Shopademia brings together trusted products, secure checkout, and straightforward ordering from a central API.</p>
      <div class="hero-actions">
        <a class="primary-button" href="./products.html">Shop now</a>
        <a class="secondary-button" href="./login.html">Account</a>
      </div>
    </div>
    <div class="hero-panel">
      <h2>Fresh arrivals</h2>
      <p id="hero-summary">Loading catalog…</p>
      <div id="hero-summary-products" class="product-grid"></div>
    </div>
  </section>

  <section>
    <div class="section-head">
      <h2>Popular categories</h2>
      <a href="./products.html">View all products</a>
    </div>
    <div id="category-grid" class="category-grid"></div>
  </section>

  <section style="margin-top:2.5rem;">
    <div class="section-head">
      <h2>Featured products</h2>
      <a href="./products.html">See more</a>
    </div>
    <div id="featured-grid" class="product-grid"></div>
  </section>

  <section style="margin-top:2.5rem;">
    <div class="feature-panel">
      <h3>Secure checkout, COD, and bKash support</h3>
      <div class="grid three-col" style="margin-top:1rem;">
        <div class="summary-card" style="padding:1rem;">
          <h4>Secure checkout</h4>
          <p>Storefront requests are validated against the Shopademia API.</p>
        </div>
        <div class="summary-card" style="padding:1rem;">
          <h4>Cash on delivery</h4>
          <p>Order on delivery when the payment method is COD.</p>
        </div>
        <div class="summary-card" style="padding:1rem;">
          <h4>bKash verification</h4>
          <p>Manual payment confirmation keeps the order in a pending state.</p>
        </div>
      </div>
    </div>
  </section>
`;

const vm = new HomeVM();
const categoriesRoot = document.getElementById('category-grid');
const featuredRoot = document.getElementById('featured-grid');
const summaryRoot = document.getElementById('hero-summary-products');

async function renderHome() {
  const state = await vm.load();
  if (state.error) {
    categoriesRoot.replaceChildren(renderErrorState('Can\'t reach the server. Please try again later.'));
    featuredRoot.replaceChildren(renderErrorState('No products available right now.'));
    document.getElementById('hero-summary').textContent = 'Catalog unavailable.';
    return;
  }

  if (!state.categories.length) {
    categoriesRoot.replaceChildren(renderEmptyState('No categories yet', 'The storefront catalog is still being prepared.'));
  } else {
    categoriesRoot.replaceChildren(...state.categories.map((category) => renderCategoryCard(category)));
  }

  if (!state.products.length) {
    featuredRoot.replaceChildren(renderEmptyState('No products yet', 'The current catalog is empty.'));
    summaryRoot.replaceChildren(renderEmptyState('No products yet', 'The catalog is empty right now.'));
    document.getElementById('hero-summary').textContent = 'No products yet.';
  } else {
    summaryRoot.replaceChildren(...state.products.slice(0, 3).map((product) => renderProductCard(product, { onAdd: (item) => { CartService.addItem(item); showToast(`${item.name} added to cart.`); } })));
    featuredRoot.replaceChildren(...state.products.map((product) => renderProductCard(product, { onAdd: (item) => { CartService.addItem(item); showToast(`${item.name} added to cart.`); } })));
    document.getElementById('hero-summary').textContent = `${state.products.length} live items ready to ship.`;
  }
}

renderHome();
renderFooter();
