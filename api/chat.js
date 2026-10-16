const retellBaseUrl = 'https://api.retellai.com';
const defaultAgentId = 'agent_e2202fe277ace5ed5adb2c1c6b';
const maxBodyBytes = 8192;
const rateLimitWindowMs = 60_000;
const rateLimitMaxRequests = 30;
const rateLimitBuckets = new Map();

function jsonResponse(body, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' }
  });
}

function hasSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;

  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    const requestHost = request.headers.get('x-forwarded-host')?.split(',')[0].trim()
      || request.headers.get('host')
      || requestUrl.host;
    return ['http:', 'https:'].includes(originUrl.protocol) && originUrl.host === requestHost;
  } catch {
    return false;
  }
}

function isRateLimited(request, now) {
  const forwardedFor = request.headers.get('x-forwarded-for') || '';
  const clientId = forwardedFor.split(',')[0].trim() || request.headers.get('origin') || 'unknown';
  let bucket = rateLimitBuckets.get(clientId);

  if (!bucket || now - bucket.startedAt >= rateLimitWindowMs) {
    bucket = { startedAt: now, requests: 0 };
    rateLimitBuckets.set(clientId, bucket);
  }
  bucket.requests += 1;

  if (rateLimitBuckets.size > 1000) {
    for (const [key, entry] of rateLimitBuckets) {
      if (now - entry.startedAt >= rateLimitWindowMs) rateLimitBuckets.delete(key);
    }
  }
  return bucket.requests > rateLimitMaxRequests;
}

export function createChatApi({ fetchImpl = fetch, env = process.env, now = Date.now } = {}) {
  return {
    async fetch(request) {
      if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed.' }, 405);
      }
      if (!hasSameOrigin(request)) {
        return jsonResponse({ error: 'Request not allowed.' }, 403);
      }
      if (isRateLimited(request, now())) {
        return jsonResponse({ error: 'Too many requests. Please wait and try again.' }, 429);
      }
      if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
        return jsonResponse({ error: 'Invalid request.' }, 415);
      }

      const contentLength = Number(request.headers.get('content-length') || 0);
      if (contentLength > maxBodyBytes) {
        return jsonResponse({ error: 'Request is too large.' }, 413);
      }

      let body;
      try {
        const text = await request.text();
        if (new TextEncoder().encode(text).byteLength > maxBodyBytes) {
          return jsonResponse({ error: 'Request is too large.' }, 413);
        }
        body = JSON.parse(text);
      } catch {
        return jsonResponse({ error: 'Invalid request.' }, 400);
      }

      const apiKey = env.RETELL_API_KEY;
      if (!apiKey) {
        return jsonResponse({ error: 'Chat is not configured yet.' }, 503);
      }

      let endpoint;
      let payload;
      if (body.action === 'create') {
        endpoint = '/create-chat';
        payload = { agent_id: env.RETELL_CHAT_AGENT_ID || defaultAgentId };
      } else if (body.action === 'send') {
        const chatId = typeof body.chatId === 'string' ? body.chatId.trim() : '';
        const content = typeof body.content === 'string' ? body.content.trim() : '';
        if (!/^[A-Za-z0-9_-]{8,80}$/.test(chatId) || !content || content.length > 2000) {
          return jsonResponse({ error: 'Enter a message and try again.' }, 400);
        }
        endpoint = '/create-chat-completion';
        payload = { chat_id: chatId, content };
      } else {
        return jsonResponse({ error: 'Invalid request.' }, 400);
      }

      try {
        const upstream = await fetchImpl(`${retellBaseUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(20_000)
        });
        if (!upstream.ok) {
          console.error(`Retell chat request failed (${upstream.status}).`);
          return jsonResponse({ error: 'Alex could not respond just now. Please try again.' }, 502);
        }

        const result = await upstream.json();
        if (body.action === 'create') {
          if (typeof result.chat_id !== 'string' || !result.chat_id) {
            return jsonResponse({ error: 'Chat could not be started. Please try again.' }, 502);
          }
          return jsonResponse({ chatId: result.chat_id }, 201);
        }

        const messages = Array.isArray(result.messages)
          ? result.messages
            .filter(message => message?.role === 'agent' && typeof message.content === 'string')
            .map(message => ({ content: message.content }))
          : [];
        return jsonResponse({ messages });
      } catch {
        return jsonResponse({ error: 'Alex could not respond just now. Please try again.' }, 502);
      }
    }
  };
}

const chatApi = createChatApi();

export default async function handler(request, response) {
  const host = request.headers['x-forwarded-host'] || request.headers.host;
  const protocol = request.headers['x-forwarded-proto'] || 'https';
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
  }
  const init = { method: request.method, headers };
  if (!['GET', 'HEAD'].includes(request.method)) {
    if (request.body === undefined) {
      init.body = request;
    } else {
      init.body = typeof request.body === 'string' || Buffer.isBuffer(request.body)
        ? request.body
        : JSON.stringify(request.body);
      headers.delete('content-length');
    }
    if (init.body === request) init.duplex = 'half';
  }
  const url = new URL(request.url, `${protocol}://${host}`);
  const result = await chatApi.fetch(new Request(url, init));
  response.statusCode = result.status;
  for (const [name, value] of result.headers) response.setHeader(name, value);
  response.end(Buffer.from(await result.arrayBuffer()));
}
