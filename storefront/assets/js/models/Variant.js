export class Variant {
  constructor(data = {}) {
    this.id = data.id ?? data.variant_id ?? 'default';
    this.name = data.name ?? 'Default';
    this.priceMinor = Number(data.priceMinor ?? data.price_minor ?? 0);
    this.stockStatus = data.stockStatus ?? data.availability ?? 'in_stock';
    this.sku = data.sku ?? '';
  }
}
