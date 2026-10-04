// Descent — PC (Windows) sürümü. Oyunun web dosyalarını uygulamanın içinden "app://" adresiyle açar:
// böylece model/ses dosyaları fetch ile yüklenir, internet olmadan da çalışır (çok oyunculu için internet gerekir).
const { app, BrowserWindow, protocol, net, session, Menu, shell } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required'); // menü müziği hemen başlasın

app.whenReady().then(() => {
  const root = path.join(__dirname, 'app');
  protocol.handle('app', (req) => {
    let p = decodeURIComponent(new URL(req.url).pathname);
    if (!p || p === '/') p = '/index.html';
    const f = path.normalize(path.join(root, p));
    if (!f.startsWith(root)) return new Response('yok', { status: 403 });
    return net.fetch(pathToFileURL(f).toString());
  });
  // sesli sohbet için mikrofon, fare kilidi ve tam ekran izinleri
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(['media', 'pointerLock', 'fullscreen'].includes(perm)));
  Menu.setApplicationMenu(null);
  const win = new BrowserWindow({
    width: 1600, height: 900, minWidth: 960, minHeight: 540, backgroundColor: '#050606', fullscreen: true, title: 'Descent',
    icon: path.join(__dirname, 'icon.png'), autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, backgroundThrottling: false }
  });
  win.loadURL('app://descent/index.html');
  win.webContents.on('before-input-event', (e, i) => {
    if (i.type === 'keyDown' && (i.key === 'F11' || (i.alt && i.key === 'Enter'))) { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });
  // CI duman testi: oyun açıldı mı, modeller yüklendi mi?
  if (process.env.KD_SMOKE) {
    win.webContents.on('console-message', (e, lvl, msg) => { if (lvl >= 2) console.log('KONSOL:', msg); });
    setTimeout(async () => {
      try { const r = await win.webContents.executeJavaScript("JSON.stringify({kd:typeof __kd,lib:!!(__kd&&__kd.ENV&&__kd.ENV.lib),miner:!!(__kd&&__kd.MN&&__kd.MN.ready),ver:(document.querySelector('.mFoot')||{}).textContent})"); console.log('KD_SMOKE', r); }
      catch (err) { console.log('KD_SMOKE_ERR', String(err)); }
      app.quit();
    }, 20000);
  }
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
});
app.on('window-all-closed', () => app.quit());
