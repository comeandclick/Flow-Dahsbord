function trim(value) {
  return `${value || ""}`.trim();
}

function escapeHtml(value) {
  return `${value || ""}`
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getOrigin(req) {
  const origin = trim(req.headers.origin);
  const appUrl = trim(process.env.FLOW_APP_URL);
  if (origin && origin.endsWith(".vercel.app")) return origin;
  if (origin && appUrl && origin === appUrl) return origin;
  return appUrl || origin || "*";
}

function setCors(req, res) {
  res.setHeader("Access-Control-Allow-Origin", getOrigin(req));
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Vary", "Origin");
  res.setHeader("Cache-Control", "no-store");
}

function normalizeEndpoint(value) {
  const endpoint = trim(value).replace(/^\/+/, "").replace(/\.json$/i, "");
  if (!endpoint || endpoint.includes("..") || endpoint.includes("://")) {
    throw new Error("Endpoint Shopify invalide");
  }
  return endpoint;
}

async function exchangeToken({ shop, code }) {
  const clientId = trim(process.env.SHOPIFY_CLIENT_ID);
  const clientSecret = trim(process.env.SHOPIFY_CLIENT_SECRET);
  if (!clientId) throw new Error("SHOPIFY_CLIENT_ID manquant");
  if (!clientSecret) throw new Error("SHOPIFY_CLIENT_SECRET manquant");

  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.access_token) {
    throw new Error(payload?.error_description || payload?.error || `OAuth Shopify impossible (${response.status})`);
  }

  return payload.access_token;
}

export async function shopifyProxyHandler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  try {
    const storeDomain = trim(process.env.SHOPIFY_STORE_DOMAIN);
    const accessToken = trim(process.env.SHOPIFY_ACCESS_TOKEN);
    const endpointRaw = trim(req.query.endpoint);

    if (endpointRaw === "__status") {
      res.status(200).json({
        ready: Boolean(storeDomain && accessToken),
        error: !storeDomain
          ? "SHOPIFY_STORE_DOMAIN manquant"
          : !accessToken
            ? "SHOPIFY_ACCESS_TOKEN manquant"
            : "",
      });
      return;
    }

    if (!storeDomain) {
      res.status(200).json({ ready: false, error: "SHOPIFY_STORE_DOMAIN manquant" });
      return;
    }
    if (!accessToken) {
      res.status(200).json({ ready: false, error: "SHOPIFY_ACCESS_TOKEN manquant" });
      return;
    }

    const endpoint = normalizeEndpoint(endpointRaw);
    const params = trim(req.query.params);
    const upstream = `https://${storeDomain}/admin/api/2024-01/${endpoint}.json${params ? `?${params}` : ""}`;

    const response = await fetch(upstream, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const text = await response.text();
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    if (!response.ok) {
      res.status(response.status).send(
        JSON.stringify({
          error: "Shopify API inaccessible",
          status: response.status,
          endpoint,
          details: text,
        }),
      );
      return;
    }

    res.status(200).send(text);
  } catch (error) {
    res.status(500).json({
      error: error?.message || "Erreur Shopify inconnue",
    });
  }
}

export async function shopifyCallbackHandler(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  try {
    const code = trim(req.query.code);
    const shop = trim(req.query.shop) || trim(process.env.SHOPIFY_STORE_DOMAIN);

    if (!shop) {
      throw new Error("Shop manquant");
    }
    if (!code) {
      throw new Error("Code OAuth manquant");
    }

    const accessToken = await exchangeToken({ shop, code });
    const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Shopify Access Token</title>
  </head>
  <body style="margin:0;padding:32px;background:#0b0d10;color:#f5f7fb;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',sans-serif;">
    <h1 style="margin:0 0 16px;font-size:28px;">Token Shopify</h1>
    <p style="margin:0 0 20px;color:rgba(245,247,251,0.68);">Copie ce token et configure ensuite <code>SHOPIFY_ACCESS_TOKEN</code> sur Vercel.</p>
    <pre style="margin:0;padding:20px;border-radius:20px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);white-space:pre-wrap;word-break:break-word;">${escapeHtml(accessToken)}</pre>
  </body>
</html>`;

    res.status(200).send(html);
  } catch (error) {
    res
      .status(500)
      .send(
        `<!doctype html><html lang="fr"><body style="margin:0;padding:32px;background:#120d0d;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',sans-serif;"><h1>Erreur Shopify</h1><pre style="white-space:pre-wrap;">${escapeHtml(error?.message || "Erreur inconnue")}</pre></body></html>`,
      );
  }
}
