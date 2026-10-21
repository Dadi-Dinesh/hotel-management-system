const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Adapter}=require('socket.io-adapter');
const {installBroadcastAccess}=require('../services/socketBroadcastAccess');
test('installed adapter checks current auth before writing packets; errors fail closed',async()=>{
 const counts=new Map(),nsp={name:'/',server:{encoder:{encode:()=>[]}},sockets:new Map()};
 const adapter=new Adapter(nsp);let valid=true;
 const socket={id:'staff',data:{staff:{role:'CAPTAIN'}},client:{writeToEngine(){counts.set('staff',(counts.get('staff')||0)+1);}},disconnect(){adapter.delAll('staff');nsp.sockets.delete('staff');}};
 nsp.sockets.set('staff',socket);adapter.addAll('staff',new Set(['staff','restaurant:a:captains']));
 installBroadcastAccess(adapter,async()=>{if(!valid)throw new Error('revoked or DB unavailable');return true;});
 const opts={rooms:new Set(['restaurant:a:captains']),except:new Set(),flags:{}};
 assert.equal(await adapter.broadcast({type:2,data:['order',{}]},opts),1);valid=false;
 assert.equal(await adapter.broadcast({type:2,data:['order',{}]},opts),0);assert.equal(counts.get('staff'),1);
});
test('acknowledged broadcasts cannot bypass revocation checks',async()=>{
 let forwarded=0,disconnected=0;
 const socket={id:'s',data:{staff:{}},disconnect(){disconnected++;}};
 const adapter={apply(options,visit){visit(socket);},broadcast(){forwarded++;},broadcastWithAck(){forwarded++;}};
 installBroadcastAccess(adapter,async()=>false);
 const count=await new Promise(resolve=>adapter.broadcastWithAck({},{rooms:new Set(['restaurant:a:admins'])},resolve,()=>{}));
 assert.equal(count,0);assert.equal(forwarded,0);assert.equal(disconnected,1);
});
test('context switching during authorization never delivers a stale tenant packet',async()=>{
 const socket={id:'s',data:{staff:{restaurantId:'a'}},disconnect(){throw new Error('must not disconnect new identity');}};
 let forwarded=0;
 const adapter={apply(options,visit){visit(socket);},broadcast(){forwarded++;}};
 installBroadcastAccess(adapter,async()=>{socket.data.staff={restaurantId:'b'};return true;});
 assert.equal(await adapter.broadcast({},{rooms:new Set(['restaurant:a:admins'])}),0);assert.equal(forwarded,0);
});
