export const runtime = "nodejs";

function clampText(value, max = 2000) {
  return `${value || ""}`.trim().slice(0, max);
}

function decodeHtml(value) {
  return `${value || ""}`
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractMeta(html, pattern) {
  const match = html.match(pattern);
  return decodeHtml(match?.[1] || "");
}

function absolutize(baseUrl, value) {
  if (!value) return "";
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return "";
  }
}

function getYoutubeThumb(url) {
  try {
    const parsed = new URL(url);
    const videoId = parsed.hostname.includes("youtu.be")
      ? parsed.pathname.slice(1)
      : parsed.searchParams.get("v") || (parsed.pathname.startsWith("/shorts/") ? parsed.pathname.split("/")[2] : "");
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "";
  } catch {
    return "";
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawUrl = searchParams.get("url") || "";
    let parsedUrl;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      return Response.json({ error: "URL invalide" }, { status: 400 });
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return Response.json({ error: "URL invalide" }, { status: 400 });
    }

    const hostname = parsedUrl.hostname.replace(/^www\./, "");
    const youtubeThumb = getYoutubeThumb(parsedUrl.toString());
    const imageLike = /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(parsedUrl.pathname);

    let html = "";
    try {
      const response = await fetch(parsedUrl, {
        redirect: "follow",
        signal: AbortSignal.timeout(6000),
        headers: {
          "User-Agent": "FlowPreviewBot/1.0",
          Accept: "text/html,application/xhtml+xml",
        },
      });
      html = response.ok ? await response.text() : "";
    } catch {}

    const title = clampText(
      extractMeta(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
      || extractMeta(html, /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i)
      || extractMeta(html, /<title>([^<]+)<\/title>/i)
      || hostname,
      180,
    );
    const description = clampText(
      extractMeta(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
      || extractMeta(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i),
      600,
    );
    const coverUrl = clampText(
      absolutize(parsedUrl, extractMeta(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i))
      || absolutize(parsedUrl, extractMeta(html, /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i))
      || youtubeThumb
      || (imageLike ? parsedUrl.toString() : ""),
      2000,
    );
    const sourceLabel = clampText(
      extractMeta(html, /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i) || hostname,
      120,
    );

    return Response.json({
      preview: {
        title,
        description,
        coverUrl,
        sourceLabel,
        mediaKind: youtubeThumb ? "video" : imageLike ? "image" : "link",
        hostname,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message || "Aperçu impossible" }, { status: 500 });
  }
}
