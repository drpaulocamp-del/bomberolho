// dev-server.mjs — servidor estático local SEM dependências (node:http + fs).
// Só para preview/desenvolvimento local; produção é o upload estático p/ Hostinger.
//
//   node dev-server.mjs                  → http://localhost:7100/
//   node dev-server.mjs --port 8123      → porta via CLI
//   npm run dev -- --port 8123 --host 0.0.0.0
//   PORT=8123 HOST=127.0.0.1 npm run dev → via ambiente

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
};

// argumentos CLI (--port/--host, também --port=8123) > env > default
function argValue(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  return eq ? eq.split('=')[1] : null;
}
const PORT = Number(argValue('port') || process.env.PORT || 7100);
const HOST = argValue('host') || process.env.HOST || 'localhost';

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let path = decodeURIComponent(url.pathname);
    if (path.endsWith('/')) path += 'index.html';

    // trava de segurança: nunca servir fora da pasta do site
    const file = normalize(join(ROOT, path));
    if (file !== ROOT && !file.startsWith(ROOT + sep)) {
      res.writeHead(403).end('403 Forbidden');
      return;
    }

    let target = file;
    const st = await stat(target).catch(() => null);
    if (st && st.isDirectory()) target = join(target, 'index.html');

    const body = await readFile(target).catch(() => null);
    if (!body) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[extname(target).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache', // dev local: sempre fresco
    });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('500 Internal Server Error');
    console.error(err);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`▶ Site rodando em http://${HOST}:${PORT}/  (raiz: ${ROOT})`);
  console.log('  Ctrl+C para parar.');
});
