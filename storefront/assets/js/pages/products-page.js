import { mountLayout } from '../views/header.js';
import { renderFooter } from '../views/footer.js';
import { renderProductCard } from '../views/productCard.js';
import { renderEmptyState } from '../views/emptyState.js';
import { renderErrorState } from '../views/errorState.js';
import { renderProductSkeletons } from '../views/skeletons.js';
import { showToast } from '../views/toasts.js';
import ProductListVM from '../viewmodels/ProductListVM.js';
import CartService from '../services/CartService.js';

const main = mountLayout();
main.innerHTML = `
  <section class="page-header">
    <h1>All products</h1>
    <p>Search the central catalog and find products by category, name, or price.</p>
  </section>

  <div class="collection-layout">
    <aside class="filter-panel">
      <h3>Filter</h3>
      <div class="filter-bar" style="display:grid; gap:1rem;">
        <label class="field">
          <span>Search</span>
          <input id="search-input" type="search" placeholder="Search products" />
        </label>
        <label class="field">
          <span>Category</span>
          <select id="category-filter">
            <option value="">All categories</option>
          </select>
        </label>
        <label class="field">
          <span>Sort</span>
          <select id="sort-filter">
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low to high</option>
            <option value="price_desc">Price: High to low</option>
            <option value="name_asc">Name: A–Z</option>
            <option value="name_desc">Name: Z–A</option>
          </select>
        </label>
      </div>
    </aside>

    <div>
      <div id="product-results" class="product-grid"></div>
    </div>
  </div>
`;

const vm = new ProductListVM();
const searchInput = document.getElementById('search-input');
const categoryFilter = document.getElementById('category-filter');
const sortFilter = document.getElementById('sort-filter');
const resultsRoot = document.getElementById('product-results');

function bindFilters() {
  searchInput.value = vm.q;
  sortFilter.value = vm.sort;
  categoryFilter.value = vm.category;

  searchInput.addEventListener('input', () => {
    vm.q = searchInput.value.trim();
    loadProducts();
  });
  categoryFilter.addEventListener('change', () => {
    vm.category = categoryFilter.value;
    loadProducts();
  });
  sortFilter.addEventListener('change', () => {
    vm.sort = sortFilter.value;
    loadProducts();
  });
}

async function loadProducts() {
  resultsRoot.replaceChildren(renderProductSkeletons(4));
  const state = await vm.load();

  if (state.error) {
    resultsRoot.replaceChildren(renderErrorState('Can\'t reach the server. Please try again later.'));
    return;
  }

  if (!state.items.length) {
    resultsRoot.replaceChildren(renderEmptyState('No products yet', 'No matching products are available right now.'));
    return;
  }

  resultsRoot.replaceChildren(...state.items.map((product) => renderProductCard(product, {
    onAdd: (item) => {
      CartService.addItem(item, 1);
      showToast(`${item.name} added to cart.`);
    },
  })));
}

bindFilters();
loadProducts();
renderFooter();
