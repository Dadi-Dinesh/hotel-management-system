// Guard the adapter boundary so every producer (controllers, services, platform
// notifications) revalidates staff before protected packets reach the transport.
function installBroadcastAccess(adapter, authorize) {
  const protectedRoom = room => room === 'platform:admins' || /^restaurant:[^:]+:(waiters|captains|admins|kitchen)$/.test(room);
  async function recipients(options) {
    const sockets = [];
    adapter.apply(options, socket => sockets.push(socket));
    const protectedTarget = [...(options.rooms || [])].some(protectedRoom);
    const allowed = [];
    await Promise.all(sockets.map(async socket => {
      const identity = socket.data?.staff;
      if (!identity && !protectedTarget) { allowed.push(socket.id); return; }
      try {
        if (!identity || !await authorize(socket, identity)) throw new Error('Denied');
        if (socket.data.staff === identity && socket.connected !== false) allowed.push(socket.id);
      } catch {
        if (socket.data?.staff === identity) socket.disconnect(true);
      }
    }));
    return allowed;
  }
  const original = adapter.broadcast.bind(adapter);
  adapter.broadcast = (packet, options) => {
    // Explicit promise is also used by supply dispatch acknowledgements.
    return recipients(options).then(ids => {
      if (ids.length) original(packet, { ...options, rooms: new Set(ids), except: new Set() });
      return ids.length;
    }).catch(() => 0); // Fail closed on auth/database failures.
  };
  const withAck = adapter.broadcastWithAck?.bind(adapter);
  if (withAck) adapter.broadcastWithAck = (packet, options, count, ack) => {
    recipients(options).then(ids => {
      if (!ids.length) return count(0);
      withAck(packet, { ...options, rooms: new Set(ids), except: new Set() }, count, ack);
    }).catch(() => count(0));
  };
}
module.exports = { installBroadcastAccess };
