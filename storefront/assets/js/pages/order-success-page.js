import { mountLayout } from '../views/header.js';
import { renderFooter } from '../views/footer.js';
import { formatMoneyBDT } from '../core/format.js';

const main = mountLayout();
main.innerHTML = '<div id="success-shell"></div>';

const shell = document.getElementById('success-shell');
const order = JSON.parse(localStorage.getItem('shopademia-last-order') || '{}');

const totalMinor = order?.totalMinor ?? order?.data?.totalMinor ?? 0;
const orderNumber = order?.orderNumber ?? order?.data?.orderNumber ?? 'SHOP-NEW';

shell.innerHTML = `
  <div class="success-box">
    <span class="badge">Order placed</span>
    <h1>Thanks for your order.</h1>
    <p>Your order <strong>#${orderNumber}</strong> is being processed.</p>
    <p>Payment status is currently <strong>pending</strong> for manual review when the payment method requires verification.</p>
    <div class="summary-row total"><span>Total</span><strong>${formatMoneyBDT(totalMinor)}</strong></div>
    <div class="hero-actions">
      <a class="primary-button" href="./products.html">Continue shopping</a>
      <a class="ghost-button" href="./account.html">View orders</a>
    </div>
  </div>
`;

renderFooter();
