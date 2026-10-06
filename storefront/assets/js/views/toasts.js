export function showToast(message, tone = 'info') {
  const stack = document.querySelector('.toast-stack') || Object.assign(document.createElement('div'), { className: 'toast-stack' });
  if (!stack.parentNode) document.body.appendChild(stack);
  const toast = document.createElement('div');
  toast.className = `toast toast-${tone}`;
  toast.textContent = message;
  stack.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2800);
}
