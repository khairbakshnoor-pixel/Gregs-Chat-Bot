export function initializeChat({ fetchImpl = fetch } = {}) {
  const heroButton = document.getElementById('open-chat-button');
  const floatingButton = document.getElementById('chat-floating-button');
  const panel = document.getElementById('chat-panel');
  const closeButton = document.getElementById('chat-panel-close');
  const messages = document.getElementById('chat-messages');
  const status = document.getElementById('chat-response-status');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const sendButton = document.getElementById('chat-send');
  let chatId;
  let createPromise;
  let sending = false;

  const setExpanded = (expanded) => {
    heroButton.setAttribute('aria-expanded', String(expanded));
    floatingButton?.setAttribute('aria-expanded', String(expanded));
  };

  const appendMessage = (role, content, pending = false) => {
    const message = document.createElement('p');
    message.className = `chat-message chat-message-${role}${pending ? ' is-pending' : ''}`;
    message.textContent = content;
    messages.append(message);
    messages.scrollTop = messages.scrollHeight;
    return message;
  };

  async function request(action, data = {}) {
    const response = await fetchImpl('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Chat is temporarily unavailable.');
    return result;
  }

  function ensureChat() {
    if (chatId) return Promise.resolve(chatId);
    if (!createPromise) {
      createPromise = request('create')
        .then((result) => {
          if (!result.chatId) throw new Error('Could not start the chat. Please try again.');
          chatId = result.chatId;
          status.textContent = '';
          return chatId;
        })
        .catch((error) => {
          createPromise = undefined;
          throw error;
        });
    }
    return createPromise;
  }

  function openPanel() {
    panel.hidden = false;
    setExpanded(true);
    input.focus();
    status.textContent = 'Connecting to Alex...';
    ensureChat().catch((error) => {
      status.textContent = error.message;
    });
  }

  function closePanel() {
    panel.hidden = true;
    setExpanded(false);
    heroButton.focus();
  }

  async function submitMessage(event) {
    event.preventDefault();
    const content = input.value.trim();
    if (!content || sending) return;

    sending = true;
    sendButton.disabled = true;
    input.disabled = true;
    status.textContent = 'Alex is thinking...';
    const userMessage = appendMessage('user', content);
    const pendingMessage = appendMessage('agent', 'Alex is typing...', true);
    input.value = '';

    try {
      const currentChatId = await ensureChat();
      const result = await request('send', { chatId: currentChatId, content });
      pendingMessage.remove();
      for (const message of result.messages || []) {
        if (typeof message.content === 'string' && message.content) appendMessage('agent', message.content);
      }
      if (!result.messages?.length) appendMessage('agent', 'I could not prepare a reply. Please try again.');
      status.textContent = '';
    } catch (error) {
      pendingMessage.remove();
      userMessage.remove();
      input.value = content;
      status.textContent = error.message;
    } finally {
      sending = false;
      sendButton.disabled = false;
      input.disabled = false;
      input.focus();
    }
  }

  heroButton.addEventListener('click', openPanel);
  floatingButton?.addEventListener('click', openPanel);
  closeButton.addEventListener('click', closePanel);
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closePanel();
  });
  form.addEventListener('submit', submitMessage);
}
