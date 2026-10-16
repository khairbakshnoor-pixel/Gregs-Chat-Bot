import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import path from 'node:path';
import { build, outputDir, publicFiles } from './build.mjs';
import { createChatApi } from '../api/chat.js';

let localEnv = {};
try {
  localEnv = parseEnv(await readFile(new URL('../.env', import.meta.url), 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await build();
const chatApi = createChatApi({ env: { ...localEnv, ...process.env } });
const allowed = new Set(publicFiles);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp' };
createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname === '/api/chat') {
      const headers = new Headers();
      for (const [name, value] of Object.entries(request.headers)) {
        if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
      }
      const init = { method: request.method, headers };
      if (!['GET', 'HEAD'].includes(request.method)) {
        init.body = request;
        init.duplex = 'half';
      }
      const apiRequest = new Request(new URL(request.url, `http://${request.headers.host}`), init);
      const result = await chatApi.fetch(apiRequest);
      response.writeHead(result.status, Object.fromEntries(result.headers));
      response.end(Buffer.from(await result.arrayBuffer()));
      return;
    }
    const file = pathname === '/' ? 'index.html' : pathname.slice(1);
    if (!allowed.has(file) || !['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(404).end('Not found');
      return;
    }
    if (file === 'index.html') await build();
    const content = await readFile(path.join(outputDir, file));
    response.writeHead(200, { 'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch {
    response.writeHead(500).end('Unable to serve the page. Check the local environment configuration.');
  }
}).listen(5177, '127.0.0.1', () => console.log('Local preview: http://127.0.0.1:5177'));
