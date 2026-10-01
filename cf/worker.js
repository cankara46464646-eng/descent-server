// Descent oda sunucusu — Cloudflare Workers + Durable Objects (ücretsiz plan, kart gerekmez, uyumaz).
// Her oda kodu = bir Durable Object. Protokol Node sürümüyle (server.js) birebir aynı:
//   istemci → {t:'p', d:<presence>}
//   sunucu  → {t:'hello', peer, peers:[{peer,d}]} · {t:'p', peer, d} · {t:'join', peer} · {t:'leave', peer} · {t:'err', code}
const MAX_PLAYERS = 4, MAX_MSG = 16 * 1024;

export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (u.pathname === '/health') return new Response('ok', { headers: { 'access-control-allow-origin': '*' } });
    if (u.pathname === '/ws') {
      const code = (u.searchParams.get('room') || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
      if (!code || req.headers.get('Upgrade') !== 'websocket') return new Response('bad', { status: 400 });
      const id = env.ROOMS.idFromName(code);
      return env.ROOMS.get(id).fetch(req);
    }
    return new Response('Descent sunucusu çalışıyor.', { headers: { 'content-type': 'text/plain; charset=utf-8', 'access-control-allow-origin': '*' } });
  }
};

export class Room {
  constructor(state) { this.state = state; }
  peerOf(ws) { const a = ws.deserializeAttachment(); return a && a.peer; }
  all() { return this.state.getWebSockets(); }
  async fetch(req) {
    const pair = new WebSocketPair(); const [client, server] = Object.values(pair);
    const others = this.all();
    if (others.length >= MAX_PLAYERS) {
      server.accept(); server.send(JSON.stringify({ t: 'err', code: 'full' })); server.close(1000, 'full');
      return new Response(null, { status: 101, webSocket: client });
    }
    const peer = crypto.randomUUID().replace(/-/g, '').slice(0, 7);
    this.state.acceptWebSocket(server);
    server.serializeAttachment({ peer, d: null });
    server.send(JSON.stringify({ t: 'hello', peer, peers: others.map(w => { const a = w.deserializeAttachment() || {}; return { peer: a.peer, d: a.d }; }) }));
    const j = JSON.stringify({ t: 'join', peer }); for (const w of others) { try { w.send(j); } catch (e) {} }
    return new Response(null, { status: 101, webSocket: client });
  }
  async webSocketMessage(ws, msg) {
    if (typeof msg !== 'string' || msg.length > MAX_MSG) return;
    let m; try { m = JSON.parse(msg); } catch (e) { return; }
    if (!m || m.t !== 'p') return;
    const a = ws.deserializeAttachment() || {}; a.d = m.d;
    // attachment boyutu sınırlı (2 KB); büyük presence'ı bellekte tut
    try { ws.serializeAttachment(a); } catch (e) { ws.serializeAttachment({ peer: a.peer, d: null }); }
    const out = JSON.stringify({ t: 'p', peer: a.peer, d: m.d });
    for (const w of this.all()) if (w !== ws) { try { w.send(out); } catch (e) {} }
  }
  async webSocketClose(ws) { this.leave(ws); }
  async webSocketError(ws) { this.leave(ws); }
  leave(ws) {
    const peer = this.peerOf(ws); try { ws.close(1000, 'bye'); } catch (e) {}
    const out = JSON.stringify({ t: 'leave', peer });
    for (const w of this.all()) if (w !== ws) { try { w.send(out); } catch (e) {} }
  }
}
