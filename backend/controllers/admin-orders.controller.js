const ordersService = require('../services/orders.service');
const {
  validateOrderId,
  validateOrderListQuery,
  validateNoOrderQuery,
  validateOrderStatusBody,
  validatePaymentStatusBody,
} = require('../validators/order.validators');

function createAdminOrdersController(pool) {
  return {
    async list(request, response) {
      const query = validateOrderListQuery(request.query, { admin: true });
      const result = await ordersService.listAdminOrders(pool, query);
      return response.status(200).json({ success: true, ...result });
    },

    async get(request, response) {
      validateNoOrderQuery(request.query);
      const orderId = validateOrderId(request.params.orderId);
      const order = await ordersService.getAdminOrder(pool, orderId);
      return order
        ? response.status(200).json({ success: true, data: order })
        : response.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Order was not found.' },
        });
    },

    async updateOrderStatus(request, response) {
      validateNoOrderQuery(request.query);
      const orderId = validateOrderId(request.params.orderId);
      const status = validateOrderStatusBody(request.body);
      const order = await ordersService.updateAdminOrderStatus(
        pool,
        request.admin,
        request.id,
        orderId,
        status,
      );
      return order
        ? response.status(200).json({ success: true, data: order })
        : response.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Order was not found.' },
        });
    },

    async updatePaymentStatus(request, response) {
      validateNoOrderQuery(request.query);
      const orderId = validateOrderId(request.params.orderId);
      const status = validatePaymentStatusBody(request.body);
      const order = await ordersService.updateAdminPaymentStatus(
        pool,
        request.admin,
        request.id,
        orderId,
        status,
      );
      return order
        ? response.status(200).json({ success: true, data: order })
        : response.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Order was not found.' },
        });
    },
  };
}

module.exports = createAdminOrdersController;
