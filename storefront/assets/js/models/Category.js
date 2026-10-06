export class Category {
  constructor(data = {}) {
    this.id = data.id ?? data.category_id ?? null;
    this.name = data.name ?? 'Category';
    this.slug = data.slug ?? '';
    this.description = data.description ?? '';
    this.parentCategoryId = data.parentCategoryId ?? data.parent_category_id ?? null;
  }
}
