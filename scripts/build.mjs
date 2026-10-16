import { mkdir, copyFile, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));
export const outputDir = path.join(projectRoot, 'dist');
export const publicFiles = ['index.html', 'chat-client.js', 'image.webp', 'alex.webp'];

export async function build() {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  await Promise.all(publicFiles.map(file => copyFile(path.join(projectRoot, file), path.join(outputDir, file))));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await build();
  console.log('Built static website in dist/.');
}
