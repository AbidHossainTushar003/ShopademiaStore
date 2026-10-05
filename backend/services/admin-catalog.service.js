const adminCatalogRepository = require('../repositories/admin-catalog.repository');
const auditLogsRepository = require('../repositories/audit-logs.repository');
const { removeProductImage, storeProductImage, validateUpload } = require('../storage/product-image-storage');

const UINT64_MAX = 18446744073709551615n;

function httpError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.publicCode = code;
  error.publicMessage = message;
  return error;
}

function publicAdminImage(image) {
  return {
    id: image.product_image_id,
    productId: image.product_id,
    url: image.image_url || image.imageUrl,
    altText: image.alt_text === undefined ? image.altText : image.alt_text,
    sortOrder: image.sort_order === undefined ? image.sortOrder : image.sort_order,
    status: image.status,
    deletedAt: image.deleted_at === undefined ? image.deletedAt : image.deleted_at,
  };
}

function summarizeProduct(product) {
  return {
    categoryId: String(product.category_id),
    sku: product.sku,
    name: product.name,
    slug: product.slug,
    priceMinor: String(product.price_minor),
    currencyCode: product.currency_code,
    status: product.status,
  };
}

function summarizeCategory(category) {
  return {
    parentCategoryId: category.parent_category_id === null
      ? null
      : String(category.parent_category_id),
    name: category.name,
    slug: category.slug,
    status: category.status,
    sortOrder: category.sort_order,
  };
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
      throw httpError(500, 'TRANSACTION_FAILED', 'The catalog change could not be completed.');
    }
    throw error;
  } finally {
    connection.release();
  }
}

async function writeAudit(connection, admin, requestId, {
  action,
  entityType,
  entityId,
  beforeSummary = null,
  afterSummary = null,
}) {
  await auditLogsRepository.createAuditLog(connection, {
    actorAdminUserId: admin.id,
    action,
    entityType,
    entityId: String(entityId),
    outcome: 'success',
    requestId,
    beforeSummary,
    afterSummary,
  });
}

function publicAdminProduct(product) {
  return {
    id: product.product_id,
    categoryId: product.category_id,
    sku: product.sku,
    name: product.name,
    slug: product.slug,
    description: product.description,
    priceMinor: product.price_minor,
    currencyCode: product.currency_code,
    status: product.status,
    deletedAt: product.deleted_at,
    images: product.images.map(publicAdminImage),
    inventory: product.inventory,
    createdAt: product.created_at,
    updatedAt: product.updated_at,
  };
}

function publicAdminCategory(category) {
  return {
    id: category.category_id,
    parentCategoryId: category.parent_category_id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    sortOrder: category.sort_order,
    status: category.status,
    deletedAt: category.deleted_at,
    createdAt: category.created_at,
    updatedAt: category.updated_at,
  };
}

async function requireCategory(connection, categoryId, productStatus) {
  const category = await adminCatalogRepository.getAdminCategoryForUpdate(connection, categoryId);

  if (!category || category.deleted_at) {
    throw httpError(422, 'INVALID_CATEGORY', 'The selected category is unavailable.');
  }

  if (productStatus === 'active' && category.status !== 'active') {
    throw httpError(422, 'INVALID_CATEGORY', 'An active product must use an active category.');
  }

  return category;
}

async function listProducts(pool, query) {
  const result = await adminCatalogRepository.listAdminProducts(pool, query);
  return {
    data: result.rows.map((row) => ({
      id: row.product_id,
      categoryId: row.category_id,
      sku: row.sku,
      name: row.name,
      slug: row.slug,
      description: row.description,
      priceMinor: row.price_minor,
      currencyCode: row.currency_code,
      status: row.status,
      deletedAt: row.deleted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / query.limit),
    },
  };
}

async function getProduct(pool, productId) {
  const product = await adminCatalogRepository.getAdminProduct(pool, productId);
  return product ? publicAdminProduct(product) : null;
}

async function createProduct(pool, admin, requestId, input) {
  return withTransaction(pool, async (connection) => {
    await requireCategory(connection, input.categoryId, input.status);
    const productId = await adminCatalogRepository.insertProduct(connection, input);
    await adminCatalogRepository.createInventory(connection, productId, {
      quantityOnHand: '0',
      quantityReserved: '0',
    });
    const product = await adminCatalogRepository.getAdminProduct(connection, productId);

    await writeAudit(connection, admin, requestId, {
      action: 'product.created',
      entityType: 'product',
      entityId: productId,
      afterSummary: summarizeProduct(product),
    });

    return publicAdminProduct(product);
  });
}

async function updateProduct(pool, admin, requestId, productId, input) {
  return withTransaction(pool, async (connection) => {
    const before = await adminCatalogRepository.getAdminProduct(connection, productId);
    if (!before || before.deleted_at) {
      return null;
    }
    await requireCategory(connection, input.categoryId, before.status);
    await adminCatalogRepository.updateProduct(connection, productId, input);
    const after = await adminCatalogRepository.getAdminProduct(connection, productId);
    await writeAudit(connection, admin, requestId, {
      action: 'product.updated',
      entityType: 'product',
      entityId: productId,
      beforeSummary: summarizeProduct(before),
      afterSummary: summarizeProduct(after),
    });
    return publicAdminProduct(after);
  });
}

async function updateProductStatus(pool, admin, requestId, productId, status) {
  return withTransaction(pool, async (connection) => {
    const before = await adminCatalogRepository.getAdminProduct(connection, productId);
    if (!before || before.deleted_at) {
      return null;
    }
    await requireCategory(connection, before.category_id, status);
    const updated = await adminCatalogRepository.updateProductStatus(connection, productId, status);
    if (!updated) {
      return null;
    }
    const after = await adminCatalogRepository.getAdminProduct(connection, productId);
    await writeAudit(connection, admin, requestId, {
      action: status === 'active' ? 'product.activated' : 'product.status_changed',
      entityType: 'product',
      entityId: productId,
      beforeSummary: summarizeProduct(before),
      afterSummary: summarizeProduct(after),
    });
    return publicAdminProduct(after);
  });
}

async function listCategories(pool, query) {
  const result = await adminCatalogRepository.listAdminCategories(pool, query);
  return {
    data: result.rows.map(publicAdminCategory),
    pagination: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / query.limit),
    },
  };
}

async function getCategory(pool, categoryId) {
  const category = await adminCatalogRepository.getAdminCategory(pool, categoryId);
  return category ? publicAdminCategory(category) : null;
}

async function createCategory(pool, admin, requestId, input) {
  return withTransaction(pool, async (connection) => {
    if (input.parentCategoryId !== null) {
      const parent = await adminCatalogRepository.getAdminCategoryForUpdate(connection, input.parentCategoryId);
      if (!parent || parent.deleted_at || parent.status !== 'active') {
        throw httpError(422, 'INVALID_PARENT_CATEGORY', 'The parent category is unavailable.');
      }
    }
    const categoryId = await adminCatalogRepository.insertCategory(connection, input);
    const category = await adminCatalogRepository.getAdminCategory(connection, categoryId);
    await writeAudit(connection, admin, requestId, {
      action: 'category.created',
      entityType: 'category',
      entityId: categoryId,
      afterSummary: summarizeCategory(category),
    });
    return publicAdminCategory(category);
  });
}

async function updateCategory(pool, admin, requestId, categoryId, input) {
  return withTransaction(pool, async (connection) => {
    const before = await adminCatalogRepository.getAdminCategoryForUpdate(connection, categoryId);
    if (!before || before.deleted_at) {
      return null;
    }
    if (input.parentCategoryId !== null) {
      if (String(input.parentCategoryId) === String(categoryId)) {
        throw httpError(422, 'INVALID_PARENT_CATEGORY', 'A category cannot be its own parent.');
      }
      const parent = await adminCatalogRepository.getAdminCategoryForUpdate(connection, input.parentCategoryId);
      if (!parent || parent.deleted_at || parent.status !== 'active') {
        throw httpError(422, 'INVALID_PARENT_CATEGORY', 'The parent category is unavailable.');
      }
      if (await adminCatalogRepository.isCategoryDescendant(connection, categoryId, input.parentCategoryId)) {
        throw httpError(422, 'INVALID_PARENT_CATEGORY', 'A category cannot be moved below one of its descendants.');
      }
    }
    await adminCatalogRepository.updateCategory(connection, categoryId, input);
    const after = await adminCatalogRepository.getAdminCategory(connection, categoryId);
    await writeAudit(connection, admin, requestId, {
      action: 'category.updated',
      entityType: 'category',
      entityId: categoryId,
      beforeSummary: summarizeCategory(before),
      afterSummary: summarizeCategory(after),
    });
    return publicAdminCategory(after);
  });
}

async function updateCategoryStatus(pool, admin, requestId, categoryId, status) {
  return withTransaction(pool, async (connection) => {
    const before = await adminCatalogRepository.getAdminCategoryForUpdate(connection, categoryId);
    if (!before || before.deleted_at) {
      return null;
    }
    const updated = await adminCatalogRepository.updateCategoryStatus(connection, categoryId, status);
    if (!updated) {
      return null;
    }
    const after = await adminCatalogRepository.getAdminCategory(connection, categoryId);
    await writeAudit(connection, admin, requestId, {
      action: status === 'active' ? 'category.activated' : 'category.deactivated',
      entityType: 'category',
      entityId: categoryId,
      beforeSummary: summarizeCategory(before),
      afterSummary: summarizeCategory(after),
    });
    return publicAdminCategory(after);
  });
}

async function deleteCategory(pool, admin, requestId, categoryId) {
  return withTransaction(pool, async (connection) => {
    const before = await adminCatalogRepository.getAdminCategoryForUpdate(connection, categoryId);
    if (!before || before.deleted_at) {
      return null;
    }
    const references = await adminCatalogRepository.countCategoryReferences(connection, categoryId);
    if (references.products > 0 || references.children > 0) {
      throw httpError(
        409,
        'CATEGORY_IN_USE',
        'Category cannot be deleted while it has products or subcategories.',
      );
    }
    const deleted = await adminCatalogRepository.deactivateCategory(connection, categoryId);
    if (!deleted) {
      return null;
    }
    const after = await adminCatalogRepository.getAdminCategory(connection, categoryId);
    await writeAudit(connection, admin, requestId, {
      action: 'category.deleted',
      entityType: 'category',
      entityId: categoryId,
      beforeSummary: summarizeCategory(before),
      afterSummary: summarizeCategory(after),
    });
    return publicAdminCategory(after);
  });
}

async function changeInventory(pool, admin, requestId, productId, {
  quantityDelta,
  quantityOnHand,
}) {
  return withTransaction(pool, async (connection) => {
    const product = await adminCatalogRepository.getAdminProduct(connection, productId);
    if (!product || product.deleted_at) {
      return null;
    }

    let inventory = await adminCatalogRepository.getInventoryForUpdate(connection, productId);
    if (!inventory) {
      await adminCatalogRepository.insertEmptyInventory(connection, productId);
      inventory = await adminCatalogRepository.getInventoryForUpdate(connection, productId);
    }

    const current = BigInt(inventory.quantity_on_hand);
    const reserved = BigInt(inventory.quantity_reserved);
    const next = quantityOnHand === undefined
      ? current + BigInt(quantityDelta)
      : BigInt(quantityOnHand);
    if (next < reserved || next < 0n || next > UINT64_MAX) {
      throw httpError(
        422,
        'INVALID_STOCK_ADJUSTMENT',
        'Stock adjustment would create an invalid available quantity.',
      );
    }

    await adminCatalogRepository.updateInventoryQuantities(connection, productId, String(next));
    await writeAudit(connection, admin, requestId, {
      action: quantityOnHand === undefined ? 'inventory.adjusted' : 'inventory.set',
      entityType: 'product',
      entityId: productId,
      beforeSummary: {
        quantityOnHand: String(current),
        quantityReserved: String(reserved),
      },
      afterSummary: {
        quantityOnHand: String(next),
        quantityReserved: String(reserved),
      },
    });
    return { productId, quantityOnHand: String(next), quantityReserved: String(reserved) };
  });
}

async function uploadImages(pool, admin, requestId, productId, files) {
  const product = await adminCatalogRepository.getAdminProduct(pool, productId);
  if (!product || product.deleted_at) {
    return null;
  }

  files.forEach(validateUpload);
  const storedFiles = [];

  try {
    for (const file of files) {
      storedFiles.push(await storeProductImage(file));
    }

    const images = await withTransaction(pool, async (connection) => {
      const existing = await adminCatalogRepository.getProductImageCount(connection, productId);
      if (existing + storedFiles.length > 20) {
        throw httpError(422, 'IMAGE_LIMIT_EXCEEDED', 'A product may have at most 20 active images.');
      }
      const inserted = [];
      for (let index = 0; index < storedFiles.length; index += 1) {
        const imageId = await adminCatalogRepository.insertProductImage(
          connection,
          productId,
          {
            imageUrl: storedFiles[index].imageUrl,
            altText: null,
            sortOrder: existing + index,
          },
        );
        inserted.push(imageId);
      }
      const after = await adminCatalogRepository.listProductImages(connection, productId);
      await writeAudit(connection, admin, requestId, {
        action: 'product.images_uploaded',
        entityType: 'product',
        entityId: productId,
        beforeSummary: { activeImageCount: existing },
        afterSummary: {
          activeImageCount: after.length,
          imageIds: inserted.map(String),
        },
      });
      return after;
    });

    return images.map(publicAdminImage);
  } catch (error) {
    await Promise.all(storedFiles.map((file) => file.remove()));
    throw error;
  }
}

async function updateImage(pool, admin, requestId, productId, imageId, input) {
  return withTransaction(pool, async (connection) => {
    const before = await adminCatalogRepository.getProductImageForUpdate(
      connection,
      productId,
      imageId,
    );
    if (!before) {
      return null;
    }

    const nextOrder = input.isPrimary ? 0 : input.sortOrder;
    if (input.isPrimary) {
      await adminCatalogRepository.shiftProductImages(connection, productId);
    }
    await adminCatalogRepository.updateProductImage(connection, productId, imageId, {
      altText: input.altText === undefined ? before.alt_text : input.altText,
      sortOrder: nextOrder === undefined ? before.sort_order : nextOrder,
    });
    const after = await adminCatalogRepository.getProductImage(connection, productId, imageId);
    await writeAudit(connection, admin, requestId, {
      action: 'product.image_updated',
      entityType: 'product_image',
      entityId: imageId,
      beforeSummary: { altText: before.alt_text, sortOrder: before.sort_order },
      afterSummary: { altText: after.alt_text, sortOrder: after.sort_order },
    });
    return publicAdminImage(after);
  });
}

async function removeImage(pool, admin, requestId, productId, imageId) {
  const result = await withTransaction(pool, async (connection) => {
    const before = await adminCatalogRepository.getProductImageForUpdate(
      connection,
      productId,
      imageId,
    );
    if (!before) {
      return null;
    }
    const removed = await adminCatalogRepository.deactivateProductImage(
      connection,
      productId,
      imageId,
    );
    if (!removed) {
      return null;
    }
    await writeAudit(connection, admin, requestId, {
      action: 'product.image_removed',
      entityType: 'product_image',
      entityId: imageId,
      beforeSummary: { imageUrl: before.image_url, sortOrder: before.sort_order },
      afterSummary: { status: 'inactive' },
    });
    return before.image_url;
  });

  if (result === null) {
    return false;
  }
  await removeProductImage(result);
  return true;
}

module.exports = {
  changeInventory,
  createCategory,
  createProduct,
  deleteCategory,
  getCategory,
  getProduct,
  listCategories,
  listProducts,
  removeImage,
  updateCategory,
  updateCategoryStatus,
  updateImage,
  updateProduct,
  updateProductStatus,
  uploadImages,
};
