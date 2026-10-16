# G. Batista / Alex chat

Static site with a server-side Retell chat proxy. Requires Node.js 22 or newer; no npm dependencies are needed.

## Local development

1. Copy `.env.example` to `.env` if you do not already have `.env`.
2. Set `RETELL_API_KEY` to your Retell **private API key**. Keep it only in `.env`.
3. Run `npm run dev` and open `http://127.0.0.1:5177`.

Reload the browser after edits. The development server rebuilds the page on reload.
Use this server instead of opening the source HTML directly or serving the project root with Live Server: the environment configuration must be generated first.

## Vercel deployment

In the existing Vercel project's Settings > Environment Variables, add `RETELL_API_KEY` and `RETELL_CHAT_AGENT_ID`. Enable them for the deployment environments you use, then redeploy.

`vercel.json` sets `npm run build` and the `dist` output directory. The build publishes only the page and image/client assets; `.env` and the API key are not published. `/api/chat` sends authenticated requests to Retell from the server.

Never put the private key in HTML or browser JavaScript. The chat panel opens immediately; session creation and replies still depend on the Retell API response time.

## Opening behavior and images

- The logo uses lossless `image.webp` (20,866 bytes instead of the 34,833-byte PNG).
- The hero button displays the chat panel immediately, then creates a session through `/api/chat`.
- No conversation is created or message sent automatically on page load.

Run `npm test` for API and build checks.
