const fs = require('fs');
const source = fs.readFileSync('server.js', 'utf8');
const worker = fs.readFileSync('deploy/ollama-cloud-worker.js', 'utf8');

if (!source.includes("'/api/ollama/chat'")) throw new Error('server does not expose Ollama proxy route');
if (!source.includes("'https://ollama.com/api/chat'")) throw new Error('server does not target Ollama Cloud chat API');
if (!source.includes("'Authorization': `Bearer ${apiKey}`")) throw new Error('server does not forward bearer auth');
if (!worker.includes("'Access-Control-Allow-Origin'")) throw new Error('worker does not expose browser CORS headers');
if (!worker.includes("'https://ollama.com/api/chat'")) throw new Error('worker does not target Ollama Cloud chat API');

console.log('[OK] server proxy smoke passed');
