const { randomBytes } = require('node:crypto');
const ordersRepository = require('../repositories/orders.repository');
const auditLogsRepository = require('../repositories/audit-logs.repository');

const orderTransitions = new Map([
  ['pending', new Set(['confirmed', 'cancelled'])],
  ['confirmed', new Set(['processing', 'cancelled'])],
  ['processing', new Set(['shipped', 'cancelled'])],
  ['shipped', new Set(['delivered'])],
  ['delivered', new Set()],
  ['cancelled', new Set()],
]);
const paymentTransitions = new Map([
  ['pending', new Set(['paid', 'failed'])],
  ['failed', new Set(['pending'])],
  ['paid', new Set()],
]);
const maximumDatabaseMoney = 18446744073709551615n;

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
      throw httpError(500, 'TRANSACTION_FAILED', 'The order change could not be completed.');
    }
    throw error;
  } finally {
    connection.release();
  }
}

function orderSummary(order) {
  return {
    id: order.order_id,
    orderNumber: order.order_number,
    customerId: order.customer_id,
    currencyCode: order.currency_code,
    totalMinor: String(order.total_minor),
    orderStatus: order.order_status,
    paymentStatus: order.payment_status,
  };
}

function publicOrder(order, { includeItems = true, includeShipping = true } = {}) {
  const result = {
    id: order.order_id,
    orderNumber: order.order_number,
    currencyCode: order.currency_code,
    subtotalMinor: String(order.subtotal_minor),
    totalMinor: String(order.total_minor),
    orderStatus: order.order_status,
    paymentStatus: order.payment_status,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  };
  if (includeShipping) {
    result.customer = {
      email: order.customer_email_snapshot,
      displayName: order.customer_name_snapshot,
    };
  }
  if (includeShipping) {
    result.shipping = order.shipping_snapshot;
  }
  if (includeItems) {
    result.items = order.items.map((item) => ({
      id: item.order_item_id,
      productId: item.product_id,
      productName: item.product_name_snapshot,
      sku: item.sku_snapshot,
      quantity: item.quantity,
      unitPriceMinor: String(item.unit_price_minor),
      lineTotalMinor: String(item.line_total_minor),
      currencyCode: item.currency_code,
    }));
  }
  return result;
}

async function checkout(pool, customerId, storeId, idempotencyKey, shippingSnapshot) {
  return withTransaction(pool, async (connection) => {
    const cart = await ordersRepository.getCustomerCartForUpdate(
      connection,
      customerId,
      storeId,
    );
    if (!cart) {
      throw httpError(409, 'CART_EMPTY', 'The cart has no items to check out.');
    }

    const existingOrderId = await ordersRepository.getOrderIdByIdempotencyKey(
      connection,
      customerId,
      storeId,
      idempotencyKey,
    );
    if (existingOrderId) {
      const existing = await ordersRepository.getOrderById(
        connection,
        existingOrderId,
        customerId,
        storeId,
      );
      return { order: publicOrder(existing), created: false };
    }

    const customer = await ordersRepository.getCustomerSnapshotForUpdate(
      connection,
      customerId,
    );
    if (!customer) {
      throw httpError(409, 'CUSTOMER_UNAVAILABLE', 'The customer account is not currently available.');
    }

    const cartItems = await ordersRepository.listCheckoutCartItemsForUpdate(
      connection,
      cart.cart_id,
    );
    if (cartItems.length === 0) {
      throw httpError(409, 'CART_EMPTY', 'The cart has no items to check out.');
    }

    let currencyCode;
    let totalMinor = 0n;
    const checkedItems = [];
    for (const cartItem of cartItems) {
      const product = await ordersRepository.getCheckoutProductForUpdate(
        connection,
        cartItem.product_id,
        storeId,
      );
      if (
        !product ||
        product.product_status !== 'active' ||
        product.product_deleted_at !== null ||
        product.category_status !== 'active' ||
        product.category_deleted_at !== null
      ) {
        throw httpError(409, 'PRODUCT_UNAVAILABLE', 'A cart product is no longer available.');
      }
      const available = BigInt(product.quantity_on_hand) - BigInt(product.quantity_reserved);
      if (available < BigInt(cartItem.quantity)) {
        throw httpError(409, 'INSUFFICIENT_STOCK', 'A cart product no longer has enough stock.');
      }
      if (currencyCode !== undefined && currencyCode !== product.currency_code) {
        throw httpError(409, 'MIXED_CURRENCY_CART', 'All cart products must use the same currency.');
      }
      currencyCode = product.currency_code;
      totalMinor += BigInt(product.price_minor) * BigInt(cartItem.quantity);
      if (totalMinor > maximumDatabaseMoney) {
        throw httpError(422, 'ORDER_TOTAL_TOO_LARGE', 'The order total is outside the supported range.');
      }
      checkedItems.push({ ...product, quantity: cartItem.quantity });
    }

    const total = totalMinor.toString();
    const orderId = await ordersRepository.createOrder(connection, {
      customerId,
      storeId,
      customerEmail: customer.email,
      customerName: customer.display_name,
      orderNumber: `SH-${randomBytes(16).toString('hex')}`,
      idempotencyKey,
      currencyCode,
      subtotalMinor: total,
      shippingSnapshot,
    });

    for (const item of checkedItems) {
      await ordersRepository.createOrderItem(connection, orderId, item);
      const decremented = await ordersRepository.decrementInventory(
        connection,
        item.product_id,
        item.quantity,
      );
      if (!decremented) {
        throw httpError(409, 'INSUFFICIENT_STOCK', 'A cart product no longer has enough stock.');
      }
    }

    await ordersRepository.createPayment(connection, orderId, total, currencyCode);
    await ordersRepository.clearCartItems(connection, cart.cart_id);
    const order = await ordersRepository.getOrderById(
      connection,
      orderId,
      customerId,
      storeId,
    );
    return { order: publicOrder(order), created: true };
  });
}

async function listCustomerOrders(pool, customerId, storeId, query) {
  return withTransaction(pool, async (connection) => {
    const result = await ordersRepository.listCustomerOrders(connection, customerId, storeId, {
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
    });
    return {
      data: result.rows.map((order) => publicOrder(order, {
        includeItems: false,
        includeShipping: false,
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / query.limit),
      },
    };
  });
}

async function getCustomerOrder(pool, customerId, storeId, orderId) {
  return withTransaction(pool, async (connection) => {
    const order = await ordersRepository.getOrderById(
      connection,
      orderId,
      customerId,
      storeId,
    );
    return order ? publicOrder(order) : null;
  });
}

async function listAdminOrders(pool, storeId, query) {
  return withTransaction(pool, async (connection) => {
    const result = await ordersRepository.listAdminOrders(connection, storeId, {
      ...query,
      offset: (query.page - 1) * query.limit,
    });
    return {
      data: result.rows.map((order) => publicOrder(order, {
        includeItems: false,
        includeShipping: false,
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / query.limit),
      },
    };
  });
}

async function getAdminOrder(pool, storeId, orderId) {
  return withTransaction(pool, async (connection) => {
    const order = await ordersRepository.getOrderById(connection, orderId, null, storeId);
    return order ? publicOrder(order) : null;
  });
}

async function updateAdminOrderStatus(pool, admin, requestId, storeId, orderId, nextStatus) {
  return withTransaction(pool, async (connection) => {
    const before = await ordersRepository.getOrderForUpdate(connection, orderId, storeId);
    if (!before) {
      return null;
    }
    if (!orderTransitions.get(before.order_status)?.has(nextStatus)) {
      throw httpError(409, 'INVALID_ORDER_TRANSITION', 'The order status transition is not allowed.');
    }
    if (nextStatus === 'cancelled') {
      if (before.payment_status === 'paid') {
        throw httpError(409, 'PAID_ORDER_CANNOT_BE_CANCELLED', 'A paid order cannot be cancelled through this operation.');
      }
      const items = await ordersRepository.listOrderItems(connection, orderId, storeId);
      for (const item of items) {
        await ordersRepository.restoreInventory(connection, item.product_id, item.quantity);
      }
      await ordersRepository.updatePaymentStatus(connection, storeId, orderId, 'cancelled');
    }
    await ordersRepository.updateOrderStatus(connection, storeId, orderId, nextStatus);
    const after = await ordersRepository.getOrderForUpdate(connection, orderId, storeId);
    await auditOrderChange(connection, admin, requestId, 'order.status_changed', before, after);
    const order = await ordersRepository.getOrderById(connection, orderId, null, storeId);
    return publicOrder(order);
  });
}

async function updateAdminPaymentStatus(pool, admin, requestId, storeId, orderId, nextStatus) {
  return withTransaction(pool, async (connection) => {
    const before = await ordersRepository.getOrderForUpdate(connection, orderId, storeId);
    if (!before) {
      return null;
    }
    if (nextStatus === 'cancelled' || !paymentTransitions.get(before.payment_status)?.has(nextStatus)) {
      throw httpError(409, 'INVALID_PAYMENT_TRANSITION', 'The payment status transition is not allowed.');
    }
    if (before.order_status === 'cancelled') {
      throw httpError(409, 'CANCELLED_ORDER_PAYMENT', 'A cancelled order payment cannot be changed.');
    }
    await ordersRepository.updatePaymentStatus(connection, storeId, orderId, nextStatus);
    const after = await ordersRepository.getOrderForUpdate(connection, orderId, storeId);
    await auditOrderChange(connection, admin, requestId, 'order.payment_status_changed', before, after);
    const order = await ordersRepository.getOrderById(connection, orderId, null, storeId);
    return publicOrder(order);
  });
}

async function auditOrderChange(connection, admin, requestId, action, before, after) {
  await auditLogsRepository.createAuditLog(connection, {
    actorAdminUserId: admin.id,
    action,
    entityType: 'order',
    entityId: String(before.order_id),
    outcome: 'success',
    requestId,
    beforeSummary: orderSummary(before),
    afterSummary: orderSummary(after),
  });
}

module.exports = {
  checkout,
  getAdminOrder,
  getCustomerOrder,
  listAdminOrders,
  listCustomerOrders,
  updateAdminOrderStatus,
  updateAdminPaymentStatus,
};
