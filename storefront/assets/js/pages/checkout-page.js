import { mountLayout } from '../views/header.js';
import { renderFooter } from '../views/footer.js';
import { renderEmptyState } from '../views/emptyState.js';
import { renderErrorState } from '../views/errorState.js';
import { showToast } from '../views/toasts.js';
import CheckoutVM from '../viewmodels/CheckoutVM.js';
import CartService from '../services/CartService.js';
import { formatMoneyBDT } from '../core/format.js';

const main = mountLayout();
main.innerHTML = '<div id="checkout-shell"></div>';

const vm = new CheckoutVM();
const shell = document.getElementById('checkout-shell');

function renderCheckout() {
  const token = CartService.getAuthToken();
  const items = CartService.getLocalCart();

  if (!token || !items.length) {
    shell.innerHTML = `
      <div class="signin-box">
        <h2>Checkout is ready when you are signed in</h2>
        <p>${!token ? 'Sign in to place an order with your customer account.' : 'Your cart is empty. Add some products first.'}</p>
        <div class="hero-actions">
          <a class="primary-button" href="./login.html">Sign in</a>
          <a class="ghost-button" href="./products.html">Browse products</a>
        </div>
      </div>
    `;
    return;
  }

  const subtotal = vm.load().items.reduce((total, item) => total + Number(item.unitPriceMinor || 0) * Number(item.quantity || 0), 0);
  shell.innerHTML = `
    <section class="page-header">
      <h1>Checkout</h1>
      <p>Complete your shipping details and place your order.</p>
    </section>

    <div class="checkout-layout">
      <form id="checkout-form" class="checkout-form checkout-panel">
        <div class="form-grid">
          <label class="field">
            <span>Full name</span>
            <input name="recipientName" required maxlength="120" />
          </label>
          <label class="field">
            <span>Phone</span>
            <input name="phone" required maxlength="24" placeholder="+8801..." />
          </label>
          <label class="field" style="grid-column:1/-1;">
            <span>Address line 1</span>
            <input name="addressLine1" required maxlength="180" />
          </label>
          <label class="field" style="grid-column:1/-1;">
            <span>Address line 2</span>
            <input name="addressLine2" maxlength="180" />
          </label>
          <label class="field">
            <span>City</span>
            <input name="city" required maxlength="100" />
          </label>
          <label class="field">
            <span>Region</span>
            <input name="region" required maxlength="100" />
          </label>
          <label class="field">
            <span>Postal code</span>
            <input name="postalCode" required maxlength="20" />
          </label>
          <label class="field">
            <span>Country</span>
            <select name="countryCode" required>
              <option value="BD">Bangladesh</option>
              <option value="US">United States</option>
            </select>
          </label>
        </div>

        <fieldset class="field">
          <legend>Payment method</legend>
          <label><input type="radio" name="paymentMethod" value="COD" checked /> Cash on delivery</label>
          <label><input type="radio" name="paymentMethod" value="bKash" /> bKash (manual verification)</label>
          <div id="bkash-box" class="hidden">
            <p>Send the amount to the shop account and enter the transaction ID for manual verification.</p>
            <label class="field">
              <span>Transaction ID</span>
              <input name="trxId" maxlength="64" placeholder="e.g. BK-123456" />
            </label>
          </div>
        </fieldset>

        <button type="submit" class="primary-button">Place order</button>
      </form>

      <aside class="summary-panel">
        <h3>Order summary</h3>
        ${items.map((item) => `
          <div class="order-row">
            <span>${item.productName} × ${item.quantity}</span>
            <strong>${formatMoneyBDT(Number(item.unitPriceMinor) * Number(item.quantity))}</strong>
          </div>
        `).join('')}
        <div class="summary-row total"><span>Total</span><strong>${formatMoneyBDT(subtotal)}</strong></div>
      </aside>
    </div>
  `;

  const form = document.getElementById('checkout-form');
  const paymentRadios = form.querySelectorAll('input[name="paymentMethod"]');
  const bkashBox = document.getElementById('bkash-box');

  paymentRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
      bkashBox.classList.toggle('hidden', radio.value !== 'bKash');
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const shipping = {
      recipientName: String(formData.get('recipientName') || '').trim(),
      phone: String(formData.get('phone') || '').trim(),
      addressLine1: String(formData.get('addressLine1') || '').trim(),
      addressLine2: String(formData.get('addressLine2') || '').trim(),
      city: String(formData.get('city') || '').trim(),
      region: String(formData.get('region') || '').trim(),
      postalCode: String(formData.get('postalCode') || '').trim(),
      countryCode: String(formData.get('countryCode') || 'BD'),
    };

    const paymentMethod = String(formData.get('paymentMethod') || 'COD');
    if (paymentMethod === 'bKash') {
      const trxId = String(formData.get('trxId') || '').trim();
      if (!trxId || trxId.length < 4) {
        showToast('Please enter a valid bKash transaction ID.');
        return;
      }
    }

    try {
      const result = await vm.submit(shipping, paymentMethod);
      CartService.clearCart();
      localStorage.setItem('shopademia-last-order', JSON.stringify(result));
      window.location.href = './order-success.html';
    } catch (error) {
      showToast(error?.message || 'Checkout could not be completed.');
    }
  });
}

renderCheckout();
renderFooter();
