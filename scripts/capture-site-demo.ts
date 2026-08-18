export async function captureSiteDemo(pageUrl: string) {
  return fromOpenGraph(pageUrl);
}

async function fromOpenGraph(pageUrl: string) {
  const html = await fetchText(pageUrl);
  if (!html) return null;
  const imageUrl = openGraphImage(html, pageUrl);
  if (!imageUrl) return null;
  return downloadImage(imageUrl);
}

function openGraphImage(html: string, pageUrl: string) {
  const patterns = [
    /property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
    /name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match?.[1]) continue;
    try {
      return new URL(match[1], pageUrl).toString();
    } catch {
      continue;
    }
  }
  return null;
}

async function fetchText(url: string) {
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 PortfolioHubBot/1.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

async function downloadImage(url: string) {
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 PortfolioHubBot/1.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return null;
    const type = response.headers.get("content-type") ?? "";
    const ext = extFromType(type);
    if (!ext) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 4000) return null;
    return { buffer, ext, kind: "image" as const };
  } catch {
    return null;
  }
}

function extFromType(type: string) {
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("gif")) return "gif";
  if (type.includes("avif")) return "avif";
  return null;
}
