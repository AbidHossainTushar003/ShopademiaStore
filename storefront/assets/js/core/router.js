export function getCurrentPath() {
  return new URL(window.location.href).pathname;
}

export function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

export function navigateTo(path) {
  window.location.assign(path);
}
