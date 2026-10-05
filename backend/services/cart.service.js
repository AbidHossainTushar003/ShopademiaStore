const cartRepository = require('../repositories/cart.repository');
const {
  maximumItemsPerCart,
  maximumQuantity,
} = require('../validators/cart.validators');

function httpError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.publicCode = code;
  error.publicMessage = message;
  return error;
}

async function withTransaction(pool, callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      throw httpError(500, 'TRANSACTION_FAILED', 'The cart change could not be completed.');
    }
    throw error;
  } finally {
    connection.release();
  }
}

function availabilityFor(item) {
  if (
    item.product_deleted_at !== null ||
    item.product_status !== 'active' ||
    item.category_deleted_at !== null ||
    item.category_status !== 'active'
  ) {
    return 'unavailable';
  }

  const availableQuantity = BigInt(item.quantity_on_hand) - BigInt(item.quantity_reserved);
  if (availableQuantity <= 0n) {
    return 'out_of_stock';
  }
  if (BigInt(item.quantity) > availableQuantity) {
    return 'insufficient_stock';
  }
  return 'available';
}

function publicCartItem(item) {
  const currentPrice = item.current_price_minor === null
    ? null
    : BigInt(item.current_price_minor);
  const currencyCode = item.current_currency_code;
  const availability = availabilityFor(item);

  return {
    id: item.cart_item_id,
    productId: item.product_id,
    productName: item.product_name,
    productSlug: item.product_slug,
    quantity: item.quantity,
    unitPriceMinor: currentPrice === null ? null : currentPrice.toString(),
    currencyCode,
    lineTotalMinor: currentPrice === null
      ? null
      : (currentPrice * BigInt(item.quantity)).toString(),
    priceChanged: currentPrice === null ||
      currentPrice.toString() !== String(item.added_price_minor) ||
      currencyCode !== item.added_currency_code,
    availability,
  };
}

function buildCart(rows) {
  const items = rows.map(publicCartItem);
  const totals = new Map();

  for (const item of items) {
    if (item.lineTotalMinor === null) {
      continue;
    }
    const current = totals.get(item.currencyCode) || 0n;
    totals.set(item.currencyCode, current + BigInt(item.lineTotalMinor));
  }

  return {
    items,
    totals: Array.from(totals, ([currencyCode, subtotal]) => ({
      currencyCode,
      subtotalMinor: subtotal.toString(),
    })),
  };
}

async function readCart(connection, customerId) {
  const cart = await cartRepository.getOrCreateCart(connection, customerId);
  const items = await cartRepository.listCartItems(connection, cart.cart_id);
  return buildCart(items);
}

function availableQuantity(product) {
  if (
    product.product_status !== 'active' ||
    product.product_deleted_at !== null ||
    product.category_status !== 'active' ||
    product.category_deleted_at !== null
  ) {
    throw httpError(409, 'PRODUCT_UNAVAILABLE', 'This product is not currently available.');
  }

  return BigInt(product.quantity_on_hand) - BigInt(product.quantity_reserved);
}

async function getCart(pool, customerId) {
  return withTransaction(pool, (connection) => readCart(connection, customerId));
}

async function addItem(pool, customerId, { productId, quantity }) {
  return withTransaction(pool, async (connection) => {
    const cart = await cartRepository.getOrCreateCart(connection, customerId);
    await cartRepository.getCartForUpdate(connection, customerId);
    const product = await cartRepository.getPurchasableProductForUpdate(connection, productId);
    if (!product) {
      throw httpError(404, 'PRODUCT_NOT_FOUND', 'Product was not found.');
    }
    const available = availableQuantity(product);
    if (BigInt(quantity) > available) {
      throw httpError(409, 'INSUFFICIENT_STOCK', 'Requested quantity is not currently available.');
    }

    const rows = await cartRepository.listCartItems(connection, cart.cart_id);
    const currentLine = rows.find((row) => String(row.product_id) === String(productId));
    const nextQuantity = BigInt(currentLine?.quantity || 0) + BigInt(quantity);
    if (nextQuantity > BigInt(maximumQuantity)) {
      throw httpError(422, 'QUANTITY_LIMIT_EXCEEDED', `A product quantity cannot exceed ${maximumQuantity}.`);
    }
    if (!currentLine && rows.length >= maximumItemsPerCart) {
      throw httpError(422, 'CART_ITEM_LIMIT_EXCEEDED', `A cart cannot contain more than ${maximumItemsPerCart} products.`);
    }
    if (nextQuantity > available) {
      throw httpError(409, 'INSUFFICIENT_STOCK', 'Requested quantity is not currently available.');
    }

    await cartRepository.addCartItem(connection, cart.cart_id, product, quantity);
    return {
      cart: await readCart(connection, customerId),
      created: !currentLine,
    };
  });
}

async function updateItem(pool, customerId, itemId, quantity) {
  return withTransaction(pool, async (connection) => {
    const cart = await cartRepository.getCartForUpdate(connection, customerId);
    if (!cart) {
      return null;
    }
    const item = await cartRepository.getOwnedCartItemForUpdate(
      connection,
      customerId,
      itemId,
    );
    if (!item) {
      return null;
    }
    const product = await cartRepository.getPurchasableProductForUpdate(
      connection,
      item.product_id,
    );
    if (!product) {
      throw httpError(409, 'PRODUCT_UNAVAILABLE', 'This product is not currently available.');
    }
    if (BigInt(quantity) > availableQuantity(product)) {
      throw httpError(409, 'INSUFFICIENT_STOCK', 'Requested quantity is not currently available.');
    }
    await cartRepository.updateCartItemQuantity(connection, itemId, quantity);
    return readCart(connection, customerId);
  });
}

async function removeItem(pool, customerId, itemId) {
  return withTransaction(pool, async (connection) => {
    const cart = await cartRepository.getCartForUpdate(connection, customerId);
    if (!cart) {
      return false;
    }
    return cartRepository.removeOwnedCartItem(connection, customerId, itemId);
  });
}

async function clearCart(pool, customerId) {
  return withTransaction(pool, async (connection) => {
    const cart = await cartRepository.getCartForUpdate(connection, customerId);
    if (cart) {
      await cartRepository.clearCart(connection, customerId);
    }
  });
}

module.exports = { addItem, clearCart, getCart, removeItem, updateItem };
