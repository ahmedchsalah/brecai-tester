/**
 * Vercel Serverless Function — API Proxy
 *
 * All requests to /api-proxy/* are forwarded server-side to the Laravel
 * Cloud backend.  Because the hop is server-to-server, Cloudflare's __cf_bm
 * cookie restrictions and browser CORS/SameSite issues are completely avoided.
 *
 * Path routing:
 *   /api-proxy/sanctum/*  →  https://<host>/sanctum/*   (Laravel root)
 *   /api-proxy/*          →  https://<host>/api/*        (API prefix)
 */

const BACKEND =
  process.env.VITE_API_URL ||
  'https://breast-cancer-detection-backend-main-p7c9cg.laravel.cloud/api';

// Derive the Laravel root (strip trailing /api segment if present)
const BACKEND_ROOT = BACKEND.replace(/\/api\/?$/, '');

function buildUpstreamUrl(reqUrl) {
  // reqUrl is like /api-proxy/auth/me?foo=bar  or  /api-proxy/sanctum/csrf-cookie
  const withoutPrefix = reqUrl.replace(/^\/api-proxy/, '');

  // Sanctum lives at the root, not under /api
  if (withoutPrefix.startsWith('/sanctum/')) {
    return `${BACKEND_ROOT}${withoutPrefix}`;
  }

  return `${BACKEND}${withoutPrefix}`;
}

// Headers we should NOT forward verbatim
const HOP_BY_HOP = new Set([
  'host', 'connection', 'keep-alive', 'proxy-authenticate',
  'proxy-authorization', 'te', 'trailers', 'transfer-encoding', 'upgrade',
  'content-length', // fetch will recalculate this for the buffered body
]);

export default async function handler(req, res) {
  const upstreamUrl = buildUpstreamUrl(req.url);
  
  console.log(`[Proxy] ${req.method} ${req.url} -> ${upstreamUrl}`);

  // ── Forward safe request headers ────────────────────────────────────────
  const forwardHeaders = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      forwardHeaders[key] = value;
    }
  }
  // Override Host to match the upstream
  forwardHeaders['host'] = new URL(BACKEND_ROOT).host;

  // ── Read body for mutating methods ───────────────────────────────────────
  let body = undefined;
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    body = await new Promise((resolve) => {
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks)));
    });
    if (body.length === 0) body = undefined;
  }

  // ── Proxy the request ────────────────────────────────────────────────────
  let upstreamRes;
  try {
    upstreamRes = await fetch(upstreamUrl, {
      method: req.method,
      headers: forwardHeaders,
      body,
      redirect: 'manual', // let the client follow redirects itself
    });
  } catch (err) {
    console.error(`[Proxy] Fetch failed: ${err}`);
    res.status(502).json({ error: 'Proxy fetch failed', detail: String(err) });
    return;
  }

  console.log(`[Proxy] Upstream response: ${upstreamRes.status}`);

  // ── Forward response headers ─────────────────────────────────────────────
  for (const [key, value] of upstreamRes.headers.entries()) {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      try { res.setHeader(key, value); } catch { /* skip any invalid header */ }
    }
  }

  // Rewrite Set-Cookie: remove upstream domain so the browser stores the
  // cookie on the Vercel origin (brecai-tester.vercel.app)
  const setCookies = upstreamRes.headers.getSetCookie?.() ?? [];
  if (setCookies.length) {
    const rewritten = setCookies.map(c =>
      c
        .replace(/;\s*domain=[^;,]*/gi, '')   // strip domain lock
        .replace(/;\s*SameSite=\w+/gi, '')    // strip upstream SameSite
        + '; SameSite=Lax'                    // re-add appropriate policy
    );
    res.setHeader('Set-Cookie', rewritten);
    console.log(`[Proxy] Rewrote ${rewritten.length} cookies`);
  }

  res.status(upstreamRes.status);

  // ── Stream response body ──────────────────────────────────────────────────
  const buffer = Buffer.from(await upstreamRes.arrayBuffer());
  res.end(buffer);
}
