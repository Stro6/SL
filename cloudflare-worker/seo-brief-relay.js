/**
 * Cloudflare Worker relay for Stromatic Labs SEO brief requests.
 *
 * Required secrets:
 * - N8N_WEBHOOK_URL: Your n8n production webhook URL
 * - N8N_API_KEY: The x-api-key value configured in n8n webhook auth
 * - ALLOWED_ORIGIN: The website origin allowed to call this worker (e.g. https://stromatic.tech)
 */
export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(env),
      });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405, env);
    }

    const origin = request.headers.get("Origin") || "";
    if (origin !== env.ALLOWED_ORIGIN) {
      return json({ error: "Origin not allowed" }, 403, env);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400, env);
    }

    const required = [
      "business_url",
      "niche",
      "location",
      "competitors",
      "goal",
      "client_email",
    ];

    for (const key of required) {
      if (!payload[key] || typeof payload[key] !== "string") {
        return json({ error: `Missing or invalid field: ${key}` }, 400, env);
      }
    }

    // Fire-and-forget to n8n so website UX stays fast.
    ctx.waitUntil(
      fetch(env.N8N_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.N8N_API_KEY,
        },
        body: JSON.stringify(payload),
      }).then(async (res) => {
        if (!res.ok) {
          console.error("n8n request failed", res.status);
        }
      }).catch((err) => {
        console.error("n8n request error", err && err.message ? err.message : err);
      })
    );

    return json({ ok: true, queued: true }, 202, env);
  },
};

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data, status, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(env),
    },
  });
}
