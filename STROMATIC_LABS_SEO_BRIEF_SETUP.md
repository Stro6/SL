# Stromatic Labs SEO Brief Beta Setup

This repo now includes a "Try the SEO Brief autopilot" section on the homepage.

## What was added

- New form section on `index.html` (`#seo-brief`)
- Client-side anti-abuse basics:
  - honeypot field
  - 60-second local cooldown
- Frontend submit handler that posts to:
  - `window.SL_SEO_BRIEF_ENDPOINT` (if set), otherwise
  - `/api/seo-brief`
- Cloudflare Worker relay template:
  - `cloudflare-worker/seo-brief-relay.js`

## Why relay is required

Do **not** call your n8n webhook directly from browser JS if it requires `x-api-key`.
That key would be exposed publicly.

Use a relay endpoint (Worker/Function) that:
- validates origin
- receives browser payload
- forwards to n8n with the secret header

## Cloudflare Worker deployment

1. Create a new Worker and paste `cloudflare-worker/seo-brief-relay.js`.
2. Add Worker secrets:
   - `N8N_WEBHOOK_URL` = your n8n production webhook URL
   - `N8N_API_KEY` = your n8n `x-api-key` value
   - `ALLOWED_ORIGIN` = `https://stromatic.tech`
3. Deploy worker.
4. Copy Worker URL (example: `https://seo-relay.your-subdomain.workers.dev`).

## Connect website to relay

Add this snippet in `index.html` before the main inline script:

```html
<script>
  window.SL_SEO_BRIEF_ENDPOINT = "https://seo-relay.your-subdomain.workers.dev";
</script>
```

Now the homepage form sends requests to the Worker, which forwards to n8n securely.

## n8n payload expected

```json
{
  "business_url": "https://example.com",
  "niche": "dental clinic",
  "location": "Miami, FL",
  "competitors": "competitor1.com, competitor2.com",
  "goal": "rank for emergency dentist miami",
  "client_email": "client@example.com"
}
```

## Optional logging step in n8n

After your `Code`/`IF` nodes, add Google Sheets node:
- Action: Append row
- Columns:
  - `submitted_at`
  - `client_email`
  - `business_url`
  - `niche`
  - `location`
  - `goal`
  - `success`
  - `needs_retry`
  - `primary_keyword`
