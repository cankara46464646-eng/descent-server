// Descent oda sunucusu — bağımlılıksız (yalnızca Node.js). Oda kodu → en fazla 4 oyuncu.
// Her oyuncu kendi "presence" durumunu gönderir; sunucu odadaki diğerlerine iletir.
// Protokol (JSON metin çerçeveleri):
//   istemci → {t:'p', d:<presence>}            kendi durumum
//   sunucu  → {t:'hello', peer, peers:[{peer,d}]}  bağlanınca
//   sunucu  → {t:'p', peer, d}                  biri durumunu güncelledi
//   sunucu  → {t:'join', peer} / {t:'leave', peer}
//   sunucu  → {t:'err', code}                   'full' | 'bad'
//   ikili çerçeve (sesli sohbet): istemci → ses verisi; sunucu → [8 bayt gönderen kimliği][ses verisi]
const http = require('http');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;
const MAX_PLAYERS = 4;
const MAX_MSG = 16 * 1024;     // bir mesaj en fazla 16 KB
const MAX_RATE = 60;           // saniyede en fazla mesaj (oyuncu başına)
const rooms = new Map();       // kod → Map(peer → client)

const server = http.createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end('ok'); }
  let players = 0; for (const r of rooms.values()) players += r.size;
  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'access-control-allow-origin': '*' });
  res.end(`Descent sunucusu çalışıyor. Açık oda: ${rooms.size}, oyuncu: ${players}\n`);
});

server.on('upgrade', (req, socket) => {
  const u = new URL(req.url, 'http://x');
  const key = req.headers['sec-websocket-key'];
  const code = (u.searchParams.get('room') || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
  if (u.pathname !== '/ws' || !key || !code) { socket.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  socket.setNoDelay(true);
  const room = rooms.get(code) || new Map();
  const peer = crypto.randomBytes(5).toString('base64url').slice(0, 7);
  const uid = (u.searchParams.get('id') || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 24);
  const c = { peer, socket, d: null, buf: Buffer.alloc(0), alive: true, cnt: 0, t0: Date.now(), code, uid };
  // aynı oyuncu yeniden bağlandı (telefon kilitlendi / internet gitti): eski, ölü bağlantısını hemen kapat → yer açılır
  if (uid) for (const o of [...room.values()]) if (o.uid === uid) close(o);
  if (room.size >= MAX_PLAYERS) { send(c, { t: 'err', code: 'full' }); close(c); return; }
  rooms.set(code, room); room.set(peer, c);
  send(c, { t: 'hello', peer, peers: [...room.values()].filter(o => o !== c).map(o => ({ peer: o.peer, d: o.d })) });
  broadcast(room, c, { t: 'join', peer });
  socket.on('data', chunk => onData(c, chunk));
  socket.on('close', () => drop(c));
  socket.on('error', () => drop(c));
});

function onData(c, chunk) {
  c.buf = Buffer.concat([c.buf, chunk]);
  if (c.buf.length > MAX_MSG * 2) return close(c);
  for (;;) {
    const b = c.buf; if (b.length < 2) return;
    const op = b[0] & 0x0f, masked = b[1] & 0x80; let len = b[1] & 0x7f, off = 2;
    if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
    else if (len === 127) { if (b.length < 10) return; len = Number(b.readBigUInt64BE(2)); off = 10; }
    if (len > MAX_MSG) return close(c);
    const mlen = masked ? 4 : 0; if (b.length < off + mlen + len) return;
    let payload = b.subarray(off + mlen, off + mlen + len);
    if (masked) { const m = b.subarray(off, off + 4); payload = Buffer.from(payload); for (let i = 0; i < payload.length; i++) payload[i] ^= m[i & 3]; }
    c.buf = b.subarray(off + mlen + len);
    if (op === 8) return close(c);                 // kapat
    if (op === 9) { frame(c, 10, payload); continue; } // ping → pong
    if (op === 10) { c.alive = true; continue; }       // pong
    if (op === 2) {                                    // ikili: sesli sohbet çerçevesi → odadaki diğerlerine, başına gönderenin kimliği eklenir
      if (payload.length > 2048) continue;
      const now2 = Date.now(); if (now2 - (c.vt0 || 0) > 1000) { c.vt0 = now2; c.vcnt = 0; } if (++c.vcnt > 40) continue;
      const room = rooms.get(c.code); if (!room) continue;
      const data = Buffer.concat([Buffer.from(c.peer.padEnd(8).slice(0, 8)), payload]);
      for (const o of room.values()) if (o !== c) frame(o, 2, data);
      continue;
    }
    if (op !== 1) continue;                            // yalnızca metin
    const now = Date.now(); if (now - c.t0 > 1000) { c.t0 = now; c.cnt = 0; } if (++c.cnt > MAX_RATE) continue;
    let m; try { m = JSON.parse(payload.toString('utf8')); } catch (e) { continue; }
    if (m && m.t === 'p') { c.d = m.d; const room = rooms.get(c.code); if (room) broadcast(room, c, { t: 'p', peer: c.peer, d: m.d }); }
  }
}
function frame(c, op, data) {
  if (c.socket.destroyed) return; const n = data.length; let h;
  if (n < 126) { h = Buffer.from([0x80 | op, n]); }
  else if (n < 65536) { h = Buffer.alloc(4); h[0] = 0x80 | op; h[1] = 126; h.writeUInt16BE(n, 2); }
  else { h = Buffer.alloc(10); h[0] = 0x80 | op; h[1] = 127; h.writeBigUInt64BE(BigInt(n), 2); }
  try { c.socket.write(Buffer.concat([h, data])); } catch (e) {}
}
function send(c, obj) { frame(c, 1, Buffer.from(JSON.stringify(obj))); }
function broadcast(room, from, obj) { const data = Buffer.from(JSON.stringify(obj)); for (const o of room.values()) if (o !== from) frame(o, 1, data); }
function close(c) { try { frame(c, 8, Buffer.alloc(0)); c.socket.end(); } catch (e) {} drop(c); }
function drop(c) {
  const room = rooms.get(c.code); if (!room || room.get(c.peer) !== c) return;
  room.delete(c.peer); broadcast(room, c, { t: 'leave', peer: c.peer });
  if (!room.size) rooms.delete(c.code);
  try { c.socket.destroy(); } catch (e) {}
}
// kopuk bağlantıları temizle (10 sn'de bir ping; cevap vermeyen en geç 20 sn'de düşer)
setInterval(() => { for (const room of rooms.values()) for (const c of room.values()) { if (!c.alive) { drop(c); continue; } c.alive = false; frame(c, 9, Buffer.alloc(0)); } }, 10000);

server.listen(PORT, () => console.log('Descent sunucusu dinliyor: ' + PORT));
