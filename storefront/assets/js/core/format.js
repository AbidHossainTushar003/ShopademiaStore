export function formatMoneyBDT(minorValue) {
  const value = Number(minorValue ?? 0);
  const major = value / 100;

  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(major);
}

export function formatInventoryLabel(status) {
  if (!status) return 'In stock';
  const normalized = String(status).toLowerCase();
  if (normalized === 'low_stock') return 'Low stock';
  if (normalized === 'out_of_stock') return 'Out of stock';
  return 'In stock';
}

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'product';
}

export function debounce(callback, waitMs = 250) {
  let timerId = null;
  return (...args) => {
    window.clearTimeout(timerId);
    timerId = window.setTimeout(() => callback(...args), waitMs);
  };
}
