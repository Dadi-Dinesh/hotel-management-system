const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// Safe guard: only run if DATABASE_URL_TEST is explicitly provided.
const testDbUrl = process.env.DATABASE_URL_TEST;

if (!testDbUrl) {
  test('PostgreSQL integration suite skipped (DATABASE_URL_TEST not set)', () => {
    assert.ok(true, 'Skipping isolated database tests since DATABASE_URL_TEST is not provided.');
  });
} else {
  // Enforce isolation: ensure testDbUrl never points to production or Neon
  const parsed = new URL(testDbUrl);
  if (parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost') {
    throw new Error('DATABASE_URL_TEST must target an isolated local database (127.0.0.1 or localhost)');
  }
  if (!parsed.pathname.includes('test')) {
    throw new Error('DATABASE_URL_TEST database name must include "test" for safety');
  }

  // Set DATABASE_URL for prisma client
  process.env.DATABASE_URL = testDbUrl;

  // Mock socket before requiring controller
  const socketModulePath = path.resolve(__dirname, '../socket/index.js');
  require.cache[socketModulePath] = {
    id: socketModulePath,
    filename: socketModulePath,
    loaded: true,
    exports: {
      getIO: () => ({
        to: () => ({ emit: () => {} }),
      }),
    },
  };

  const prisma = require('../config/db');
  const { placeOrder } = require('../controllers/order.controller');

  // Test identifiers
  const REST1_ID = 'pg_test_rest_1';
  const REST2_ID = 'pg_test_rest_2';
  const TABLE1_ID = 'pg_test_table_1';
  const TABLE2_ID = 'pg_test_table_2';
  const SESSION1_ID = 'pg_test_sess_1';
  const SESSION2_ID = 'pg_test_sess_2';
  const CAT1_ID = 'pg_test_cat_1';
  const ITEM1_ID = 'pg_test_item_1';
  const ITEM2_ID = 'pg_test_item_2';
  const CAT2_ID = 'pg_test_cat_2';

  // Helper to submit via placeOrder controller
  async function submitOrder({
    key = 'test-idemp-key-12345678',
    sessionId = SESSION1_ID,
    items = [{ menuItemId: ITEM1_ID, quantity: 2 }],
  } = {}) {
    let statusCode = 200;
    let responseBody = null;
    let nextError = null;

    const req = {
      headers: key ? { 'idempotency-key': key } : {},
      body: { sessionId, items },
    };

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        responseBody = body;
        return this;
      },
    };

    try {
      await placeOrder(req, res, (err) => {
        nextError = err;
        statusCode = err.statusCode || err.status || 500;
        responseBody = { success: false, message: err.message };
      });
    } catch (err) {
      nextError = err;
      statusCode = err.statusCode || err.status || 500;
      responseBody = { success: false, message: err.message };
    }

    return { status: statusCode, body: responseBody, error: nextError };
  }

  before(async () => {
    // Verify database identity
    const [dbInfo] = await prisma.$queryRaw`SELECT current_database(), current_user`;
    assert.equal(dbInfo.current_database, 'servesync_test_db');
    assert.equal(dbInfo.current_user, 'servesync_test_user');

    // Clean up any remnants of test data
    await prisma.orderItem.deleteMany({ where: { order: { restaurantId: { in: [REST1_ID, REST2_ID] } } } });
    await prisma.order.deleteMany({ where: { restaurantId: { in: [REST1_ID, REST2_ID] } } });
    await prisma.session.deleteMany({ where: { restaurantId: { in: [REST1_ID, REST2_ID] } } });
    await prisma.menuItem.deleteMany({ where: { restaurantId: { in: [REST1_ID, REST2_ID] } } });
    await prisma.category.deleteMany({ where: { restaurantId: { in: [REST1_ID, REST2_ID] } } });
    await prisma.table.deleteMany({ where: { restaurantId: { in: [REST1_ID, REST2_ID] } } });
    await prisma.restaurant.deleteMany({ where: { id: { in: [REST1_ID, REST2_ID] } } });

    // Seed test fixtures
    await prisma.restaurant.create({
      data: {
        id: REST1_ID,
        name: 'PG Test Restaurant 1',
        slug: 'pg-test-rest-1',
        isActive: true,
        tables: {
          create: [{ id: TABLE1_ID, code: 'T01', number: 1, isActive: true }],
        },
        categories: {
          create: [{ id: CAT1_ID, name: 'Main Course' }],
        },
      },
    });

    await prisma.restaurant.create({
      data: {
        id: REST2_ID,
        name: 'PG Test Restaurant 2',
        slug: 'pg-test-rest-2',
        isActive: true,
        tables: {
          create: [{ id: TABLE2_ID, code: 'T02', number: 2, isActive: true }],
        },
        categories: {
          create: [{ id: CAT2_ID, name: 'Specials' }],
        },
      },
    });

    await prisma.menuItem.createMany({
      data: [
        { id: ITEM1_ID, restaurantId: REST1_ID, categoryId: CAT1_ID, name: 'Biryani', price: 250, isAvailable: true },
        { id: ITEM2_ID, restaurantId: REST1_ID, categoryId: CAT1_ID, name: 'Paneer Tikka', price: 180, isAvailable: true },
      ],
    });

    await prisma.session.create({
      data: {
        id: SESSION1_ID,
        restaurantId: REST1_ID,
        tableId: TABLE1_ID,
        status: 'ACTIVE',
      },
    });

    await prisma.session.create({
      data: {
        id: SESSION2_ID,
        restaurantId: REST2_ID,
        tableId: TABLE2_ID,
        status: 'ACTIVE',
      },
    });
  });

  after(async () => {
    // Deterministic cleanup
    await prisma.orderItem.deleteMany({ where: { order: { restaurantId: { in: [REST1_ID, REST2_ID] } } } });
    await prisma.order.deleteMany({ where: { restaurantId: { in: [REST1_ID, REST2_ID] } } });
    await prisma.session.deleteMany({ where: { restaurantId: { in: [REST1_ID, REST2_ID] } } });
    await prisma.menuItem.deleteMany({ where: { restaurantId: { in: [REST1_ID, REST2_ID] } } });
    await prisma.category.deleteMany({ where: { restaurantId: { in: [REST1_ID, REST2_ID] } } });
    await prisma.table.deleteMany({ where: { restaurantId: { in: [REST1_ID, REST2_ID] } } });
    await prisma.restaurant.deleteMany({ where: { id: { in: [REST1_ID, REST2_ID] } } });
    await prisma.$disconnect();
  });

  test('A. Concurrent identical submissions create exactly one order and one set of items', async () => {
    const key = 'concurrent-key-aaaa-1111';
    const items = [
      { menuItemId: ITEM1_ID, quantity: 2 },
      { menuItemId: ITEM2_ID, quantity: 1 },
    ];

    // Fire 12 genuinely concurrent submissions against PostgreSQL
    const results = await Promise.all(
      Array.from({ length: 12 }, () => submitOrder({ key, sessionId: SESSION1_ID, items }))
    );

    // Verify response statuses: exactly 1 Created (201) and 11 Replayed (200)
    const created = results.filter((r) => r.status === 201);
    const replayed = results.filter((r) => r.status === 200);

    assert.equal(created.length, 1, 'Exactly one concurrent request creates the order (201)');
    assert.equal(replayed.length, 11, 'All remaining 11 concurrent requests recover the order (200)');

    // Verify all responses returned the same order ID
    const orderIds = results.map((r) => r.body.data.id);
    const uniqueIds = new Set(orderIds);
    assert.equal(uniqueIds.size, 1, 'All concurrent responses resolve to the same order ID');

    // Verify direct PostgreSQL state
    const dbOrders = await prisma.order.findMany({
      where: { sessionId: SESSION1_ID, idempotencyKey: key },
      include: { items: true },
    });

    assert.equal(dbOrders.length, 1, 'PostgreSQL contains exactly one order record');
    assert.equal(dbOrders[0].items.length, 2, 'PostgreSQL order contains exactly 2 order item rows (no duplicates)');
    assert.equal(dbOrders[0].items.reduce((sum, i) => sum + i.quantity, 0), 3, 'Total items quantity is 3');
  });

  test('B. Same key with different payload returns HTTP 409 conflict and preserves original', async () => {
    const key = 'concurrent-key-aaaa-1111'; // Same key as scenario A
    const alteredPayload = [{ menuItemId: ITEM1_ID, quantity: 5 }]; // Different quantity

    const result = await submitOrder({ key, sessionId: SESSION1_ID, items: alteredPayload });

    assert.equal(result.status, 409, 'Reusing key with different payload returns 409');
    assert.match(result.body.message, /different order/, 'Error message clearly indicates payload mismatch');

    // Verify original order in PostgreSQL is unchanged
    const dbOrder = await prisma.order.findFirst({
      where: { sessionId: SESSION1_ID, idempotencyKey: key },
      include: { items: true },
    });
    assert.equal(dbOrder.items.reduce((sum, i) => sum + i.quantity, 0), 3, 'Original order quantity unchanged');
  });

  test('C. Different keys create distinct orders in PostgreSQL', async () => {
    const key2 = 'different-key-bbbb-2222';
    const items = [{ menuItemId: ITEM2_ID, quantity: 1 }];

    const result = await submitOrder({ key: key2, sessionId: SESSION1_ID, items });
    assert.equal(result.status, 201, 'New key successfully creates second order');

    const totalOrders = await prisma.order.count({ where: { sessionId: SESSION1_ID } });
    assert.equal(totalOrders, 2, 'Session 1 now has exactly 2 orders');
  });

  test('D. Independent sessions and tenants can use identical keys without collision', async () => {
    // Use the same key as Scenario C, but in Restaurant 2 / Session 2
    const key = 'different-key-bbbb-2222';
    // For Restaurant 2, need an available item belonging to Restaurant 2
    const r2Item = await prisma.menuItem.create({
      data: {
        restaurantId: REST2_ID,
        categoryId: CAT2_ID,
        name: 'R2 Special Curry',
        price: 200,
        isAvailable: true,
      },
    });

    const result = await submitOrder({
      key,
      sessionId: SESSION2_ID,
      items: [{ menuItemId: r2Item.id, quantity: 1 }],
    });

    assert.equal(result.status, 201, 'Order created in Session 2 despite using identical key to Session 1');

    // Verify isolation in PostgreSQL
    const s1Order = await prisma.order.findFirst({ where: { sessionId: SESSION1_ID, idempotencyKey: key } });
    const s2Order = await prisma.order.findFirst({ where: { sessionId: SESSION2_ID, idempotencyKey: key } });

    assert.ok(s1Order, 'Order in Session 1 exists');
    assert.ok(s2Order, 'Order in Session 2 exists');
    assert.notEqual(s1Order.id, s2Order.id, 'Orders have distinct IDs');
    assert.equal(s1Order.restaurantId, REST1_ID, 'Session 1 order belongs to Restaurant 1');
    assert.equal(s2Order.restaurantId, REST2_ID, 'Session 2 order belongs to Restaurant 2');
  });

  test('E. Failed transaction rolls back completely and does not consume the idempotency key', async () => {
    const key = 'fail-test-key-cccc-3333';
    const invalidItems = [{ menuItemId: 'non-existent-menu-item-xyz', quantity: 1 }];

    const failResult = await submitOrder({ key, sessionId: SESSION1_ID, items: invalidItems });
    assert.equal(failResult.status, 400, 'Order submission fails due to unavailable item');

    // Confirm no order was written to PostgreSQL
    const orphanOrder = await prisma.order.findFirst({ where: { sessionId: SESSION1_ID, idempotencyKey: key } });
    assert.equal(orphanOrder, null, 'No order row was created in PostgreSQL');

    // Safe retry with same key and valid item now succeeds
    const validItems = [{ menuItemId: ITEM1_ID, quantity: 1 }];
    const retryResult = await submitOrder({ key, sessionId: SESSION1_ID, items: validItems });
    assert.equal(retryResult.status, 201, 'Same key succeeds after previous failure');

    const createdOrder = await prisma.order.findFirst({ where: { sessionId: SESSION1_ID, idempotencyKey: key } });
    assert.ok(createdOrder, 'Order is successfully stored in PostgreSQL');
  });

  test('F. Lost response recovery returns original order even after session is closed', async () => {
    const key = 'lost-response-dddd-4444';
    const items = [{ menuItemId: ITEM1_ID, quantity: 1 }];

    // 1. Initial submission
    const firstResult = await submitOrder({ key, sessionId: SESSION1_ID, items });
    assert.equal(firstResult.status, 201, 'Initial submission created order');
    const originalOrderId = firstResult.body.data.id;

    // 2. Staff closes the session
    await prisma.session.update({
      where: { id: SESSION1_ID },
      data: { status: 'CLOSED', closedAt: new Date() },
    });

    // 3. Client retries with the same key (simulating dropped response recovery)
    const retryResult = await submitOrder({ key, sessionId: SESSION1_ID, items });
    assert.equal(retryResult.status, 200, 'Replay recovery succeeds with HTTP 200 even on closed session');
    assert.equal(retryResult.body.replayed, true, 'Response indicates replayed order');
    assert.equal(retryResult.body.data.id, originalOrderId, 'Recovered order matches original order');

    // 4. Verify a NEW key on the closed session is rejected
    const newKeyResult = await submitOrder({ key: 'new-key-on-closed-sess-5555', sessionId: SESSION1_ID, items });
    assert.equal(newKeyResult.status, 400, 'New orders on closed session are rejected');

    // Reopen session for any subsequent tests
    await prisma.session.update({
      where: { id: SESSION1_ID },
      data: { status: 'ACTIVE', closedAt: null },
    });
  });

  test('G. Historical orders with NULL idempotency fields remain valid without index violation', async () => {
    // Insert 2 historical orders directly via raw query or prisma with NULL keys
    const histOrder1 = await prisma.order.create({
      data: {
        restaurantId: REST1_ID,
        sessionId: SESSION1_ID,
        status: 'SERVED',
        idempotencyKey: null,
        requestHash: null,
      },
    });

    const histOrder2 = await prisma.order.create({
      data: {
        restaurantId: REST1_ID,
        sessionId: SESSION1_ID,
        status: 'SERVED',
        idempotencyKey: null,
        requestHash: null,
      },
    });

    assert.ok(histOrder1.id, 'Historical order 1 created');
    assert.ok(histOrder2.id, 'Historical order 2 created');
    assert.notEqual(histOrder1.id, histOrder2.id, 'Both historical orders have distinct IDs');

    // Verify both exist in PostgreSQL
    const nullOrders = await prisma.order.findMany({
      where: { sessionId: SESSION1_ID, idempotencyKey: null },
    });
    assert.ok(nullOrders.length >= 2, 'Multiple NULL idempotencyKey rows coexist in same restaurant and session');

    // Submitting a new order with a valid key succeeds alongside historical NULL records
    const newOrderResult = await submitOrder({
      key: 'new-order-alongside-null-6666',
      sessionId: SESSION1_ID,
      items: [{ menuItemId: ITEM1_ID, quantity: 1 }],
    });
    assert.equal(newOrderResult.status, 201, 'New order placed successfully alongside historical NULL records');
  });

  after(async () => {
    await prisma.$disconnect();
  });
}

