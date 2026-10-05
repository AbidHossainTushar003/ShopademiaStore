const { createHash, randomBytes } = require('node:crypto');
const auditLogsRepository = require('../repositories/audit-logs.repository');
const storesRepository = require('../repositories/stores.repository');

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
      throw httpError(500, 'TRANSACTION_FAILED', 'The store change could not be completed.');
    }
    throw error;
  } finally {
    connection.release();
  }
}

function publicStore(store) {
  if (!store) {
    return null;
  }
  const {
    credential_hash: _credentialHash,
    key_revoked_at: keyRevokedAt,
    ...safeStore
  } = store;
  return { ...safeStore, keyRevoked: keyRevokedAt !== null };
}

function createCredential() {
  return `sk_${randomBytes(32).toString('base64url')}`;
}

function credentialHash(credential) {
  return createHash('sha256').update(credential, 'utf8').digest('hex');
}

async function auditChange(connection, admin, requestId, action, entityType, entityId, before, after) {
  await auditLogsRepository.createAuditLog(connection, {
    actorAdminUserId: admin.id,
    action,
    entityType,
    entityId: String(entityId),
    outcome: 'success',
    requestId,
    beforeSummary: before,
    afterSummary: after,
  });
}

function storeSummary(store) {
  return store && {
    name: store.name,
    slug: store.slug,
    status: store.status,
    allowedOrigins: store.allowed_origins,
    hasActiveKey: store.has_active_key,
  };
}

async function listStores(pool) {
  return (await storesRepository.listStores(pool)).map(publicStore);
}

async function getStore(pool, storeId) {
  return publicStore(await storesRepository.getStoreById(pool, storeId));
}

async function listStoreAdmins(pool, storeId) {
  return storesRepository.listStoreAdmins(pool, storeId);
}

async function createStore(pool, admin, requestId, input) {
  const key = createCredential();
  return withTransaction(pool, async (connection) => {
    const store = await storesRepository.createStore(connection, {
      ...input,
      credentialHash: credentialHash(key),
    });
    await auditChange(
      connection,
      admin,
      requestId,
      'store.created',
      'store',
      store.store_id,
      null,
      storeSummary(store),
    );
    return { store: publicStore(store), storeKey: key };
  });
}

async function updateStore(pool, admin, requestId, storeId, input) {
  return withTransaction(pool, async (connection) => {
    const before = await storesRepository.getStoreById(connection, storeId, { forUpdate: true });
    if (!before) {
      return null;
    }
    const after = await storesRepository.updateStore(connection, storeId, {
      name: input.name ?? before.name,
      slug: input.slug ?? before.slug,
      allowedOrigins: input.allowedOrigins ?? before.allowed_origins,
    });
    await auditChange(
      connection,
      admin,
      requestId,
      'store.updated',
      'store',
      storeId,
      storeSummary(before),
      storeSummary(after),
    );
    return publicStore(after);
  });
}

async function updateStoreStatus(pool, admin, requestId, storeId, status) {
  return withTransaction(pool, async (connection) => {
    const before = await storesRepository.getStoreById(connection, storeId, { forUpdate: true });
    if (!before) {
      return null;
    }
    const after = await storesRepository.updateStoreStatus(connection, storeId, status);
    await auditChange(
      connection,
      admin,
      requestId,
      'store.status_changed',
      'store',
      storeId,
      storeSummary(before),
      storeSummary(after),
    );
    return publicStore(after);
  });
}

async function rotateStoreKey(pool, admin, requestId, storeId) {
  const key = createCredential();
  const store = await withTransaction(pool, async (connection) => {
    const before = await storesRepository.getStoreById(connection, storeId, { forUpdate: true });
    if (!before) {
      return null;
    }
    await storesRepository.updateCredentialHash(connection, storeId, credentialHash(key));
    const after = await storesRepository.getStoreById(connection, storeId);
    await auditChange(
      connection,
      admin,
      requestId,
      'store.key_rotated',
      'store',
      storeId,
      { hasActiveKey: before.has_active_key },
      { hasActiveKey: after.has_active_key },
    );
    return publicStore(after);
  });
  return store ? { store, storeKey: key } : null;
}

async function revokeStoreKey(pool, admin, requestId, storeId) {
  return withTransaction(pool, async (connection) => {
    const before = await storesRepository.getStoreById(connection, storeId, { forUpdate: true });
    if (!before) {
      return null;
    }
    await storesRepository.revokeCredential(connection, storeId);
    const after = await storesRepository.getStoreById(connection, storeId);
    await auditChange(
      connection,
      admin,
      requestId,
      'store.key_revoked',
      'store',
      storeId,
      { hasActiveKey: before.has_active_key },
      { hasActiveKey: after.has_active_key },
    );
    return publicStore(after);
  });
}

async function assignStoreAdmin(pool, admin, requestId, storeId, adminUserId) {
  return withTransaction(pool, async (connection) => {
    const store = await storesRepository.getStoreById(connection, storeId, { forUpdate: true });
    if (!store) {
      return null;
    }
    if (!(await storesRepository.getAssignableAdmin(connection, adminUserId))) {
      throw httpError(404, 'ADMIN_NOT_FOUND', 'An active store administrator was not found.');
    }
    await storesRepository.addStoreAdmin(connection, storeId, adminUserId);
    await auditChange(
      connection,
      admin,
      requestId,
      'store.admin_assigned',
      'store_admin',
      `${storeId}:${adminUserId}`,
      null,
      { storeId, adminUserId },
    );
    return { storeId, adminUserId };
  });
}

async function removeStoreAdmin(pool, admin, requestId, storeId, adminUserId) {
  return withTransaction(pool, async (connection) => {
    const store = await storesRepository.getStoreById(connection, storeId, { forUpdate: true });
    if (!store) {
      return null;
    }
    const removed = await storesRepository.removeStoreAdmin(connection, storeId, adminUserId);
    if (removed) {
      await auditChange(
        connection,
        admin,
        requestId,
        'store.admin_unassigned',
        'store_admin',
        `${storeId}:${adminUserId}`,
        { storeId, adminUserId },
        null,
      );
    }
    return removed;
  });
}

async function updateProductVisibility(pool, admin, requestId, storeId, productId, visibility) {
  return withTransaction(pool, async (connection) => {
    const store = await storesRepository.getStoreById(connection, storeId, { forUpdate: true });
    if (!store || !(await storesRepository.productExists(connection, productId))) {
      return null;
    }
    const before = await storesRepository.getVisibility(connection, storeId, productId);
    await storesRepository.setVisibility(connection, storeId, productId, visibility);
    await auditChange(
      connection,
      admin,
      requestId,
      'store.product_visibility_changed',
      'store_product',
      `${storeId}:${productId}`,
      { visibility: before },
      { visibility },
    );
    return { storeId, productId, visibility };
  });
}

module.exports = {
  assignStoreAdmin,
  createStore,
  getStore,
  listStores,
  listStoreAdmins,
  removeStoreAdmin,
  revokeStoreKey,
  rotateStoreKey,
  updateProductVisibility,
  updateStore,
  updateStoreStatus,
};
