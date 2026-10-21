const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");

function controllerHarness({ missing=false, closed=false }={}) {
 const events=[];let created;let query;
 const session={id:"session-a",restaurantId:"restaurant-a",tableId:"table-a",status:closed?"CLOSED":"ACTIVE",table:{code:"T01",number:1}};
 const menu=[{id:"food-a",restaurantId:"restaurant-a",isAvailable:true,price:125,name:"Rice"},{id:"food-b",restaurantId:"restaurant-b",isAvailable:true,price:1,name:"Other tenant"}];
 const prisma={session:{findUnique:async()=>missing?null:session},menuItem:{findMany:async({where})=>{query=where;return menu.filter(item=>where.id.in.includes(item.id)&&item.restaurantId===where.restaurantId&&item.isAvailable===where.isAvailable);}},order:{findUnique:async()=>null,create:async(args)=>{created=args;return {id:"order-a",orderNumber:9,createdAt:new Date(),items:args.data.items.create.map((item,index)=>({...item,id:`line-${index}`,menuItem:menu.find(m=>m.id===item.menuItemId)}))};}}};
 const io={to:room=>({emit:(event,payload)=>(Array.isArray(room)?room:[room]).forEach(room=>events.push({room,event,payload}))})};
 const dependencies={"../services/orderIdempotency":require("../services/orderIdempotency"),"../config/db":prisma,"../socket":{getIO:()=>io},"../utils/kotGenerator":{},"../services/kds.service":{getKitchenAggregatedData:async()=>[]},"../services/printer/autoPrintService":{}};
 const context={module:{exports:{}},require:id=>{assert.ok(id in dependencies,`Unexpected dependency ${id}`);return dependencies[id];},console:{log(){}}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../controllers/order.controller.js"),"utf8"),context);
 return {place:context.module.exports.placeOrder,events,created:()=>created,query:()=>query};
}
async function request(harness,items){const result={status:200};const res={status(code){result.status=code;return this;},json(body){result.body=body;return this;}};await harness.place({headers:{"idempotency-key":"fixture-key-123456"},body:{sessionId:"session-a",items}},res,error=>{throw error;});return result;}
test("customer order uses server prices and emits to the session restaurant's kitchen and captains",async()=>{const h=controllerHarness();const result=await request(h,[{menuItemId:"food-a",quantity:2,price:0}]);assert.equal(result.status,201);assert.equal(h.created().data.items.create[0].price,125);assert.equal(h.created().data.restaurantId,"restaurant-a");assert.ok(h.events.some(e=>e.room==="restaurant:restaurant-a:kitchen"&&e.event==="new-order"));assert.ok(h.events.some(e=>e.room==="restaurant:restaurant-a:captains"&&e.event==="new-order"));assert.ok(h.events.every(e=>e.room.startsWith("restaurant:restaurant-a:")));});
test("cross-restaurant items are rejected without creating or notifying",async()=>{const h=controllerHarness();assert.equal((await request(h,[{menuItemId:"food-b",quantity:1}])).status,400);assert.equal(h.created(),undefined);assert.equal(h.events.length,0);});
test("missing or unavailable items are rejected",async()=>{const h=controllerHarness();assert.equal((await request(h,[{menuItemId:"unavailable",quantity:1}])).status,400);assert.equal(h.created(),undefined);});
test("closed sessions cannot order",async()=>{const h=controllerHarness({closed:true});assert.equal((await request(h,[{menuItemId:"food-a",quantity:1}])).status,400);assert.equal(h.created(),undefined);});
test("missing sessions cannot order",async()=>{const h=controllerHarness({missing:true});assert.equal((await request(h,[{menuItemId:"food-a",quantity:1}])).status,404);});

test("cutlery details reach restaurant staff and receive dispatch acknowledgement",async()=>{
 const events=[];let connect;const handlers={};
 const rooms=new Map([["restaurant:restaurant-a:captains",new Set(["staff"])]]);
 const io={sockets:{adapter:{rooms,broadcast(packet, options){for(const room of options.rooms)events.push({room,event:packet.data[0],payload:packet.data[1]});return 1;}}},engine:{on(){}},on:(event,callback)=>{if(event==="connection")connect=callback;},to:room=>({emit:(event,payload)=>(Array.isArray(room)?room:[room]).forEach(room=>events.push({room,event,payload}))})};
 const dependencies={"../services/socketBroadcastAccess":{installBroadcastAccess(){}},"../services/customerAccess":{verifyCustomerAccess:async()=>({table:{code:"T01"},restaurant:{id:"restaurant-a"}})},"../services/staffSocketAccess":{},"../utils/supplyRequest":require("../utils/supplyRequest"),jsonwebtoken:{},"../config/db":{},"../services/printer/cloudPrinterGateway":{},"socket.io":{Server:function(){return io;}}};
 const context={module:{exports:{}},require:id=>dependencies[id],console:{log(){},warn(){},error(){}},process:{env:{}}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../socket/index.js"),"utf8"),context);
 context.module.exports.initializeSocket({});
 connect({id:"test",handshake:{auth:{}},data:{restaurantId:"restaurant-a",tableCode:"T01"},on:(event,handler)=>{handlers[event]=handler;}});
 let ack;const details={type:"cutlery",items:{plates:2,spoons:1},summary:"2 plates, 1 spoons"};
 await handlers["call-waiter"]({tableCode:"T01",message:"Extra cutlery",details},value=>{ack=value;});
 assert.equal(ack.success,true);assert.equal(events.length,3);assert.ok(events.every(e=>e.room.startsWith("restaurant:restaurant-a:")&&JSON.stringify(e.payload.details)===JSON.stringify(details)));
 await handlers["call-waiter"]({tableCode:"T02",message:"wrong table"},value=>{ack=value;});assert.equal(ack.success,false);assert.equal(events.length,3);
 rooms.clear();await handlers["call-waiter"]({tableCode:"T01",message:"No staff"},value=>{ack=value;});assert.equal(ack.success,false);assert.match(ack.message,/No staff connection/);assert.equal(events.length,3);
});
