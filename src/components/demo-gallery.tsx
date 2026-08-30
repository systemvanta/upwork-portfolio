"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ParallaxFrame } from "@/components/parallax-frame";
import { embedSrc, isDirectVideo, posterSrc, youtubeId, type DemoMedia } from "@/lib/media";

function showcaseLayout(count: number) {
  if (count <= 1) return "solo";
  if (count === 2) return "duo";
  if (count === 3) return "trio";
  return "mosaic";
}

export function DemoGallery({
  media,
  variant = "default",
}: {
  media: DemoMedia[];
  variant?: "default" | "case";
}) {
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const [index, setIndex] = useState<number | null>(null);
  const items = media.filter((item) => !failed.has(item.id));

  if (media.length === 0 || items.length === 0) return null;

  function markFailed(id: string) {
    setFailed((current) => {
      const next = new Set(current);
      next.add(id);
      return next;
    });
  }

  if (variant === "case") {
    const layout = showcaseLayout(items.length);
    return (
      <section className="case-showcase" aria-label="Project demo">
        <p className="case-kicker">Demo</p>
        <ParallaxFrame className={`case-showcase-grid case-showcase-grid--${layout}`}>
          {items.map((item, itemIndex) => (
            <button
              key={item.id}
              type="button"
              className={`case-shot${itemIndex === 0 ? " case-shot--primary" : " case-shot--support"}`}
              aria-label={`Open demo preview ${itemIndex + 1}`}
              onClick={() => setIndex(itemIndex)}
            >
              <DemoThumbCard
                item={item}
                contain
                loading={itemIndex === 0 ? "eager" : "lazy"}
                onError={() => markFailed(item.id)}
              />
              {item.kind === "video" ? <span className="demo-badge">Video</span> : null}
            </button>
          ))}
        </ParallaxFrame>
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

  return (
    <section className="mt-10">
      <p className="kicker">Demo</p>
      <ul className="demo-strip mt-4">
        {items.map((item, itemIndex) => (
          <li key={item.id} className="demo-tile rise" style={{ animationDelay: `${itemIndex * 80}ms` }}>
            <button
              type="button"
              className="demo-tile-btn"
              aria-label={`Open demo preview ${itemIndex + 1}`}
              onClick={() => setIndex(itemIndex)}
            >
              <DemoThumbCard item={item} onError={() => markFailed(item.id)} />
              {item.kind === "video" ? <span className="demo-badge">Video</span> : null}
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
  contain = false,
  loading = "lazy",
}: {
  item: DemoMedia;
  onError: () => void;
  contain?: boolean;
  loading?: "lazy" | "eager";
}) {
  const poster = posterSrc(item);
  if (poster) {
    return (
      <DemoImage
        src={poster}
        alt=""
        loading={loading}
        className={contain ? "case-shot-media" : "h-full w-full object-cover object-top"}
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
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    }

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [index, total, onClose, onChange]);

  const item = items[index];
  if (!item) return null;

  return createPortal(
    <div className="demo-lightbox" role="dialog" aria-modal="true" aria-label="Demo preview">
      <div className="demo-lightbox-bar">
        <p className="demo-lightbox-count">
          {canMove ? (
            <>
              <span className="demo-lightbox-count-num">{index + 1}</span>
              <span className="demo-lightbox-count-sep">/</span>
              <span>{total}</span>
            </>
          ) : (
            "Preview"
          )}
        </p>
        <button type="button" className="demo-lightbox-close demo-lightbox-ctrl" onClick={onClose}>
          <LightboxIconClose />
          <span>Close</span>
        </button>
      </div>
      {canMove ? (
        <button
          type="button"
          className="demo-lightbox-nav demo-lightbox-prev demo-lightbox-ctrl"
          onClick={() => go(-1)}
          aria-label="Previous demo"
        >
          <LightboxIconPrev />
        </button>
      ) : null}
      <div className="demo-lightbox-stage">
        <div
          className="demo-lightbox-track"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {items.map((slide, slideIndex) => (
            <div key={slide.id} className="demo-lightbox-slide">
              <DemoFrame item={slide} full={slideIndex === index} />
              {slide.caption ? (
                <p className="demo-lightbox-caption">{slide.caption}</p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
      {canMove ? (
        <button
          type="button"
          className="demo-lightbox-nav demo-lightbox-next demo-lightbox-ctrl"
          onClick={() => go(1)}
          aria-label="Next demo"
        >
          <LightboxIconNext />
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
  loading = "lazy",
}: {
  src: string;
  alt: string;
  className?: string;
  onError?: () => void;
  loading?: "lazy" | "eager";
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} loading={loading} onError={onError} />
  );
}

function LightboxIconPrev() {
  return (
    <svg viewBox="0 0 24 24" className="demo-lightbox-icon" aria-hidden>
      <path
        d="M15 6l-6 6 6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LightboxIconNext() {
  return (
    <svg viewBox="0 0 24 24" className="demo-lightbox-icon" aria-hidden>
      <path
        d="M9 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LightboxIconClose() {
  return (
    <svg viewBox="0 0 24 24" className="demo-lightbox-icon demo-lightbox-icon-close" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
