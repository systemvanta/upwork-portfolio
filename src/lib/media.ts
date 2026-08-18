export type MediaKind = "image" | "video";

export type DemoMedia = {
  id: string;
  kind: string;
  src: string;
  caption: string;
  sortOrder: number;
};

export function youtubeId(src: string) {
  try {
    const url = new URL(src);
    if (url.hostname === "youtu.be" || url.hostname === "www.youtu.be") {
      return url.pathname.replace("/", "") || null;
    }
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      if (url.pathname.startsWith("/embed/")) {
        return url.pathname.split("/")[2] || null;
      }
      if (url.pathname.startsWith("/shorts/")) {
        return url.pathname.split("/")[2] || null;
      }
      return url.searchParams.get("v");
    }
  } catch {
    return null;
  }
  return null;
}

export function vimeoId(src: string) {
  try {
    const url = new URL(src);
    if (url.hostname.replace(/^www\./, "") !== "vimeo.com") return null;
    const match = url.pathname.match(/\/(?:video\/)?(\d+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function isDirectVideo(src: string) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(src);
}

export function mediaKindFromSrc(src: string): MediaKind {
  if (youtubeId(src) || vimeoId(src) || isDirectVideo(src)) return "video";
  return "image";
}

export function embedSrc(src: string) {
  const yt = youtubeId(src);
  if (yt) return `https://www.youtube.com/embed/${yt}`;
  const vimeo = vimeoId(src);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo}`;
  return src;
}

export function posterSrc(item: Pick<DemoMedia, "kind" | "src">) {
  if (item.kind === "image") return item.src;
  const yt = youtubeId(item.src);
  if (yt) return `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`;
  return null;
}

export function demosForProject(project: {
  media: DemoMedia[];
  liveUrl?: string | null;
}): DemoMedia[] {
  return project.media;
}

export function isLocalUpload(src: string) {
  return src.startsWith("/uploads/");
}

export function isBlobUpload(src: string) {
  try {
    const host = new URL(src).hostname;
    return host.endsWith(".blob.vercel-storage.com") || host === "blob.vercel-storage.com";
  } catch {
    return false;
  }
}

export function parseDemoUrls(formData: FormData) {
  return String(formData.get("demoUrls") ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((src) => {
      let url: URL;
      try {
        url = new URL(src);
      } catch {
        throw new Error(`Not a valid demo URL: ${src}`);
      }
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error("Demo URLs must start with http:// or https://");
      }
      return { kind: mediaKindFromSrc(src), src };
    });
}

export function parseKeepMediaIds(formData: FormData) {
  return formData
    .getAll("keepMedia")
    .map((value) => String(value).trim())
    .filter(Boolean);
}

export function parseDemoFiles(formData: FormData) {
  return formData
    .getAll("demoFiles")
    .filter((value): value is File => value instanceof File && value.size > 0);
}
