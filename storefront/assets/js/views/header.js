import { CartService } from '../services/CartService.js';

export function renderHeader() {
  const root = document.getElementById('app-shell');
  if (!root) return;

  const cartCount = CartService.getCartCount();

  root.innerHTML = `
    <div class="app-shell">
      <header class="site-header">
        <div class="container">
          <div class="brand-wrap">
            <a href="./index.html" class="brand" aria-label="Shopademia home">Shopademia</a>
          </div>

          <form class="primary-search" action="./products.html" method="get" aria-label="Search products">
            <label class="sr-only" for="header-search">Search products</label>
            <input id="header-search" type="search" name="q" placeholder="Search products" />
          </form>

          <nav class="site-nav" aria-label="Main navigation">
            <a href="./index.html">Home</a>
            <a href="./products.html">Shop</a>
            <a href="./account.html">Account</a>
          </nav>

          <div class="site-actions">
            <a href="./login.html" class="header-link">Login</a>
            <a href="./cart.html" class="icon-button cart-pill" aria-label="Open cart">
              Cart
              <span class="cart-count">${cartCount}</span>
            </a>
          </div>
        </div>
      </header>
      <main class="page-shell"></main>
    </div>
  `;
}

export function mountLayout() {
  renderHeader();
  return document.querySelector('.page-shell');
}
