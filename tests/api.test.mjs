import test from 'node:test';
import assert from 'node:assert/strict';
import { createChatApi } from '../api/chat.js';

function postRequest(host, body, origin = `https://${host}`) {
  return new Request(`https://${host}/api/chat`, {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
}

test('create action keeps the private key on the upstream request only', async () => {
  const privateKey = 'private_test_key';
  let upstreamAuthorization;
  let upstreamPayload;
  const api = createChatApi({
    env: { RETELL_API_KEY: privateKey },
    fetchImpl: async (url, options) => {
      upstreamAuthorization = options.headers.Authorization;
      upstreamPayload = JSON.parse(options.body);
      assert.equal(url, 'https://api.retellai.com/create-chat');
      return Response.json({ chat_id: 'chat_id_123456789' });
    }
  });

  const response = await api.fetch(postRequest('create.test', { action: 'create' }));
  const result = await response.text();
  assert.equal(response.status, 201);
  assert.deepEqual(JSON.parse(result), { chatId: 'chat_id_123456789' });
  assert.equal(upstreamAuthorization, `Bearer ${privateKey}`);
  assert.deepEqual(upstreamPayload, { agent_id: 'agent_e2202fe277ace5ed5adb2c1c6b' });
  assert.equal(result.includes(privateKey), false);
});

test('chat proxy rejects cross-origin requests before contacting Retell', async () => {
  let upstreamCalls = 0;
  const api = createChatApi({
    env: { RETELL_API_KEY: 'private_test_key' },
    fetchImpl: async () => { upstreamCalls += 1; return Response.json({}); }
  });

  const response = await api.fetch(postRequest('reject.test', { action: 'create' }, 'https://other.test'));
  assert.equal(response.status, 403);
  assert.equal(upstreamCalls, 0);
});
