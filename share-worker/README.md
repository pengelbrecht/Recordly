# Recordly Share Worker

Cloudflare Worker + R2 backend for sharing Recordly screen recordings via short URLs.

## Setup

### 1. Create R2 Bucket

```bash
wrangler r2 bucket create recordly-videos
```

### 2. Set Secrets

```bash
# Generate a random secret for upload auth
wrangler secret put SHARE_SECRET
```

### 3. Configure Domain

Edit `wrangler.toml` and set `SHARE_DOMAIN` to your custom domain (e.g. `https://share.recordly.dev`).

Add the custom domain in the Cloudflare dashboard under Workers → your worker → Settings → Domains & Routes.

### 4. Deploy

```bash
npm install
npm run deploy
```

## API

### Upload a Video

```bash
curl -X PUT https://share.recordly.dev/upload \
  -H "Authorization: Bearer YOUR_SECRET" \
  -H "Content-Type: video/mp4" \
  -H "X-Filename: my-recording.mp4" \
  --data-binary @recording.mp4
```

Response:
```json
{
  "id": "abc12def",
  "url": "https://share.recordly.dev/abc12def",
  "raw": "https://share.recordly.dev/abc12def/raw"
}
```

### View a Video

Open `https://share.recordly.dev/<id>` in a browser — shows a clean player page with OG tags for social previews.

### Get Raw MP4

`GET https://share.recordly.dev/<id>/raw` — returns the MP4 directly.

### Delete a Video

```bash
curl -X DELETE https://share.recordly.dev/abc12def \
  -H "Authorization: Bearer YOUR_SECRET"
```

## Development

```bash
npm install
npm run dev
```
