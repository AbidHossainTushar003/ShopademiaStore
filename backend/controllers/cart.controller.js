const cartService = require('../services/cart.service');
const {
  validateAddItemBody,
  validateCartQuery,
  validateItemId,
  validateUpdateItemBody,
} = require('../validators/cart.validators');

function createCartController(pool) {
  return {
    async getCart(request, response) {
      validateCartQuery(request.query);
      const cart = await cartService.getCart(pool, request.customer.id, request.store.store_id);
      return response.status(200).json({ success: true, data: cart });
    },

    async addItem(request, response) {
      validateCartQuery(request.query);
      const input = validateAddItemBody(request.body);
      const result = await cartService.addItem(
        pool,
        request.customer.id,
        request.store.store_id,
        input,
      );
      return response
        .status(result.created ? 201 : 200)
        .json({ success: true, data: result.cart });
    },

    async updateItem(request, response) {
      validateCartQuery(request.query);
      const itemId = validateItemId(request.params.itemId);
      const { quantity } = validateUpdateItemBody(request.body);
      const cart = await cartService.updateItem(
        pool,
        request.customer.id,
        request.store.store_id,
        itemId,
        quantity,
      );
      return cart
        ? response.status(200).json({ success: true, data: cart })
        : response.status(404).json({
          success: false,
          error: { code: 'CART_ITEM_NOT_FOUND', message: 'Cart item was not found.' },
        });
    },

    async removeItem(request, response) {
      validateCartQuery(request.query);
      const itemId = validateItemId(request.params.itemId);
      const removed = await cartService.removeItem(
        pool,
        request.customer.id,
        request.store.store_id,
        itemId,
      );
      return removed
        ? response.status(204).end()
        : response.status(404).json({
          success: false,
          error: { code: 'CART_ITEM_NOT_FOUND', message: 'Cart item was not found.' },
        });
    },

    async clearCart(request, response) {
      validateCartQuery(request.query);
      await cartService.clearCart(pool, request.customer.id, request.store.store_id);
      return response.status(204).end();
    },
  };
}

module.exports = createCartController;
