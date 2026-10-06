import { mountLayout } from '../views/header.js';
import { renderFooter } from '../views/footer.js';
import { showToast } from '../views/toasts.js';
import AuthVM from '../viewmodels/AuthVM.js';

const main = mountLayout();
main.innerHTML = `
  <section class="page-header">
    <h1>Welcome back</h1>
    <p>Sign in to manage your account and orders.</p>
  </section>

  <div class="auth-layout">
    <section class="auth-card">
      <h2>Sign in</h2>
      <form id="login-form" class="login-form">
        <label class="field">
          <span>Email</span>
          <input name="email" type="email" required />
        </label>
        <label class="field">
          <span>Password</span>
          <input name="password" type="password" required />
        </label>
        <button class="primary-button" type="submit">Sign in</button>
      </form>
    </section>

    <section class="auth-card">
      <h2>Create account</h2>
      <form id="register-form" class="register-form">
        <label class="field">
          <span>Display name</span>
          <input name="displayName" required maxlength="120" />
        </label>
        <label class="field">
          <span>Email</span>
          <input name="email" type="email" required />
        </label>
        <label class="field">
          <span>Password</span>
          <input name="password" type="password" required />
        </label>
        <button class="secondary-button" type="submit">Create account</button>
      </form>
    </section>
  </div>
`;

const vm = new AuthVM();

const loginForm = document.getElementById('login-form');
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  try {
    await vm.login({
      email: String(formData.get('email') || '').trim(),
      password: String(formData.get('password') || '').trim(),
    });
    showToast('Signed in successfully.');
    window.location.href = './account.html';
  } catch (error) {
    showToast(error?.message || 'Login failed.');
  }
});

const registerForm = document.getElementById('register-form');
registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(registerForm);
  try {
    await vm.register({
      email: String(formData.get('email') || '').trim(),
      displayName: String(formData.get('displayName') || '').trim(),
      password: String(formData.get('password') || '').trim(),
    });
    showToast('Account created. Please sign in.');
    registerForm.reset();
  } catch (error) {
    showToast(error?.message || 'Account creation failed.');
  }
});

renderFooter();
