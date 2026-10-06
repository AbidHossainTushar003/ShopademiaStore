import { mountLayout } from '../views/header.js';
import { renderFooter } from '../views/footer.js';
import { renderEmptyState } from '../views/emptyState.js';
import { showToast } from '../views/toasts.js';
import CartVM from '../viewmodels/CartVM.js';
import { formatMoneyBDT } from '../core/format.js';

const main = mountLayout();
main.innerHTML = `
  <section class="page-header">
    <h1>Your cart</h1>
    <p>Review your items before checkout.</p>
  </section>
  <div id="cart-shell" class="cart-layout"></div>
`;

const vm = new CartVM();
const root = document.getElementById('cart-shell');

function renderCart() {
  const state = vm.load();
  if (!state.items.length) {
    root.innerHTML = `
      <div class="signin-box" style="grid-column:1/-1;">
        <h2>Your cart is empty</h2>
        <p>No products are in your cart right now.</p>
        <a class="primary-button" href="./products.html">Shop products</a>
      </div>
    `;
    return;
  }

  const subtotal = vm.subtotalMinor;
  root.innerHTML = `
    <div class="cart-panel">
      ${state.items.map((item) => `
        <div class="cart-item">
          <img src="${item.imageUrl || ''}" alt="${item.productName || 'Product'}" />
          <div>
            <h3>${item.productName || 'Product'}</h3>
            <p>${formatMoneyBDT(item.unitPriceMinor)} each</p>
            <div class="quantity-stepper">
              <button type="button" data-action="decrease" data-product-id="${item.productId}">−</button>
              <span>${item.quantity}</span>
              <button type="button" data-action="increase" data-product-id="${item.productId}">+</button>
            </div>
          </div>
          <div>
            <div class="inline-price">${formatMoneyBDT(item.unitPriceMinor * item.quantity)}</div>
            <button class="ghost-button" type="button" data-remove="${item.productId}">Remove</button>
          </div>
        </div>
      `).join('')}
    </div>

    <aside class="summary-panel">
      <h3>Order summary</h3>
      <div class="summary-row"><span>Subtotal</span><strong>${formatMoneyBDT(subtotal)}</strong></div>
      <div class="summary-row"><span>Shipping</span><strong>Calculated at checkout</strong></div>
      <div class="summary-row total"><span>Total</span><strong>${formatMoneyBDT(subtotal)}</strong></div>
      <a class="primary-button" href="./checkout.html">Proceed to checkout</a>
    </aside>
  `;

  root.querySelectorAll('[data-action="increase"]').forEach((button) => {
    button.addEventListener('click', () => {
      vm.updateQuantity(button.dataset.productId, Number(button.parentElement.querySelector('span').textContent) + 1);
      renderCart();
    });
  });

  root.querySelectorAll('[data-action="decrease"]').forEach((button) => {
    button.addEventListener('click', () => {
      const current = Number(button.parentElement.querySelector('span').textContent);
      if (current <= 1) return;
      vm.updateQuantity(button.dataset.productId, current - 1);
      renderCart();
    });
  });

  root.querySelectorAll('[data-remove]').forEach((button) => {
    button.addEventListener('click', () => {
      vm.removeItem(button.dataset.remove);
      showToast('Item removed.');
      renderCart();
    });
  });
}

renderCart();
renderFooter();
