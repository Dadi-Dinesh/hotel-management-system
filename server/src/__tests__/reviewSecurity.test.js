const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const { hashToken } = require('../utils/tokenUtils');
// Real authorization/controller code, disposable data and in-memory room union.
// Does not import production db, environment files or open network connections.
function fixture() {
  const secret = 'disposable-review-fixture-signing-key';
  const restaurants = new Map(['a', 'b', 'demo'].map(id => [id, { id, slug: id === 'demo' ? 'nookambika' : `cafe-${id}`, isActive: true }]));
  const tables = new Map(['a', 'b', 'demo'].map(id => ['t'+id, { id: 't'+id, restaurantId: id, code: 'T01', isActive: true, qrTokenHash: id === 'demo' ? null : hashToken('qr-'+id) }]));
  const sessions = new Map(['a', 'b'].map(id => ['s'+id, { id: 's'+id, restaurantId: id, tableId: 't'+id, status: 'ACTIVE', orders: [] }]));
  const users = new Map(['captain', 'admin', 'kitchen', 'owner'].map(id => [id, { id, role: id === 'owner' ? 'ADMIN' : id.toUpperCase(), restaurantId: id === 'owner' ? null : 'a', restaurant: restaurants.get('a') }]));
  const events = [], rooms = new Map(), sockets = new Map();
  let connection, creates = 0, prints = 0;
  const adapter = {
    rooms,
    apply(options, callback) {
      const ids = new Set();
      for (const room of options.rooms) for (const id of rooms.get(room) || []) ids.add(id);
      for (const id of ids) if (!options.except?.has(id)) callback(sockets.get(id));
    },
    broadcast(packet, options) {
      const recipients = [];
      adapter.apply(options, socket => { socket.received.push({ event: packet.data[0], payload: packet.data[1] }); recipients.push(socket.id); });
      events.push({ rooms: [...options.rooms], event: packet.data[0], payload: packet.data[1], recipients });
    },
  };
  const io = { engine: { on() {} }, sockets: { adapter }, on(e, fn) { if (e === 'connection') connection = fn; },
    to(selected) { return { emit(event, payload) { return adapter.broadcast({ type: 2, data: [event, payload] }, { rooms: new Set([].concat(selected)), except: new Set(), flags: {} }); } }; },
  };
  const db = {
    restaurant: { findUnique: async ({ where }) => where.id ? restaurants.get(where.id) : [...restaurants.values()].find(r => r.slug === where.slug) },
    table: {
      findUnique: async ({ where, include }) => {
        const table = where.id ? tables.get(where.id) : [...tables.values()].find(t => t.restaurantId === where.restaurantId_code.restaurantId && t.code === where.restaurantId_code.code);
        return table && include?.sessions ? { ...table, sessions: [...sessions.values()].filter(s => s.tableId === table.id && s.status !== 'CLOSED') } : table;
      },
      update: async ({ where, data }) => Object.assign(tables.get(where.id), data),
    },
    user: { findUnique: async ({ where }) => users.get(where.id) },
    session: {
      findFirst: async ({ where }) => { const s = [...sessions.values()].find(s => s.tableId === where.tableId && where.status.in.includes(s.status)); return s && { ...s, table: tables.get(s.tableId) }; },
      create: async ({ data }) => { const s = { id: 'new-session', status: 'ACTIVE', orders: [], ...data }; sessions.set(s.id, s); return { ...s, table: tables.get(s.tableId) }; },
      findUnique: async ({ where }) => { const s = sessions.get(where.id); return s && { ...s, table: tables.get(s.tableId) }; },
      update: async ({ where, data }) => {
        const session = sessions.get(where.id);
        if (!session || session.restaurantId !== where.restaurantId) throw Object.assign(new Error('Not found'), { code: 'P2025' });
        Object.assign(session, data); return { ...session, table: tables.get(session.tableId) };
      },
      updateMany: async ({ where, data }) => { const s = sessions.get(where.id); if (!s || s.status !== where.status) return { count: 0 }; Object.assign(s, data); return { count: 1 }; },
    },
    menuItem: { findMany: async () => [{ id: 'food-a', name: 'Rice', price: 100 }] },
    order: { findUnique: async () => null, create: async ({ data }) => { creates++; return { id: 'oa', orderNumber: 1, items: data.items.create.map(item => ({ ...item, menuItem: { name: 'Rice' } })) }; } },
  };
  const cache = new Map();
  function load(relative) {
    const file = path.resolve(__dirname, '..', relative);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), { module, exports: module.exports, process: { env: { JWT_SECRET: secret, PRINTER_AGENT_KEY: "fixture-printer" } }, console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout, Buffer,
      require(id) {
        if (id === 'jsonwebtoken') return jwt;
        if (id === 'socket.io') return { Server: function () { return io; } };
        if (id === 'crypto') return require('crypto');
        const resolved = path.resolve(path.dirname(file), id);
        if (resolved.endsWith('/config/db')) return db;
        if (resolved.endsWith('/services/printer/cloudPrinterGateway')) return { registerAgent() {}, unregisterAgent() {} };
        if (resolved.endsWith('/utils/kotGenerator')) return { generateBillHTML: () => '<fixture-bill />' };
        if (resolved.endsWith('/services/printer/autoPrintService')) return { maybeAutoPrintBill: async () => { prints++; } };
        if (resolved.endsWith('/utils/auditLog')) return { logAudit() {} };
        if (resolved.endsWith('/services/kds.service')) return { getKitchenAggregatedData: async () => [] };
        if (id.startsWith('.')) return load(path.relative(path.resolve(__dirname, '..'), resolved + (path.extname(resolved) ? '' : resolved.endsWith('/socket') ? '/index.js' : '.js')));
        throw new Error(`Unexpected dependency: ${id}`);
      },
    }, { filename: file });
    return module.exports;
  }
  load('socket/index.js').initializeSocket({});
  const access = load('services/customerAccess.js');
  function connect(id, auth = {}) {
    const handlers = {};
    const socket = { id, rooms: new Set([id]), handshake: { auth }, data: {}, received: [],
      on(event, fn) { handlers[event] = fn; },
      join(room) { socket.rooms.add(room); if (!rooms.has(room)) rooms.set(room, new Set()); rooms.get(room).add(id); },
      leave(room) { socket.rooms.delete(room); rooms.get(room)?.delete(id); },
      disconnect() { for (const room of [...socket.rooms]) socket.leave(room); handlers.disconnect?.('test cleanup'); },
      async emit(event, payload) { let ack; await handlers[event](payload, value => { ack = value; }); return ack; },
    };
    sockets.set(id, socket); socket.join(id); connection(socket); return socket;
  }
  return { load, access, tables, sessions, restaurants, users, io, events, connect, creates: () => creates, prints: () => prints,
    staffToken: (id, expiresIn = '1h') => jwt.sign({ userId: id }, secret, { expiresIn }),
    token: () => access.issueCustomerAccess(tables.get('ta'), sessions.get('sa')),
    expired: () => jwt.sign({ tableId: 'ta', restaurantId: 'a', sessionId: 'sa', qrVersion: tables.get('ta').qrTokenHash }, secret, { audience: 'servesync-customer', expiresIn: -1 }),
  };
}
function response() { return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; }
async function authorize(f, token, id, allowClosed = false) {
  const req = { params: { id }, body: {}, headers: token ? { 'x-customer-access': token } : {} };
  const res = response(); let passed = false;
  await f.load('middleware/customerAccess.js').customerAccess({ allowClosed })(req, res, () => { passed = true; });
  return { req, res, passed };
}
test('customer capability rejects missing, forged, expired and foreign-session credentials', async () => {
  const f = fixture(); const token = f.token();
  for (const candidate of [undefined, 'forged', f.expired(), f.staffToken('captain')]) assert.equal((await authorize(f, candidate, 'sa')).passed, false);
  assert.equal((await authorize(f, token, 'sb')).passed, false);
  assert.equal((await authorize(f, token, 'sa')).passed, true);
});
test('live customer validation rejects mismatches, suspension, closure and QR rotation', async () => {
  for (const mutate of [
    f => { f.sessions.get('sa').restaurantId = 'b'; }, f => { f.sessions.get('sa').tableId = 'tb'; },
    f => { f.tables.get('ta').isActive = false; }, f => { f.restaurants.get('a').isActive = false; },
    f => { f.sessions.get('sa').status = 'CLOSED'; }, f => { f.tables.get('ta').qrTokenHash = hashToken('rotated'); },
  ]) { const f = fixture(); const token = f.token(); mutate(f); assert.equal((await authorize(f, token, 'sa')).passed, false); }
});
test('secure scans need QR proof; only the explicit legacy demo supports unprotected scans', async () => {
  const f = fixture();
  await assert.rejects(f.access.validateTable(f.tables.get('ta'), 'wrong'));
  await f.access.validateTable(f.tables.get('ta'), 'qr-a');
  await f.access.validateTable(f.tables.get('tdemo'));
  f.tables.get('ta').qrTokenHash = null; await assert.rejects(f.access.validateTable(f.tables.get('ta')));
  f.restaurants.get('demo').isActive = false; await assert.rejects(f.access.validateTable(f.tables.get('tdemo')));
});
test('staff joins reject missing auth, wrong roles, cross-tenant hints and invalid platform targets', async () => {
  const f = fixture(); const s = f.connect('staff');
  for (const [event, payload] of [
    ['join-captain', { restaurantId: 'a' }], ['join-admin', { token: f.staffToken('captain'), restaurantId: 'a' }],
    ['join-captain', { token: f.staffToken('captain'), restaurantId: 'b' }],
    ['join-admin', { token: f.staffToken('owner'), restaurantId: 'missing' }], ['join-admin', { token: f.staffToken('owner') }],
  ]) { assert.equal((await s.emit(event, payload)).success, false); assert.equal(s.rooms.size, 1); }
  assert.equal((await s.emit('join-captain', { token: f.staffToken('captain') })).success, true);
  assert.ok(s.rooms.has('restaurant:a:captains')); s.disconnect();
});
test('customer joins validate signed table and slug; never fall back or join global rooms', async () => {
  const f = fixture(); const s = f.connect('guest');
  for (const payload of [{ tableCode: 'T01', restaurantSlug: 'cafe-a' }, { tableCode: 'T01', restaurantSlug: 'missing', customerAccess: f.token() }, { tableCode: 'T02', restaurantSlug: 'cafe-a', customerAccess: f.token() }]) assert.equal((await s.emit('join-table', payload)).success, false);
  assert.equal((await s.emit('join-table', { tableCode: 'T01', restaurantSlug: 'cafe-a', customerAccess: f.token() })).success, true);
  assert.deepEqual([...s.rooms].sort(), ['guest', 'restaurant:a:table:T01']); s.disconnect();
});
test('supply dispatch is once per recipient, excludes other tenants and validates quantities', async () => {
  const f = fixture(); const captain = f.connect('captain'), admin = f.connect('admin'), other = f.connect('other'), guest = f.connect('guest');
  await captain.emit('join-captain', { token: f.staffToken('captain') }); await admin.emit('join-admin', { token: f.staffToken('admin') });
  await other.emit('join-admin', { token: f.staffToken('owner'), restaurantId: 'b' });
  await guest.emit('join-table', { tableCode: 'T01', restaurantSlug: 'cafe-a', customerAccess: f.token() });
  const payload = { tableCode: 'T01', details: { type: 'cutlery', items: { plates: 2, spoons: 1 }, summary: 'untrusted' } };
  assert.equal((await guest.emit('call-waiter', payload)).success, true);
  assert.equal(captain.received.length, 1); assert.equal(admin.received.length, 1); assert.equal(other.received.length, 0);
  assert.equal(captain.received[0].payload.details.summary, '2 plates, 1 spoons');
  assert.equal((await guest.emit('call-waiter', { tableCode: 'T01', details: { type: 'cutlery', items: { plates: -1 } } })).success, false);
  captain.disconnect(); admin.disconnect(); assert.equal((await guest.emit('call-waiter', payload)).success, false);
  other.disconnect(); guest.disconnect();
});
test('order dispatch is once per recipient with overlapping rooms and excludes foreign tenant', async () => {
  const f = fixture(); const captain = f.connect('captain'), kitchen = f.connect('kitchen'), other = f.connect('other');
  await captain.emit('join-captain', { token: f.staffToken('captain') }); await kitchen.emit('join-kitchen', { token: f.staffToken('kitchen') });
  await other.emit('join-admin', { token: f.staffToken('owner'), restaurantId: 'b' });
  const auth = await authorize(f, f.token(), 'sa'); assert.equal(auth.passed, true);
  auth.req.headers['idempotency-key'] = 'fixture-key-123456';
  auth.req.body = { sessionId: 'sa', items: [{ menuItemId: 'food-a', quantity: 1 }] };
  const res = response(); await f.load('controllers/order.controller.js').placeOrder(auth.req, res, error => { throw error; });
  assert.equal(res.statusCode, 201); assert.equal(f.creates(), 1);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(captain.received.filter(e => e.event === 'new-order').length, 1); assert.equal(kitchen.received.filter(e => e.event === 'new-order').length, 1); assert.equal(other.received.length, 0);
  for (const s of [captain, kitchen, other]) s.disconnect();
});
test('queued bill replay after closure fails; atomic guard also covers closure after authorization', async () => {
  const f = fixture(); const queued = { id: 'sa', token: f.token() }; const before = await authorize(f, queued.token, queued.id); assert.equal(before.passed, true);
  f.sessions.get('sa').status = 'CLOSED';
  const replay = await authorize(f, queued.token, queued.id); assert.equal(replay.passed, false); assert.equal(replay.res.statusCode, 409);
  const res = response(); await f.load('controllers/session.controller.js').requestBill(before.req, res, error => { throw error; });
  assert.equal(res.statusCode, 409); assert.equal(f.sessions.get('sa').status, 'CLOSED'); assert.equal(f.prints(), 0); assert.equal(f.events.length, 0);
});
test('concurrent/repeated bills transition and print once', async () => {
  const f = fixture(); const captain = f.connect('captain'); await captain.emit('join-captain', { token: f.staffToken('captain') });
  const handler = f.load('controllers/session.controller.js').requestBill;
  await Promise.all([1, 2, 3].map(async () => { const res = response(); await handler({ params: { id: 'sa' } }, res, error => { throw error; }); assert.equal(res.statusCode, 200); }));
  assert.equal(f.sessions.get('sa').status, 'BILL_REQUESTED'); assert.equal(f.prints(), 1);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.events.filter(e => e.event === 'bill-requested').length, 1); captain.disconnect();
});
test('platform switching removes old tenant rooms', async () => {
  const f = fixture(); const s = f.connect('owner'); const token = f.staffToken('owner');
  await s.emit('join-admin', { token, restaurantId: 'a' }); await s.emit('join-admin', { token, restaurantId: 'b' });
  assert.ok(![...s.rooms].some(room => room.startsWith('restaurant:a:'))); assert.ok(s.rooms.has('restaurant:b:admins')); s.disconnect();
});
test('actual offline queue replay rejects a closed bill and removes the rejected action without reopening', async () => {
  const f = fixture(), storage = new Map();
  const context = vm.createContext({ window: {}, localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    toast: { success() {}, error() {} }, api: { async request({ url, data }) {
      const id = url.split('/')[2]; const auth = await authorize(f, data.customerAccess, id);
      if (!auth.passed) throw { response: { status: auth.res.statusCode, data: auth.res.body } };
      const res = response(); await f.load('controllers/session.controller.js').requestBill(auth.req, res, error => { throw error; });
      if (res.statusCode >= 400) throw { response: { status: res.statusCode, data: res.body } };
      return { data: res.body };
    } },
  });
  const source = fs.readFileSync(path.resolve(__dirname, '../../../client/app/lib/pwa/offlineQueue.js'), 'utf8').replace(/^import .*;$/gm, '').replaceAll('export ', '');
  vm.runInContext(source, context);
  context.enqueueAction({ type: 'BILL_REQUEST', method: 'patch', url: '/sessions/sa/request-bill', body: { customerAccess: f.token() } });
  assert.equal(context.getQueueLength(), 1); f.sessions.get('sa').status = 'CLOSED';
  const result = await context.drainQueue(); assert.equal(result.failed, 1); assert.equal(result.synced, 0); assert.equal(result.remaining, 0);
  assert.equal(f.sessions.get('sa').status, 'CLOSED'); assert.equal(f.events.length, 0); assert.equal(f.prints(), 0);
});
test('order and all public session action routes enforce customer authorization before controllers', async () => {
  const f = fixture(); let controllerCalls = 0;
  for (const file of ['order.routes.js', 'session.routes.js']) {
    const routes = []; const router = {};
    for (const method of ['get', 'post', 'patch']) router[method] = (path, ...handlers) => routes.push({ method, path, handlers });
    const controller = new Proxy({}, { get: () => () => { controllerCalls++; } });
    const module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../routes', file), 'utf8'), { module, require(id) {
      if (id === 'express') return { Router: () => router };
      if (id.endsWith('/customerAccess')) return f.load('middleware/customerAccess.js');
      if (id.includes('/controllers/')) return controller;
      const pass = (req, res, next) => next();
      if (id.endsWith('/rateLimit')) return { rateLimit: () => pass };
      if (id.endsWith('/validate')) return { validate: () => pass };
      if (id.endsWith('/schemas')) return {};
      if (id.endsWith('/auth')) return { authenticate: pass, requireRole: () => pass };
      if (id.endsWith('/tenant')) return { resolveStaffTenant: pass, resolvePublicTenant: pass };
      throw new Error(id);
    } });
    const targets = file === 'order.routes.js' ? routes.filter(r => r.method === 'post' && r.path === '/') : routes.filter(r => ['/:id', '/:id/request-bill', '/:id/feedback'].includes(r.path));
    assert.equal(targets.length, file === 'order.routes.js' ? 1 : 3);
    for (const route of targets) {
      const req = { params: { id: 'sa' }, body: { sessionId: 'sa' }, headers: {} }, res = response();
      async function run(index) { if (route.handlers[index]) await route.handlers[index](req, res, () => run(index + 1)); }
      await run(0); assert.equal(res.statusCode, 403);
    }
  }
  assert.equal(controllerCalls, 0);
});
test('invalid and suspended restaurant identifiers never fall back to the demo', async () => {
  const f = fixture(), resolver = f.load('middleware/tenant.js').resolvePublicTenant;
  for (const slug of ['missing', '', ' ', 123]) {
    const res = response(); let called = false;
    await resolver({ params: { slug }, body: {}, query: {} }, res, () => { called = true; });
    assert.equal(called, false); assert.equal(res.statusCode, 404);
  }
  f.restaurants.get('demo').isActive = false;
  const res = response(); let called = false;
  await resolver({ params: {}, body: {}, query: {} }, res, () => { called = true; });
  assert.equal(called, false); assert.equal(res.statusCode, 404);
});
test('unauthorized staff cannot satisfy the supply acknowledgement recipient check', async () => {
  const f = fixture(), fake = f.connect('fake'), guest = f.connect('guest');
  assert.equal((await fake.emit('join-admin', { restaurantId: 'a' })).success, false);
  await guest.emit('join-table', { tableCode: 'T01', restaurantSlug: 'cafe-a', customerAccess: f.token() });
  assert.equal((await guest.emit('call-waiter', { tableCode: 'T01', message: 'Water' })).success, false);
  assert.equal(fake.received.length, 0); fake.disconnect(); guest.disconnect();
});
test('closed-session read is limited to its original capability and cannot authorize orders', async () => {
  const f = fixture(), token = f.token(); f.sessions.get('sa').status = 'CLOSED';
  assert.equal((await authorize(f, token, 'sa', true)).passed, true);
  assert.equal((await authorize(f, token, 'sb', true)).passed, false);
  assert.equal((await authorize(f, token, 'sa')).passed, false);
});
test('staff session closure is tenant-scoped and requires a selected tenant', async () => {
  const f = fixture(), close = f.load('controllers/session.controller.js').closeSession;
  let failure;
  await close({ params: { id: 'sb' }, restaurantId: 'a', user: { id: 'captain' } }, response(), error => { failure = error; });
  assert.equal(failure.code, 'P2025'); assert.equal(f.sessions.get('sb').status, 'ACTIVE');
  const missing = response(); await close({ params: { id: 'sa' }, user: { id: 'owner' } }, missing, error => { throw error; });
  assert.equal(missing.statusCode, 400); assert.equal(f.sessions.get('sa').status, 'ACTIVE');
  const valid = response(); await close({ params: { id: 'sa' }, restaurantId: 'a', user: { id: 'captain' } }, valid, error => { throw error; });
  assert.equal(valid.statusCode, 200); assert.equal(f.sessions.get('sa').status, 'CLOSED'); assert.equal(f.sessions.get('sb').status, 'ACTIVE');
});
test('verified QR lookup issues working session access; invalid QR issues none', async () => {
  const f = fixture(), lookup = f.load('controllers/table.controller.js').getTableByCode;
  const bad = response(); await lookup({ restaurantId: 'a', params: { code: 'T01' }, query: { token: 'wrong' } }, bad, error => { throw error; });
  assert.equal(bad.statusCode, 403); assert.equal(bad.body.data, undefined);
  const valid = response(); await lookup({ restaurantId: 'a', params: { code: 'T01' }, query: { token: 'qr-a' } }, valid, error => { throw error; });
  assert.equal(valid.statusCode, 200); assert.equal((await authorize(f, valid.body.data.customerAccess, 'sa')).passed, true);
  assert.equal((await authorize(f, valid.body.data.customerAccess, 'sb')).passed, false);
});
test('legacy demo starts safely and secure existing sessions require the QR before issuing access', async () => {
  const f = fixture(), start = f.load('controllers/session.controller.js').startSession;
  const bad = response(); await start({ restaurantId: 'a', body: { tableCode: 'T01' } }, bad, error => { throw error; });
  assert.equal(bad.statusCode, 403);
  const valid = response(); await start({ restaurantId: 'a', body: { tableCode: 'T01', token: 'qr-a' } }, valid, error => { throw error; });
  assert.equal(valid.body.data.id, 'sa'); assert.equal((await authorize(f, valid.body.data.customerAccess, 'sa')).passed, true);
  const demo = response(); await start({ restaurantId: 'demo', body: { tableCode: 'T01' } }, demo, error => { throw error; });
  assert.equal(demo.statusCode, 201); assert.equal(demo.body.data.restaurantId, 'demo');
  assert.equal((await authorize(f, demo.body.data.customerAccess, demo.body.data.id)).passed, true);
  assert.equal(f.sessions.get('sa').status, 'ACTIVE'); assert.equal(f.sessions.get('sb').status, 'ACTIVE');
});
test('printer-agent disconnect retains its independent authentication lifecycle', () => {
  const f = fixture(), printer = f.connect('printer', { agentType: 'PRINTER_AGENT', apiKey: 'fixture-printer' });
  assert.ok(printer.rooms.has('printer-agents'));
  assert.doesNotThrow(() => printer.disconnect());
});
test('installed Socket.IO adapter delivers a room union once per recipient without cross-tenant delivery', () => {
  const { Adapter } = require('socket.io-adapter');
  const delivered = new Map();
  const namespace = { name: '/', server: { encoder: { encode: () => [] } }, sockets: new Map() };
  const adapter = new Adapter(namespace);
  for (const [id, roles, tenant] of [['captain', ['waiters', 'captains'], 'a'], ['admin', ['waiters', 'admins'], 'a'], ['foreign', ['waiters', 'captains'], 'b']]) {
    namespace.sockets.set(id, { id, client: { writeToEngine() { delivered.set(id, (delivered.get(id) || 0) + 1); } } });
    adapter.addAll(id, new Set(roles.map(role => `restaurant:${tenant}:${role}`)));
  }
  adapter.broadcast({ type: 2, data: ['waiter-call', { tableCode: 'T01' }] }, { rooms: new Set(['waiters', 'captains', 'admins'].map(role => `restaurant:a:${role}`)), except: new Set(), flags: {} });
  assert.equal(delivered.get('captain'), 1); assert.equal(delivered.get('admin'), 1); assert.equal(delivered.has('foreign'), false);
});
test('deleted and demoted staff cannot receive subsequent protected packets or perform live-mode actions', async () => {
 for (const revoke of [f=>f.users.delete('captain'),f=>{f.users.get('captain').role='KITCHEN';},f=>{f.restaurants.get('a').isActive=false;}]) {
  const f=fixture(),s=f.connect('staff');await s.emit('join-captain',{token:f.staffToken('captain')});revoke(f);
  await f.io.to('restaurant:a:captains').emit('new-order',{orderId:'fixture'});
  assert.equal(s.received.length,0);assert.equal(s.rooms.size,0);
  await s.emit('kitchen-live-mode',{enabled:true});assert.equal(f.events.length,0);
  const reconnect=f.connect('reconnect');assert.equal((await reconnect.emit('join-captain',{token:f.staffToken('captain')})).success,false);reconnect.disconnect();
 }
});
test('expired staff tokens fail at dispatch, including before an expiry timer runs',async()=>{
 const f=fixture(),s=f.connect('staff');await s.emit('join-captain',{token:f.staffToken('captain')});
 s.data.staff.token=f.staffToken('captain', -1);await f.io.to('restaurant:a:captains').emit('new-order',{});
 assert.equal(s.received.length,0);assert.equal(s.rooms.size,0);
 const reconnect=f.connect('retry');assert.equal((await reconnect.emit('join-captain',{token:f.staffToken('captain', -1)})).success,false);reconnect.disconnect();
});
test('tenant reassignment revokes old room membership; valid reconnect joins only new tenant',async()=>{
 const f=fixture(),s=f.connect('staff'),token=f.staffToken('captain');await s.emit('join-captain',{token});
 f.users.get('captain').restaurantId='b';f.users.get('captain').restaurant=f.restaurants.get('b');
 await f.io.to('restaurant:a:captains').emit('new-order',{});assert.equal(s.received.length,0);
 const reconnect=f.connect('new');assert.equal((await reconnect.emit('join-captain',{token})).success,true);
 assert.ok(reconnect.rooms.has('restaurant:b:captains'));assert.ok(!reconnect.rooms.has('restaurant:a:captains'));reconnect.disconnect();
});
test('revoked platform owners no longer receive platform notifications',async()=>{
 const f=fixture(),s=f.connect('owner');await s.emit('join-platform',{token:f.staffToken('owner')});f.users.delete('owner');
 await f.io.to('platform:admins').emit('new-application',{});assert.equal(s.received.length,0);assert.equal(s.rooms.size,0);
});
test('supply acknowledgement fails when its only previously connected staff member is revoked',async()=>{
 const f=fixture(),staff=f.connect('staff'),guest=f.connect('guest');
 await staff.emit('join-captain',{token:f.staffToken('captain')});
 await guest.emit('join-table',{tableCode:'T01',restaurantSlug:'cafe-a',customerAccess:f.token()});
 f.users.delete('captain');const ack=await guest.emit('call-waiter',{tableCode:'T01',message:'Water requested'});
 assert.equal(ack.success,false);assert.equal(ack.acknowledgement,'server-dispatch');assert.equal(staff.received.length,0);guest.disconnect();
});
