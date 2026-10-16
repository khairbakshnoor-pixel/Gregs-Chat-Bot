// The public key is intentionally available to the browser, but kept out of
// tracked source. Only the allowlisted public key is included by the build.
try {
  const { publicKey } = await import('./widget-config.js');
  document.getElementById('retell-widget').dataset.publicKey = publicKey;
  await import('https://dashboard.retellai.com/retell-widget-v2.js');
} catch {
  document.documentElement.dataset.chatLoadFailed = 'true';
  window.dispatchEvent(new Event('retell-widget-load-error'));
}
