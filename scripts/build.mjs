import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));
export const outputDir = path.join(projectRoot, 'dist');
export const publicFiles = ['index.html', 'widget-loader.js', 'chat-connection.js', 'image.webp', 'alex.webp'];

export async function build() {
  let localEnv = {};
  try {
    localEnv = parseEnv(await readFile(path.join(projectRoot, '.env'), 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const publicKey = (process.env.RETELL_PUBLIC_KEY || localEnv.RETELL_PUBLIC_KEY || '').trim();
  if (!/^public_key_[a-zA-Z0-9]+$/.test(publicKey)) {
    throw new Error('Set RETELL_PUBLIC_KEY to your Retell PUBLIC widget key in .env or Vercel environment variables.');
  }
  await mkdir(outputDir, { recursive: true });
  // Explicit allowlist: source files and .env are never published.
  await Promise.all(publicFiles.map(file => copyFile(path.join(projectRoot, file), path.join(outputDir, file))));
  await writeFile(path.join(outputDir, 'widget-config.js'),
    `// Public browser configuration, generated during build.\nexport const publicKey = ${JSON.stringify(publicKey)};\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await build();
  console.log('Built static website in dist/ (environment files excluded).');
}
