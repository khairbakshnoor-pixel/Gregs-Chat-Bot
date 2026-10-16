import test from 'node:test';
import assert from 'node:assert/strict';
import { createChatConnection } from '../chat-connection.js';

function setup() {
  const calls = [];
  let open = false;
  let timer;
  const connection = createChatConnection({
    isOpen: () => open,
    launch: () => calls.push('launch'),
    close: () => { calls.push('close'); open = false; },
    focus: () => calls.push('focus'),
    show: () => calls.push('show'),
    hide: () => calls.push('hide'),
    slow: () => calls.push('slow'),
    setTimer: callback => { timer = callback; return 1; },
    clearTimer: () => { timer = undefined; }
  });
  return { connection, calls, open: () => { open = true; }, tick: () => timer?.() };
}

test('click gives immediate feedback before the vendor request and does not duplicate requests', () => {
  const { connection, calls } = setup();
  assert.deepEqual(calls, []); // No session work on page load.
  connection.begin();
  assert.deepEqual(calls, ['show', 'launch']);
  connection.begin();
  assert.equal(calls.filter(c => c === 'launch').length, 1);
});

test('ready chat replaces the loading panel once and receives focus', () => {
  const { connection, calls, open, tick } = setup();
  connection.begin(); open(); connection.sync(); connection.sync(); tick();
  assert.deepEqual(calls, ['show', 'launch', 'hide', 'focus']);
});

test('clicking an already open chat focuses it without closing or creating another session', () => {
  const { connection, calls, open } = setup();
  open(); connection.begin();
  assert.deepEqual(calls, ['focus']);
});

test('closing the loading panel prevents a late response from reopening chat', () => {
  const { connection, calls, open, tick } = setup();
  connection.begin(); connection.cancel(); tick(); open(); connection.sync();
  assert.equal(calls.includes('slow'), false);
  assert.equal(calls.includes('focus'), false);
  assert.equal(calls.at(-1), 'close');
});

test('reopening while a cancelled request is pending reuses it and restores the slow notice', () => {
  const { connection, calls, open, tick } = setup();
  connection.begin(); connection.cancel(); connection.begin(); tick();
  assert.equal(calls.filter(c => c === 'launch').length, 1);
  assert.equal(calls.at(-1), 'slow');
  open(); connection.sync();
  assert.equal(calls.at(-1), 'focus');
});

test('native launcher click receives feedback without triggering a second native click', () => {
  const { connection, calls } = setup();
  connection.begin({ launchWidget: false });
  assert.deepEqual(calls, ['show']);
});

test('slow connection can retry through the vendor launcher', () => {
  const { connection, calls, tick } = setup();
  connection.begin(); tick();
  assert.equal(calls.at(-1), 'slow');
  connection.retry();
  assert.equal(calls.filter(c => c === 'launch').length, 2);
});
