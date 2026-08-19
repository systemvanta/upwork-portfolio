const DEFAULT_GALLERY = "https://createtoday.io/examples?platform=shopify";

export type CreateTodayDemo = {
  title: string;
  liveUrl: string;
  imageUrl: string;
  description: string;
};

export function normalizeKey(value: string) {
  return value
    .toLowerCase()
    .replace(/®/g, "")
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

export async function loadCreateTodayGallery(
  galleryUrl: string,
): Promise<CreateTodayDemo[]> {
  const response = await fetch(galleryUrl, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`Could not load Create Today gallery (${response.status})`);
  }

  const html = await response.text();
  const scripts = [
    ...html.matchAll(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
    ),
  ].map((match) => match[1].trim());

  let items: {
    item?: {
      name?: string;
      url?: string;
      description?: string;
      image?: { contentUrl?: string };
    };
  }[] = [];

  for (const raw of scripts) {
    try {
      const data = JSON.parse(raw) as {
        mainEntity?: { itemListElement?: typeof items };
        itemListElement?: typeof items;
      };
      const list =
        data.mainEntity?.itemListElement ?? data.itemListElement ?? [];
      if (list.length > 0) {
        items = list;
        break;
      }
    } catch {
      continue;
    }
  }

  if (items.length === 0) {
    throw new Error("Create Today page had no JSON-LD gallery data.");
  }

  return items.flatMap((entry) => {
    const item = entry.item;
    const imageUrl = item?.image?.contentUrl;
    if (!item?.name || !item.url || !imageUrl) return [];
    return [
      {
        title: item.name,
        liveUrl: item.url,
        description: item.description ?? "",
        imageUrl: `${imageUrl}?w=1400&q=80&auto=format`,
      },
    ];
  });
}

export async function loadCreateTodayShopifyDemos() {
  return loadCreateTodayGallery(DEFAULT_GALLERY);
}

export async function loadCreateTodayGalleryPages(baseUrl: string) {
  const seen = new Set<string>();
  const all: CreateTodayDemo[] = [];
  for (let page = 1; page <= 20; page += 1) {
    const url =
      page === 1
        ? baseUrl
        : `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}page=${page}`;
    let items: CreateTodayDemo[] = [];
    try {
      items = await loadCreateTodayGallery(url);
    } catch {
      break;
    }
    let added = 0;
    for (const item of items) {
      const key = normalizeKey(item.liveUrl);
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(item);
      added += 1;
    }
    if (added === 0 || items.length < 30) break;
  }
  return all;
}

export async function downloadDemoImage(imageUrl: string) {
  const candidates = imageCandidates(imageUrl);
  for (const candidate of candidates) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const image = await tryDownloadDemoImage(candidate);
      if (image) return image;
      await sleep(1200 * (attempt + 1));
    }
  }
  return null;
}

function imageCandidates(imageUrl: string) {
  const urls = [imageUrl];
  const archived = imageUrl.match(
    /https?:\/\/web\.archive\.org\/web\/\d+(?:im_)?\/(https?:\/\/.*)/,
  );
  if (archived?.[1] && !urls.includes(archived[1])) urls.push(archived[1]);
  return urls;
}

async function tryDownloadDemoImage(imageUrl: string) {
  const headers: Record<string, string> = {
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    accept: "image/avif,image/webp,image/*,*/*;q=0.8",
  };
  if (imageUrl.includes("sanity.io") || imageUrl.includes("createtoday.io")) {
    headers.referer = "https://createtoday.io/";
  } else if (imageUrl.includes("web.archive.org") || imageUrl.includes("neliosoftware.com")) {
    headers.referer = "https://web.archive.org/";
  } else if (imageUrl.includes("younify.eu") || imageUrl.includes("younify.nl")) {
    headers.referer = "https://www.younify.eu/";
  } else if (imageUrl.includes("proproductswebdevelopment.com")) {
    headers.referer = "https://www.proproductswebdevelopment.com/portfolio.htm";
  } else if (imageUrl.includes("dotcomweavers.com")) {
    headers.referer = "https://www.dotcomweavers.com/portfolio/";
  } else if (
    imageUrl.includes("blob.vercel-storage.com") ||
    imageUrl.includes("image.mux.com") ||
    imageUrl.includes("framer.com") ||
    imageUrl.includes("framerusercontent.com")
  ) {
    headers.referer = "https://www.framer.com/community/gallery/";
  } else if (
    imageUrl.includes("madewithlovable.com") ||
    imageUrl.includes("madewith-app-prod-bucket")
  ) {
    headers.referer = "https://madewithlovable.com/";
  }

  try {
    const response = await fetch(imageUrl, {
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) return null;
    const type = response.headers.get("content-type") ?? "";
    if (type.includes("text/html")) return null;
    const ext = extFromType(type, imageUrl);
    if (!ext) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 4000) return null;
    return { buffer, ext, kind: "image" as const };
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extFromType(type: string, url: string) {
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("avif")) return "avif";
  if (url.includes(".webp")) return "webp";
  if (url.includes(".png")) return "png";
  if (url.includes(".jpg") || url.includes(".jpeg")) return "jpg";
  return null;
}
