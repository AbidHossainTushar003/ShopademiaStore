const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..', '..');
const routesDirectory = path.join(repositoryRoot, 'backend', 'routes', 'v1');
const mountPrefixes = {
  'admin-auth.routes.js': '/api/v1/admin/auth',
  'admin-catalog.routes.js': '/api/v1/admin',
  'admin-orders.routes.js': '/api/v1/admin',
  'admin-stores.routes.js': '/api/v1/admin',
  'cart.routes.js': '/api/v1/cart',
  'catalog.routes.js': '/api/v1',
  'customer-auth.routes.js': '/api/v1/auth',
  'customers.routes.js': '/api/v1/customers',
  'health.routes.js': '/api/v1',
  'orders.routes.js': '/api/v1',
  'readiness.routes.js': '/api/v1',
};

function sourceOperations() {
  const operations = new Set();
  for (const filename of fs.readdirSync(routesDirectory).filter((name) => name.endsWith('.routes.js'))) {
    const prefix = mountPrefixes[filename];
    assert.ok(prefix, `Add an API mount prefix for ${filename}`);
    const source = fs.readFileSync(path.join(routesDirectory, filename), 'utf8');
    const routePattern = /\brouter\.(get|post|put|patch|delete)\s*\(\s*(['"`])([^'"`]+)\2/g;
    for (const match of source.matchAll(routePattern)) {
      const routePath = match[3] === '/' ? '' : match[3];
      const fullPath = `${prefix}${routePath}`.replace(/\/+$/, '') || '/';
      operations.add(`${match[1]} ${fullPath.replace(/:([A-Za-z0-9_]+)/g, '{$1}')}`);
    }
  }
  operations.add('get /media/products/{filename}');
  operations.add('head /media/products/{filename}');
  return operations;
}

function openApiOperations() {
  const document = fs.readFileSync(
    path.join(repositoryRoot, 'docs', 'openapi.yaml'),
    'utf8',
  );
  const operations = new Set();
  let currentPath = null;
  for (const line of document.split(/\r?\n/)) {
    const pathMatch = line.match(/^  (\/[^:]+):\s*$/);
    if (pathMatch) {
      currentPath = pathMatch[1];
      continue;
    }
    const methodMatch = line.match(/^    (get|head|post|put|patch|delete|options):\s*$/);
    if (methodMatch && currentPath) {
      operations.add(`${methodMatch[1]} ${currentPath}`);
    }
  }
  return operations;
}

test('OpenAPI includes every declared API and static media operation', () => {
  assert.deepEqual(
    [...openApiOperations()].sort(),
    [...sourceOperations()].sort(),
  );
});
