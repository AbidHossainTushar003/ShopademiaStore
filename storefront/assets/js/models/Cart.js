export class CartItem {
  constructor(data = {}) {
    this.id = data.id ?? data.cart_item_id ?? null;
    this.productId = data.productId ?? data.product_id ?? null;
    this.productName = data.productName ?? data.product_name ?? 'Product';
    this.quantity = Number(data.quantity ?? 1);
    this.unitPriceMinor = Number(data.unitPriceMinor ?? data.unit_price_minor ?? 0);
    this.lineTotalMinor = Number(data.lineTotalMinor ?? data.line_total_minor ?? 0);
    this.currencyCode = data.currencyCode ?? data.currency_code ?? 'BDT';
    this.imageUrl = data.imageUrl ?? data.image_url ?? '';
  }
}

export class CartSummary {
  constructor(data = {}) {
    this.items = Array.isArray(data.items) ? data.items.map((item) => new CartItem(item)) : [];
    this.totalMinor = Number(data.totalMinor ?? data.total_minor ?? 0);
  }
}
