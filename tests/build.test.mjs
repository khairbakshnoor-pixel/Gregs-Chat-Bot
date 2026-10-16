import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { build, outputDir, projectRoot, publicFiles } from '../scripts/build.mjs';

test('build publishes only public assets, excludes env files, and keeps the key out of source HTML', async () => {
  await build();
  assert.deepEqual((await readdir(outputDir)).sort(), [...publicFiles, 'widget-config.js'].sort());
  const html = await readFile(path.join(outputDir, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /public_key_|image\.png/);
  assert.match(html, /image\.webp/);
  for (const match of html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)) {
    const check = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: match[1], encoding: 'utf8' });
    assert.equal(check.status, 0, check.stderr);
  }
  for (const name of ['widget-loader.js', 'chat-connection.js', 'widget-config.js']) {
    const check = spawnSync(process.execPath, ['--check', path.join(outputDir, name)], { encoding: 'utf8' });
    assert.equal(check.status, 0, check.stderr);
  }
  const image = await readFile(path.join(outputDir, 'image.webp'));
  assert.equal(image.toString('ascii', 0, 4), 'RIFF');
  assert.equal(image.toString('ascii', 8, 12), 'WEBP');
});

test('build rejects a non-public credential without exposing its value', () => {
  const marker = 'private_test_value_do_not_publish';
  const result = spawnSync(process.execPath, ['scripts/build.mjs'], {
    cwd: projectRoot, env: { ...process.env, RETELL_PUBLIC_KEY: marker }, encoding: 'utf8'
  });
  assert.notEqual(result.status, 0);
  assert.equal((result.stdout + result.stderr).includes(marker), false);
});
