const fs = require('fs');
const http = require('http');
const path = require('path');

const root = __dirname;
const port = Number(process.env.PORT || 8000);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type });
  res.end(body);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

async function proxyOllama(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Allow': 'POST, OPTIONS' });
    res.end();
    return;
  }
  if (req.method !== 'POST') return send(res, 405, 'method not allowed');

  try {
    const { apiKey, model, messages, stream = false, options = {} } = await readJson(req);
    if (!apiKey) return send(res, 400, 'missing apiKey');
    if (!model) return send(res, 400, 'missing model');
    const upstream = await fetch('https://ollama.com/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, stream, options }),
    });

    res.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') || 'application/x-ndjson; charset=utf-8',
    });
    if (!upstream.body) {
      res.end(await upstream.text());
      return;
    }
    for await (const chunk of upstream.body) res.write(chunk);
    res.end();
  } catch (err) {
    send(res, 502, err.message || String(err));
  }
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  const target = path.normalize(path.join(root, urlPath === '/' ? 'index.html' : urlPath));
  if (!target.startsWith(root)) return send(res, 403, 'forbidden');
  fs.readFile(target, (err, data) => {
    if (err) return send(res, 404, 'not found');
    res.writeHead(200, { 'Content-Type': mime[path.extname(target)] || 'application/octet-stream' });
    res.end(data);
  });
}

http.createServer((req, res) => {
  if (req.url && req.url.startsWith('/api/ollama/chat')) {
    proxyOllama(req, res);
    return;
  }
  serveStatic(req, res);
}).listen(port, () => {
  console.log(`Nurse Joyless running at http://localhost:${port}`);
});
