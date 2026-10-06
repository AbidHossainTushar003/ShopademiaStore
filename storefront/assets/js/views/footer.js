export function renderFooter() {
  const main = document.querySelector('.page-shell');
  if (!main) return;
  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.innerHTML = `
    <div class="container">
      <div>
        <h3>Shopademia</h3>
        <p>Secure, modern shopping from a shared API-powered catalog.</p>
      </div>
      <div>
        <h3>Support</h3>
        <ul class="muted-list">
          <li><a href="./products.html">Products</a></li>
          <li><a href="./cart.html">Cart</a></li>
          <li><a href="./login.html">Account</a></li>
        </ul>
      </div>
      <div>
        <h3>Policies</h3>
        <ul class="muted-list">
          <li>Secure checkout</li>
          <li>Cash on delivery</li>
          <li>bKash verification</li>
        </ul>
      </div>
    </div>
  `;
  document.querySelector('.app-shell').appendChild(footer);
}
