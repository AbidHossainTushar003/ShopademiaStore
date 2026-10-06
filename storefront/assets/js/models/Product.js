export class Product {
  constructor(data = {}) {
    this.id = data.id ?? data.product_id ?? data.productId ?? null;
    this.category = data.category ?? {};
    this.categoryId = data.category?.id ?? data.category_id ?? null;
    this.name = data.name ?? 'Product';
    this.slug = data.slug ?? '';
    this.description = data.description ?? '';
    this.priceMinor = data.priceMinor ?? data.price_minor ?? 0;
    this.currencyCode = data.currencyCode ?? data.currency_code ?? 'BDT';
    this.availability = data.availability ?? 'in_stock';
    this.images = Array.isArray(data.images) ? data.images : [];
    this.stockStatus = this.availability;
  }
}
