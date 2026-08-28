"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { embedSrc, isDirectVideo, posterSrc, youtubeId, type DemoMedia } from "@/lib/media";

export function DemoGallery({ media }: { media: DemoMedia[] }) {
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const [index, setIndex] = useState<number | null>(null);
  const items = media.filter((item) => !failed.has(item.id));

  if (media.length === 0 || items.length === 0) return null;

  return (
    <section className="mt-10">
      <p className="kicker">Demo</p>
      <ul className="demo-strip mt-4">
        {items.map((item, itemIndex) => (
          <li key={item.id} className="demo-tile rise" style={{ animationDelay: `${itemIndex * 80}ms` }}>
            <button
              type="button"
              className="demo-tile-btn"
              onClick={() => setIndex(itemIndex)}
            >
              <DemoThumbCard
                item={item}
                onError={() =>
                  setFailed((current) => {
                    const next = new Set(current);
                    next.add(item.id);
                    return next;
                  })
                }
              />
              {item.kind === "video" ? (
                <span className="demo-badge">Video</span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      {index !== null ? (
        <DemoLightbox
          items={items}
          index={index}
          onClose={() => setIndex(null)}
          onChange={setIndex}
        />
      ) : null}
    </section>
  );
}

function DemoThumbCard({
  item,
  onError,
}: {
  item: DemoMedia;
  onError: () => void;
}) {
  const poster = posterSrc(item);
  if (poster) {
    return (
      <DemoImage
        src={poster}
        alt=""
        className="h-full w-full object-cover object-top"
        onError={onError}
      />
    );
  }
  return (
    <span className="grid h-full place-items-center bg-ink text-[13px] text-white/80">
      Video demo
    </span>
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
      ? "aspect-[4/5] rounded-[16px] ring-1 ring-line sm:aspect-[3/4]"
      : "aspect-video rounded-[14px] ring-1 ring-line";

  const [failed, setFailed] = useState(false);
  if (!first || failed) return null;

  const poster = posterSrc(first);
  return (
    <div className={`relative overflow-hidden bg-elevated ${frame}`}>
      {poster ? (
        <DemoImage
          src={poster}
          alt=""
          className="h-full w-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="grid h-full place-items-center text-[12px] text-mist">
          Video demo
        </div>
      )}
      {first.kind === "video" ? (
        <span className="absolute bottom-3 left-3 rounded-full bg-ink px-2.5 py-1 text-[11px] font-medium text-white">
          Video
        </span>
      ) : media.length > 1 ? (
        <span className="absolute bottom-3 left-3 rounded-full bg-ink px-2.5 py-1 text-[11px] font-medium text-white">
          {media.length} demos
        </span>
      ) : null}
    </div>
  );
}

function DemoLightbox({
  items,
  index,
  onClose,
  onChange,
}: {
  items: DemoMedia[];
  index: number;
  onClose: () => void;
  onChange: (index: number) => void;
}) {
  const item = items[index];
  const total = items.length;
  const canMove = total > 1;

  function go(delta: number) {
    onChange((index + delta + total) % total);
  }

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (total < 2) return;
      if (event.key === "ArrowRight") onChange((index + 1) % total);
      if (event.key === "ArrowLeft") onChange((index - 1 + total) % total);
    }

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [index, total, onClose, onChange]);

  if (!item) return null;

  return createPortal(
    <div className="demo-lightbox" role="dialog" aria-modal="true" aria-label="Demo preview">
      <div className="demo-lightbox-bar">
        <p className="demo-lightbox-count">
          {canMove ? `${index + 1} / ${total}` : "Preview"}
        </p>
        <button type="button" className="demo-lightbox-close" onClick={onClose}>
          Close
        </button>
      </div>
      {canMove ? (
        <button type="button" className="demo-lightbox-nav demo-lightbox-prev" onClick={() => go(-1)}>
          Previous
        </button>
      ) : null}
      <div className="demo-lightbox-stage">
        <DemoFrame key={item.id} item={item} full />
        {item.caption ? <p className="demo-lightbox-caption">{item.caption}</p> : null}
      </div>
      {canMove ? (
        <button type="button" className="demo-lightbox-nav demo-lightbox-next" onClick={() => go(1)}>
          Next
        </button>
      ) : null}
    </div>,
    document.body,
  );
}

function DemoFrame({
  item,
  onError,
  full = false,
}: {
  item: DemoMedia;
  onError?: () => void;
  full?: boolean;
}) {
  const yt = youtubeId(item.src);
  const embed = embedSrc(item.src);
  const src = yt && full ? `${embed}?autoplay=1` : embed;

  if (item.kind === "video" && (yt || embed !== item.src)) {
    return (
      <div className={full ? "demo-lightbox-media" : "aspect-video bg-black"}>
        <iframe
          src={src}
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
        autoPlay={full}
        playsInline
        preload="metadata"
        className={full ? "demo-lightbox-media bg-black object-contain" : "aspect-video w-full bg-black object-contain"}
      >
        Your browser does not support this video.
      </video>
    );
  }

  return (
    <DemoImage
      src={item.src}
      alt=""
      className={full ? "demo-lightbox-media object-contain" : "h-auto w-full"}
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
