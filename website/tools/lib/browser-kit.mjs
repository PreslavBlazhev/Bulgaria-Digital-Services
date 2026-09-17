/* ============================================================
   BDS — обща основа за браузърните проверки
   ------------------------------------------------------------
   Тук живее само машинарията: статичен сървър, който се държи
   като Netlify, пускане на headless Chrome и минимален CDP
   клиент. Нищо от съдържанието на сайта не се знае тук.

   Защо е отделен файл: две отделни проверки (ресторантската фуния
   и GTM) отварят един и същ сайт в един и същ браузър. Копие на
   тази машинария би се разминало при първата поправка — а тя се
   поправя точно тогава, когато нещо вече не работи.

   Node 21 иска --experimental-websocket за WebSocket. Помощникът
   respawn() рестартира процеса с флага, вместо да проваля.
   ============================================================ */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
  '.json': 'application/json'
};

/** Рестартира процеса с --experimental-websocket, ако WebSocket липсва.
    Връща true, ако е трябвало да се рестартира (тогава извикващият спира). */
export function respawnForWebSocket(metaUrl, args) {
  if (typeof WebSocket !== 'undefined') return false;
  if (process.env.__BDS_RESPAWNED) {
    console.error('WebSocket не е наличен дори с --experimental-websocket. Нужен е Node 21+.');
    process.exit(1);
  }
  const r = spawnSync(process.execPath,
    ['--experimental-websocket', fileURLToPath(metaUrl), ...args],
    { stdio: 'inherit', env: { ...process.env, __BDS_RESPAWNED: '1' } });
  process.exit(r.status ?? 1);
}

/** Статичен сървър върху `root`, който спазва правилата от `_redirects`.
    Без него локалното поведение се разминава с Netlify точно там, където
    рекламните адреси разчитат на пренасочване. */
export function startServer(root) {
  const redirectsFile = path.join(root, '_redirects');
  const rules = (fs.existsSync(redirectsFile) ? fs.readFileSync(redirectsFile, 'utf8') : '')
    .split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split(/\s+/)).filter((p) => p.length >= 2)
    .map((p) => ({ from: p[0], to: p[1], code: parseInt(p[2] || '301', 10) }));

  const server = http.createServer((req, res) => {
    let u = decodeURIComponent(req.url.split('?')[0]);
    const rule = rules.find((r) => r.from === u);
    if (rule) { res.writeHead(rule.code, { Location: rule.to }); return res.end(); }
    if (u === '/') u = '/index.html';
    let f = path.join(root, u);
    if (!path.extname(f) && fs.existsSync(f + '.html')) f += '.html';
    if (!f.startsWith(root)) { res.writeHead(403); return res.end('403'); }
    fs.readFile(f, (err, data) => {
      if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('404'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise((r) => server.listen(0, () => r({ server, port: server.address().port })));
}

export function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ].filter(Boolean);
  return candidates.find((c) => { try { return fs.existsSync(c); } catch { return false; } });
}

/** Пуска headless Chrome със собствен профил. Връща null, ако го няма. */
export async function launchChrome(tag = 'bds-test') {
  const bin = findChrome();
  if (!bin) return null;
  const port = 9500 + Math.floor(Math.random() * 400);
  const udd = path.join(os.tmpdir(), tag + '-' + Date.now());
  const proc = spawn(bin, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + udd,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--hide-scrollbars'],
    { stdio: 'ignore' });
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch('http://127.0.0.1:' + port + '/json/version')).ok) return { proc, port, udd }; } catch {}
    await sleep(200);
  }
  try { proc.kill(); } catch {}
  return null;
}

/** Минимален CDP клиент за един таб: send / on / eval / close. */
export async function newPage(port) {
  const t = await (await fetch('http://127.0.0.1:' + port + '/json/new?about:blank', { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const pending = new Map(); const handlers = [];
  const ready = new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id); pending.delete(m.id);
      m.error ? rej(new Error(m.error.message)) : res(m.result);
    } else if (m.method) handlers.forEach((h) => h(m));
  };
  await ready;
  const api = {
    on: (fn) => handlers.push(fn),
    send(method, params = {}) {
      const myId = ++id;
      return new Promise((res, rej) => {
        pending.set(myId, { res, rej });
        ws.send(JSON.stringify({ id: myId, method, params }));
        setTimeout(() => { if (pending.has(myId)) { pending.delete(myId); rej(new Error('timeout ' + method)); } }, 30000);
      });
    },
    async eval(expr) {
      const r = await api.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      return r.result?.value;
    },
    close() { try { ws.close(); } catch {} },
  };
  return api;
}
