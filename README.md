# G. Batista / Alex chat

Static website with the Retell chat widget. Requires Node.js 22 or newer; no npm dependencies are needed.

## Local development

1. Copy `.env.example` to `.env` if you do not already have `.env`.
2. Set `RETELL_PUBLIC_KEY` to your Retell **public widget key**.
3. Run `npm run dev` and open `http://127.0.0.1:5177`.

Reload the browser after edits. The development server rebuilds the page on reload.
Use this server instead of opening the source HTML directly or serving the project root with Live Server: the environment configuration must be generated first.

## Vercel deployment

In the existing Vercel project's Settings > Environment Variables, add `RETELL_PUBLIC_KEY` using the value in your local `.env`. Enable it for the deployment environments you use, then redeploy.

`vercel.json` sets `npm run build` and the `dist` output directory. The build publishes only the website assets and a generated `widget-config.js`; `.env`, tests, scripts, and the original PNG are not published. A missing or invalid public key fails the build without printing the key.

**A public widget key is not a secret.** Moving it to `.env` removes it from tracked HTML/source, but the browser still receives it in the generated configuration and Retell requests. This is how the official Retell widget works. Never use a private Retell API key for `RETELL_PUBLIC_KEY`. Keeping credentials entirely server-side would require a backend and a different chat integration.

Official references: [Retell website widget](https://docs.retellai.com/deploy/chat-widget), [Vercel environment variables](https://vercel.com/docs/environment-variables).

## Opening behavior and images

- The logo uses lossless `image.webp` (20,866 bytes instead of the 34,833-byte PNG).
- Preconnection and module preload start the Retell network work earlier.
- Clicking the hero button, circle, or greeting immediately displays a connecting panel while Retell creates/resumes the conversation. This improves feedback; it does not remove Retell's API response time.
- The real widget replaces that panel when ready. Close/Escape dismiss it, including a chat that finishes opening later. A slow connection offers a retry after 15 seconds.
- No conversation is created or message sent automatically on page load.

Run `npm test` for connection-state checks and build validation.
