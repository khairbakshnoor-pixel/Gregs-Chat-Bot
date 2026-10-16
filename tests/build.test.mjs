import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { build, outputDir, publicFiles } from '../scripts/build.mjs';

test('build publishes the custom chat without browser widget credentials', async () => {
  await build();
  assert.deepEqual((await readdir(outputDir)).sort(), [...publicFiles].sort());
  const html = await readFile(path.join(outputDir, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /public_key_|RETELL_API_KEY|data-public-key|dashboard\.retellai\.com/);
  assert.match(html, /image\.webp/);
  assert.match(html, /initializeChat\(\)/);
  for (const match of html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)) {
    const check = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: match[1], encoding: 'utf8' });
    assert.equal(check.status, 0, check.stderr);
  }
  for (const name of ['chat-client.js']) {
    const check = spawnSync(process.execPath, ['--check', path.join(outputDir, name)], { encoding: 'utf8' });
    assert.equal(check.status, 0, check.stderr);
  }
  const image = await readFile(path.join(outputDir, 'image.webp'));
  assert.equal(image.toString('ascii', 0, 4), 'RIFF');
  assert.equal(image.toString('ascii', 8, 12), 'WEBP');
});
