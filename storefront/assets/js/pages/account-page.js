import { mountLayout } from '../views/header.js';
import { renderFooter } from '../views/footer.js';
import { renderEmptyState } from '../views/emptyState.js';
import { showToast } from '../views/toasts.js';
import AccountVM from '../viewmodels/AccountVM.js';
import CartService from '../services/CartService.js';
import { formatMoneyBDT } from '../core/format.js';

const main = mountLayout();
main.innerHTML = '<div id="account-shell"></div>';

const shell = document.getElementById('account-shell');
const vm = new AccountVM();

async function renderAccount() {
  const token = CartService.getAuthToken();
  if (!token) {
    shell.innerHTML = `
      <div class="signin-box">
        <h2>Sign in to view your account</h2>
        <p>Your profile and recent orders will appear after login.</p>
        <a class="primary-button" href="./login.html">Go to login</a>
      </div>
    `;
    return;
  }

  const state = await vm.load();
  if (!state.customer) {
    shell.replaceChildren(renderEmptyState('Account unavailable', 'Your customer profile could not be loaded right now.'));
    return;
  }

  const profile = state.customer;
  shell.innerHTML = `
    <section class="page-header">
      <h1>Welcome, ${profile.displayName || 'Shopper'}</h1>
      <p>${profile.email || 'customer@shopademia.test'}</p>
    </section>

    <div class="cart-layout">
      <section class="account-panel">
        <h2>Recent orders</h2>
        ${state.orders.length ? state.orders.map((order) => `
          <div class="order-row">
            <span>#${order.orderNumber || order.id}</span>
            <span>${order.status || 'pending'}</span>
            <strong>${formatMoneyBDT(order.totalMinor || 0)}</strong>
          </div>
        `).join('') : '<p>No orders yet.</p>'}
      </section>

      <aside class="summary-panel">
        <h3>Account</h3>
        <div class="summary-row"><span>Email</span><strong>${profile.email || 'N/A'}</strong></div>
        <div class="summary-row"><span>Member since</span><strong>${profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Recently'}</strong></div>
        <button class="ghost-button" type="button" id="logout-button">Sign out</button>
      </aside>
    </div>
  `;

  document.getElementById('logout-button').addEventListener('click', () => {
    CartService.clearAuthToken();
    showToast('Signed out.');
    window.location.href = './login.html';
  });
}

renderAccount();
renderFooter();
