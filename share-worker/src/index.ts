/**
 * Recordly Share Worker
 * Cloudflare Worker + R2 for hosting and sharing screen recordings.
 */

interface Env {
  VIDEOS: R2Bucket;
  SHARE_SECRET: string;
  SHARE_DOMAIN: string;
}

const ID_LENGTH = 8;
const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

function generateId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(ID_LENGTH));
  return Array.from(bytes, (b) => CHARS[b % CHARS.length]).join("");
}

function authorize(request: Request, env: Env): boolean {
  const header = request.headers.get("Authorization");
  if (!header) return false;
  const token = header.replace(/^Bearer\s+/i, "");
  return token === env.SHARE_SECRET;
}

function corsHeaders(origin?: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data: unknown, status = 200, extra?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(), ...extra },
  });
}

function playerPage(id: string, domain: string): string {
  const videoUrl = `${domain}/${id}/raw`;
  const pageUrl = `${domain}/${id}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Recordly — Shared Recording</title>
  <meta property="og:title" content="Shared Recording">
  <meta property="og:type" content="video.other">
  <meta property="og:video" content="${videoUrl}">
  <meta property="og:video:type" content="video/mp4">
  <meta property="og:video:width" content="1920">
  <meta property="og:video:height" content="1080">
  <meta property="og:url" content="${pageUrl}">
  <meta name="twitter:card" content="player">
  <meta name="twitter:player" content="${pageUrl}">
  <meta name="twitter:player:width" content="1920">
  <meta name="twitter:player:height" content="1080">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#09090b;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh}
    .container{width:100%;max-width:1200px;padding:1rem}
    video{width:100%;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,.5);background:#000}
    .branding{position:fixed;bottom:1rem;right:1rem;font-size:.75rem;color:#475569;text-decoration:none;opacity:.6;transition:opacity .2s}
    .branding:hover{opacity:1}
  </style>
</head>
<body>
  <div class="container">
    <video controls autoplay playsinline preload="metadata">
      <source src="${videoUrl}" type="video/mp4">
      Your browser does not support the video tag.
    </video>
  </div>
  <a class="branding" href="https://recordly.dev" target="_blank" rel="noopener">Made with Recordly</a>
</body>
</html>`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // PUT /upload — upload a video
    if (request.method === "PUT" && url.pathname === "/upload") {
      if (!authorize(request, env)) {
        return json({ error: "Unauthorized" }, 401);
      }
      const body = request.body;
      if (!body) return json({ error: "No body" }, 400);

      const contentType = request.headers.get("Content-Type") || "video/mp4";
      const id = generateId();
      const key = `${id}.mp4`;

      await env.VIDEOS.put(key, body, {
        httpMetadata: { contentType },
        customMetadata: {
          uploadedAt: new Date().toISOString(),
          originalName: request.headers.get("X-Filename") || "recording.mp4",
        },
      });

      const shareUrl = `${env.SHARE_DOMAIN}/${id}`;
      return json({ id, url: shareUrl, raw: `${shareUrl}/raw` }, 201);
    }

    // Route: /:id or /:id/raw
    const match = url.pathname.match(/^\/([a-z0-9]{6,12})(\/raw)?$/);
    if (!match) {
      return new Response("Not found", { status: 404 });
    }

    const [, id, isRaw] = match;
    const key = `${id}.mp4`;

    // DELETE /:id
    if (request.method === "DELETE") {
      if (!authorize(request, env)) {
        return json({ error: "Unauthorized" }, 401);
      }
      const obj = await env.VIDEOS.head(key);
      if (!obj) return json({ error: "Not found" }, 404);
      await env.VIDEOS.delete(key);
      return json({ deleted: true });
    }

    // GET /:id/raw — serve MP4 directly
    if (request.method === "GET" && isRaw) {
      const obj = await env.VIDEOS.get(key);
      if (!obj) return new Response("Not found", { status: 404 });

      const headers = new Headers();
      headers.set("Content-Type", "video/mp4");
      headers.set("Content-Disposition", `inline; filename="${id}.mp4"`);
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      headers.set("Accept-Ranges", "bytes");
      for (const [k, v] of Object.entries(corsHeaders(origin))) headers.set(k, v);

      return new Response(obj.body, { headers });
    }

    // GET /:id — serve player page
    if (request.method === "GET") {
      const obj = await env.VIDEOS.head(key);
      if (!obj) return new Response("Not found", { status: 404 });

      return new Response(playerPage(id, env.SHARE_DOMAIN), {
        headers: {
          "Content-Type": "text/html;charset=utf-8",
          "Cache-Control": "public, max-age=3600",
          ...corsHeaders(origin),
        },
      });
    }

    return new Response("Method not allowed", { status: 405 });
  },
};
