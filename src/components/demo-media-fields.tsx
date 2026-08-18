"use client";

import { useState } from "react";
import { posterSrc, type DemoMedia } from "@/lib/media";

export function DemoMediaFields({ existing = [] }: { existing?: DemoMedia[] }) {
  const [files, setFiles] = useState<File[]>([]);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const kept = existing.filter((item) => !removed.has(item.id));

  return (
    <fieldset className="space-y-4">
      <legend className="kicker">Demo</legend>
      <p className="text-[15px] leading-6 text-ink-dim">
        Every portfolio needs at least one screenshot, photo, or video. Upload
        files or paste YouTube, Vimeo, or direct media URLs.
      </p>

      {existing.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {existing.map((item) => {
            const keep = !removed.has(item.id);
            const poster = posterSrc(item);
            return (
              <li
                key={item.id}
                className={`overflow-hidden rounded-[14px] bg-fill ${keep ? "" : "opacity-40"}`}
              >
                {keep ? <input type="hidden" name="keepMedia" value={item.id} /> : null}
                <div className="relative aspect-video bg-elevated">
                  {poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={poster}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-sm text-mist">
                      Video
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="truncate text-[13px] text-ink-dim">
                    {item.kind === "video" ? "Video" : "Image"}
                  </span>
                  <button
                    type="button"
                    className="text-[13px] text-brass hover:underline"
                    onClick={() => {
                      setRemoved((current) => {
                        const next = new Set(current);
                        if (next.has(item.id)) next.delete(item.id);
                        else next.add(item.id);
                        return next;
                      });
                    }}
                  >
                    {keep ? "Remove" : "Keep"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      <label className="block">
        <span className="kicker">Upload pictures or videos</span>
        <input
          name="demoFiles"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime"
          className="field file:mr-3 file:rounded-lg file:border-0 file:bg-brass file:px-3 file:py-1.5 file:text-[13px] file:font-semibold file:text-white"
          onChange={(event) =>
            setFiles(Array.from(event.target.files ?? []).filter((file) => file.size > 0))
          }
        />
      </label>

      {files.length > 0 ? (
        <p className="text-[13px] text-mist">
          {files.length} {files.length === 1 ? "file" : "files"} ready to add
        </p>
      ) : null}

      <label className="block">
        <span className="kicker">Or paste demo URLs</span>
        <textarea
          name="demoUrls"
          rows={3}
          placeholder={"https://youtube.com/watch?v=...\nhttps://example.com/demo.png"}
          className="field resize-y"
        />
      </label>
      <p className="text-[13px] text-mist">
        {kept.length} existing demo{kept.length === 1 ? "" : "s"} kept
        {files.length ? ` · ${files.length} upload${files.length === 1 ? "" : "s"}` : ""}
      </p>
    </fieldset>
  );
}
