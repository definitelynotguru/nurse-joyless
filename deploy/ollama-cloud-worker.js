const OLLAMA_CHAT_URL = 'https://ollama.com/api/chat';

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function text(body, status, origin) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...corsHeaders(origin) },
  });
}

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '*';
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
    if (request.method !== 'POST') return text('method not allowed', 405, origin);

    let body;
    try {
      body = await request.json();
    } catch (_) {
      return text('invalid json', 400, origin);
    }

    const { apiKey, model, messages, stream = false, options = {} } = body || {};
    if (!apiKey) return text('missing apiKey', 400, origin);
    if (!model) return text('missing model', 400, origin);

    const upstream = await fetch(OLLAMA_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, stream, options }),
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') || 'application/x-ndjson; charset=utf-8',
        ...corsHeaders(origin),
      },
    });
  },
};
