const ordersService = require('../services/orders.service');
const {
  validateIdempotencyKey,
  validateOrderId,
  validateOrderListQuery,
  validateNoOrderQuery,
  validateShippingBody,
} = require('../validators/order.validators');

function createOrdersController(pool) {
  return {
    async checkout(request, response) {
      validateNoOrderQuery(request.query);
      const idempotencyKey = validateIdempotencyKey(request.get('idempotency-key'));
      const shipping = validateShippingBody(request.body);
      const result = await ordersService.checkout(
        pool,
        request.customer.id,
        idempotencyKey,
        shipping,
      );
      return response
        .status(result.created ? 201 : 200)
        .json({ success: true, data: result.order });
    },

    async listMine(request, response) {
      const query = validateOrderListQuery(request.query);
      const result = await ordersService.listCustomerOrders(
        pool,
        request.customer.id,
        query,
      );
      return response.status(200).json({ success: true, ...result });
    },

    async getMine(request, response) {
      validateNoOrderQuery(request.query);
      const orderId = validateOrderId(request.params.orderId);
      const order = await ordersService.getCustomerOrder(
        pool,
        request.customer.id,
        orderId,
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

module.exports = createOrdersController;
