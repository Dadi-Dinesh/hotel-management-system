const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const idempotency = require('../services/orderIdempotency');
function harness() {
  const rows = new Map(); let writes = 0, failWrite = false, failDispatch = false;
  const session = { id: 's1', restaurantId: 'r1', status: 'ACTIVE', table: { code: 'T01' } };
  const db = {
    session: { findUnique: async ({where}) => ({ ...session, id: where.id }) },
    menuItem: { findMany: async ({where}) => where.id.in.includes('food') ? [{ id: 'food', price: 100, name: 'Rice' }] : [] },
    order: {
      findUnique: async ({where}) => rows.get(JSON.stringify(where.restaurantId_sessionId_idempotencyKey)),
      create: async ({data}) => {
        // Yield so independent callers can race; the simulated DB enforces the unique index.
        await new Promise(resolve => setImmediate(resolve));
        if (failWrite) throw new Error('fixture failure before commit');
        const key = JSON.stringify({ restaurantId: data.restaurantId, sessionId: data.sessionId, idempotencyKey: data.idempotencyKey });
        if (rows.has(key)) throw Object.assign(new Error('unique constraint'), {code:'P2002'});
        const row = { ...data, id: `order-${++writes}`, orderNumber: writes, items: data.items.create.map(i => ({...i,menuItem:{name:'Rice'}})) };
        rows.set(key,row); return row;
      },
    },
  };
  const dependencies = {'../config/db':db,'../services/orderIdempotency':idempotency,'../socket':{getIO:()=>({to:()=>({emit(){if(failDispatch)throw new Error('fixture dispatch failure');}})})},'../utils/kotGenerator':{},'../services/kds.service':{getKitchenAggregatedData:async()=>[]},'../services/printer/autoPrintService':{}};
  const module = {exports:{}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../controllers/order.controller.js'),'utf8'),{module,require:id=>{assert.ok(id in dependencies,id);return dependencies[id];},console:{log(){},warn(){}}});
  async function submit({key='request-key-123456',quantity=1,sessionId='s1',item='food'}={}) {
    const res={code:200,status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
    await module.exports.placeOrder({headers:{'idempotency-key':key},body:{sessionId,items:[{menuItemId:item,quantity}]}},res,error=>{res.code=error.statusCode||500;res.error=error;});
    return res;
  }
  return {submit,session,rows,writes:()=>writes,failWrite:v=>{failWrite=v;},failDispatch:v=>{failDispatch=v;}};
}
test('sequential retries and lost responses return original order, including after closure',async()=>{
 const h=harness();const first=await h.submit();assert.equal(first.code,201);
 // Discard the first response as if the transport lost it.
 h.session.status='CLOSED';const retry=await h.submit();assert.equal(retry.code,200);assert.equal(retry.body.data.id,first.body.data.id);assert.equal(h.writes(),1);
 assert.equal((await h.submit({key:'different-key-123456'})).code,400);
});
test('concurrent identical requests create one order and all recover that order',async()=>{
 const h=harness();const results=await Promise.all(Array.from({length:12},()=>h.submit()));
 assert.equal(h.writes(),1);assert.equal(results.filter(r=>r.code===201).length,1);
 assert.equal(new Set(results.map(r=>r.body.data.id)).size,1);
});
test('concurrent and sequential mismatched payloads return conflict, including after item removal',async()=>{
 const h=harness();const results=await Promise.all([h.submit({quantity:1}),h.submit({quantity:2})]);
 assert.deepEqual(results.map(r=>r.code).sort(),[201,409]);assert.equal(h.writes(),1);
 const winner=results.find(r=>r.code===201).body.data;
 winner.items=[]; // Menu deletion cannot erase the immutable fingerprint.
 const quantity=winner.requestHash===idempotency.describeRequest('request-key-123456',[{menuItemId:'food',quantity:1}]).requestHash?2:1;
 assert.equal((await h.submit({quantity})).code,409);
});
test('tenant and session scopes never collide or return another scoped order',async()=>{
 const h=harness();const a=await h.submit();h.session.restaurantId='r2';const b=await h.submit();const c=await h.submit({sessionId:'s2'});
 assert.equal(h.writes(),3);assert.equal(new Set([a.body.data.id,b.body.data.id,c.body.data.id]).size,3);
});
test('validation and failed persistence do not consume the key; committed notification failures remain successful',async()=>{
 const h=harness();assert.equal((await h.submit({item:'missing'})).code,400);assert.equal(h.writes(),0);
 h.failWrite(true);assert.equal((await h.submit()).code,500);assert.equal(h.writes(),0);
 h.failWrite(false);h.failDispatch(true);const accepted=await h.submit();assert.equal(accepted.code,201);assert.equal(h.writes(),1);
 assert.equal((await h.submit()).body.data.id,accepted.body.data.id);
});
test('missing or malformed keys fail before writing',async()=>{
 const h=harness();for(const key of ['', 'tiny', '../invalid/request/key'])assert.equal((await h.submit({key})).code,400);
 assert.equal(h.writes(),0);
});
