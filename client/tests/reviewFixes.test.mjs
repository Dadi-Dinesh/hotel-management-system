import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import { supplySummary } from '../app/lib/supplySummary.mjs';

function accessHarness(storage = new Map()) {
  const context = vm.createContext({ Map, Event: class {}, window: { dispatchEvent() {} }, sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) } });
  const code = fs.readFileSync(new URL('../app/lib/customerAccess.js', import.meta.url), 'utf8').replaceAll('export ', '');
  vm.runInContext(code, context);
  return context;
}
test('customer capabilities remain isolated by table/tenant/session and survive reload', () => {
  const storage = new Map(), c = accessHarness(storage);
  c.rememberCustomerAccess({ code: 'T01', customerAccess: 'token-a', activeSession: { id: 'sa' } }, '/restaurants/cafe-a/tables/T01');
  c.rememberCustomerAccess({ code: 'T01', customerAccess: 'token-b', activeSession: { id: 'sb' } }, '/restaurants/cafe-b/tables/T01');
  const reload = accessHarness(storage);
  assert.equal(reload.customerAccessForSession('sa'), 'token-a');
  assert.equal(reload.customerAccessForSession('sb'), 'token-b');
  assert.equal(reload.customerJoinPayload('cafe-a', 'T01').customerAccess, 'token-a');
  assert.equal(reload.customerJoinPayload('cafe-b', 'T01').customerAccess, 'token-b');
  assert.equal(reload.customerAccessForSession('unknown'), null);
});
test('legacy demo session-start credentials and storage denial have a safe in-memory path', () => {
  const c = accessHarness();
  c.sessionStorage.setItem = () => { throw new Error('blocked'); };
  c.sessionStorage.getItem = () => { throw new Error('blocked'); };
  c.rememberCustomerAccess({ id: 'demo-session', tableId: 'td', table: { code: 'T01' }, customerAccess: 'demo-capability' }, '/sessions');
  assert.equal(c.customerJoinPayload(null, 'T01').customerAccess, 'demo-capability');
  assert.equal(c.customerAccessForSession('demo-session'), 'demo-capability');
});
test('queued bill captures its original session capability, not the later active table', async () => {
  const queued = []; let requested;
  const c = vm.createContext({ customerAccessForSession: id => id === 'sa' ? 'capability-a' : null,
    api: { request: async request => { requested = request; throw new Error('offline'); } },
    enqueueAction: action => queued.push(action), requestBackgroundSync() {}, toast() {},
  });
  const code = fs.readFileSync(new URL('../app/lib/pwa/queuedRequest.js', import.meta.url), 'utf8').replace(/^import .*;$/gm, '').replaceAll('export ', '');
  vm.runInContext(code, c);
  const result = await c.requestOrQueue({ type: 'BILL_REQUEST', method: 'patch', url: '/sessions/sa/request-bill' });
  assert.equal(result.queued, true); assert.equal(requested.data.customerAccess, 'capability-a');
  c.customerAccessForSession = () => 'other-capability';
  assert.equal(queued[0].body.customerAccess, 'capability-a'); assert.equal(queued[0].url, '/sessions/sa/request-bill');
});
test('staff supply summary uses bounded quantities, ignores supplied summary and supports legacy payloads', () => {
  assert.equal(supplySummary({ details: { type: 'cutlery', items: { plates: 2, spoons: 1 }, summary: 'wrong' } }), 'Extra cutlery: 2 plates, 1 spoons');
  for (const items of [{ plates: -1 }, { plates: 21 }, { plates: '2' }, { unknown: 1 }]) assert.equal(supplySummary({ details: { type: 'cutlery', items } }), 'Assistance requested');
  assert.equal(supplySummary({}), 'Assistance requested');
  assert.equal(supplySummary({ message: 'Water requested' }), 'Water requested');
  assert.equal(supplySummary({ message: 'x'.repeat(500) }).length, 240);
});
test('order retry keeps its original identity and payload after reload and cart edits', async () => {
  const {createOrderAttempt,readOrderAttempt}=await import('../app/lib/orderAttempt.mjs');
  const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
  const cart=[{menuItemId:'rice',quantity:2}];
  const original=createOrderAttempt(storage,'pending-a','session-a',cart,()=> 'fixed-request-key');
  cart[0].quantity=4;
  const retry=readOrderAttempt(storage,'pending-a');assert.deepEqual(retry,original);assert.equal(retry.items[0].quantity,2);
  assert.equal(readOrderAttempt(storage,'pending-b'),null);
  storage.setItem('legacy','sending');assert.equal(readOrderAttempt(storage,'legacy'),null);
});
test('order submission fails before sending when its retry identity cannot be persisted',async()=>{
 const {createOrderAttempt}=await import('../app/lib/orderAttempt.mjs');
 assert.throws(()=>createOrderAttempt({setItem(){throw new Error('storage denied');}},'pending','s',[],()=> 'request-key'),/storage denied/);
});
