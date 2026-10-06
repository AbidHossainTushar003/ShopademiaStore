export class Order {
  constructor(data = {}) {
    this.id = data.id ?? data.order_id ?? null;
    this.orderNumber = data.orderNumber ?? data.order_number ?? 'SHOP-000';
    this.status = data.status ?? data.orderStatus ?? 'pending';
    this.paymentStatus = data.paymentStatus ?? 'pending';
    this.totalMinor = Number(data.totalMinor ?? data.total_minor ?? 0);
    this.createdAt = data.createdAt ?? data.created_at ?? new Date().toISOString();
  }
}
