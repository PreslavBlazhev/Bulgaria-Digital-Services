/* Малък локален статичен сървър за Bulgaria Digital Services.
   Стартиране:  node server.js
   После отвори адреса, който се изписва в конзолата (по подразбиране http://localhost:3000)

   Ако портът е зает, сървърът автоматично пробва следващия свободен порт,
   така че никога не гърми с "address already in use". */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
// Може да зададеш порт така:  PORT=8080 node server.js   (или set PORT=8080 на Windows)
const START_PORT = parseInt(process.env.PORT, 10) || 3000;
const MAX_TRIES = 15; // ще пробва 3000, 3001, ... докато намери свободен

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.gif': 'image/gif',
  '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8', '.json': 'application/json',
};

function createServer() {
  return http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';

    // Ако се поиска път без разширение (напр. /about) — пробвай .html
    let filePath = path.join(ROOT, urlPath);
    if (!path.extname(filePath) && fs.existsSync(filePath + '.html')) {
      filePath = filePath + '.html';
    }

    // Малка защита: не пускай извън папката на проекта
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('403 Forbidden');
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found: ' + urlPath);
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });
}

function listen(port, triesLeft) {
  const server = createServer();

  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE' && triesLeft > 0) {
      console.log('Порт ' + port + ' е зает, пробвам ' + (port + 1) + '...');
      listen(port + 1, triesLeft - 1);
    } else if (err.code === 'EADDRINUSE') {
      console.error('Всички пробвани портове са заети. Стартирай с друг порт, напр.:  PORT=8080 node server.js');
      process.exit(1);
    } else {
      console.error('Грешка при стартиране на сървъра:', err.message);
      process.exit(1);
    }
  });

  server.listen(port, () => {
    console.log('');
    console.log('  Bulgaria Digital Services работи!');
    console.log('  Отвори:  http://localhost:' + port);
    console.log('');
    console.log('  (спри със Ctrl + C)');
  });
}

listen(START_PORT, MAX_TRIES);
