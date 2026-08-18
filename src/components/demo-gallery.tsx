"use client";

import { useState } from "react";
import { embedSrc, isDirectVideo, posterSrc, youtubeId, type DemoMedia } from "@/lib/media";

export function DemoGallery({ media }: { media: DemoMedia[] }) {
  if (media.length === 0) return null;

  return (
    <section className="mt-10">
      <p className="kicker">Demo</p>
      <ul className="mt-4 grid gap-3">
        {media.map((item) => (
          <DemoGalleryItem key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}

function DemoGalleryItem({ item }: { item: DemoMedia }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <li className="overflow-hidden rounded-[18px] bg-paper-deep ring-1 ring-line">
      <DemoFrame item={item} onError={() => setFailed(true)} />
    </li>
  );
}

export function DemoThumb({
  media,
  title,
  size = "compact",
}: {
  media: DemoMedia[];
  title: string;
  size?: "compact" | "large";
}) {
  const first = media[0];
  const frame =
    size === "large"
      ? "aspect-[4/5] rounded-[18px] sm:aspect-[3/4]"
      : "aspect-video rounded-[14px]";

  const [failed, setFailed] = useState(false);
  if (!first || failed) return null;

  const poster = posterSrc(first);
  return (
    <div className={`relative overflow-hidden bg-elevated ${frame}`}>
      {poster ? (
        <DemoImage
          src={poster}
          alt=""
          className="h-full w-full object-cover object-top"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="grid h-full place-items-center text-[12px] text-mist">
          Video demo
        </div>
      )}
      {first.kind === "video" ? (
        <span className="absolute bottom-3 left-3 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white">
          Video
        </span>
      ) : media.length > 1 ? (
        <span className="absolute bottom-3 left-3 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white">
          {media.length} demos
        </span>
      ) : null}
    </div>
  );
}

function DemoFrame({
  item,
  onError,
}: {
  item: DemoMedia;
  onError?: () => void;
}) {
  const yt = youtubeId(item.src);
  const embed = embedSrc(item.src);

  if (item.kind === "video" && (yt || embed !== item.src)) {
    return (
      <div className="aspect-video bg-black">
        <iframe
          src={embed}
          title="Project demo"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }

  if (item.kind === "video" || isDirectVideo(item.src)) {
    return (
      <video
        src={item.src}
        controls
        playsInline
        preload="metadata"
        className="aspect-video w-full bg-black object-contain"
      >
        Your browser does not support this video.
      </video>
    );
  }

  return (
    <DemoImage
      src={item.src}
      alt=""
      className="h-auto w-full"
      onError={onError}
    />
  );
}

function DemoImage({
  src,
  alt,
  className,
  onError,
}: {
  src: string;
  alt: string;
  className?: string;
  onError?: () => void;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} onError={onError} />
  );
}
