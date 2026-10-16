import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { build, outputDir, publicFiles } from './build.mjs';

await build();
const allowed = new Set([...publicFiles, 'widget-config.js']);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp' };
createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname;
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
    response.writeHead(500).end('Unable to build the page. Check RETELL_PUBLIC_KEY in your environment.');
  }
}).listen(5177, '127.0.0.1', () => console.log('Local preview: http://127.0.0.1:5177'));
