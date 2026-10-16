// Keeps the page responsive while Retell prepares a chat asynchronously.
// It never creates a session itself or sends a message on page load.
export function createChatConnection({
  isOpen, launch, close, focus, show, hide, slow,
  setTimer = setTimeout, clearTimer = clearTimeout
}) {
  let inFlight = false;
  let cancelled = false;
  let timer;

  function begin({ launchWidget = true } = {}) {
    if (isOpen()) {
      focus();
      return;
    }
    const alreadyInFlight = inFlight;
    cancelled = false;
    show();
    clearTimer(timer);
    inFlight = true;
    timer = setTimer(() => {
      if (inFlight && !cancelled) slow();
    }, 15000);
    if (launchWidget && !alreadyInFlight) launch();
  }

  function sync() {
    if (!inFlight || !isOpen()) return;
    clearTimer(timer);
    inFlight = false;
    hide();
    if (cancelled) close();
    else focus();
    cancelled = false;
  }

  return {
    begin,
    sync,
    cancel() {
      cancelled = true;
      hide();
    },
    retry() {
      // The vendor guards a request already in progress. After a failed
      // request, this also lets its normal launcher start a new attempt.
      clearTimer(timer);
      inFlight = false;
      begin();
    }
  };
}
