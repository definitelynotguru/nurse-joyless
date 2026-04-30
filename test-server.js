const fs = require('fs');
const source = fs.readFileSync('server.js', 'utf8');

if (!source.includes("'/api/ollama/chat'")) throw new Error('server does not expose Ollama proxy route');
if (!source.includes("'https://ollama.com/api/chat'")) throw new Error('server does not target Ollama Cloud chat API');
if (!source.includes("'Authorization': `Bearer ${apiKey}`")) throw new Error('server does not forward bearer auth');

console.log('[OK] server proxy smoke passed');
