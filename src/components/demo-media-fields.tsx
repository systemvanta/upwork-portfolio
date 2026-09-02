"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { posterSrc, type DemoMedia } from "@/lib/media";

type ExistingItem = DemoMedia & { removed?: boolean };

function moveItem<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length || from === to) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function syncFileInput(input: HTMLInputElement | null, files: File[]) {
  if (!input) return;
  const transfer = new DataTransfer();
  for (const file of files) transfer.items.add(file);
  input.files = transfer.files;
}

export function DemoMediaFields({ existing = [] }: { existing?: DemoMedia[] }) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<ExistingItem[]>(() =>
    [...existing].sort((a, b) => a.sortOrder - b.sortOrder),
  );
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const kept = items.filter((item) => !item.removed);

  useEffect(() => {
    const urls = files.map((file) =>
      file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
    );
    setPreviews(urls);
    return () => {
      for (const url of urls) {
        if (url) URL.revokeObjectURL(url);
      }
    };
  }, [files]);

  useEffect(() => {
    syncFileInput(fileInputRef.current, files);
  }, [files]);

  function toggleRemoved(id: string) {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, removed: !item.removed } : item,
      ),
    );
  }

  function moveExisting(id: string, delta: number) {
    setItems((current) => {
      const visible = current.filter((item) => !item.removed);
      const index = visible.findIndex((item) => item.id === id);
      if (index < 0) return current;
      const reordered = moveItem(visible, index, index + delta);
      const removed = current.filter((item) => item.removed);
      return [...reordered, ...removed];
    });
  }

  function moveFile(index: number, delta: number) {
    setFiles((current) => moveItem(current, index, index + delta));
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, i) => i !== index));
  }

  function onPickFiles(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []).filter((file) => file.size > 0);
    setFiles(picked);
  }

  return (
    <fieldset className="space-y-4">
      <legend className="kicker">Demo</legend>
      <p className="text-[15px] leading-6 text-ink-dim">
        Every portfolio needs at least one screenshot, photo, or video. Upload
        files or paste YouTube, Vimeo, or direct media URLs. Use the arrows to
        set display order.
      </p>

      {items.length > 0 ? (
        <ul className="media-order-list">
          {items.map((item) => {
            const keep = !item.removed;
            const poster = posterSrc(item);
            const visibleIndex = keep
              ? kept.findIndex((row) => row.id === item.id)
              : -1;
            return (
              <li
                key={item.id}
                className={`media-order-card${keep ? "" : " is-removed"}`}
              >
                {keep ? (
                  <input type="hidden" name="keepMedia" value={item.id} />
                ) : null}
                <div className="media-order-thumb">
                  {poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={poster} alt="" />
                  ) : (
                    <span>Video</span>
                  )}
                  {keep ? (
                    <span className="media-order-badge">{visibleIndex + 1}</span>
                  ) : null}
                </div>
                <div className="media-order-meta">
                  <p className="media-order-label">
                    {item.kind === "video" ? "Video" : "Image"}
                    {keep ? "" : " · removed"}
                  </p>
                  <div className="media-order-actions">
                    {keep ? (
                      <>
                        <button
                          type="button"
                          className="media-order-btn"
                          aria-label="Move earlier"
                          disabled={visibleIndex <= 0}
                          onClick={() => moveExisting(item.id, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="media-order-btn"
                          aria-label="Move later"
                          disabled={visibleIndex >= kept.length - 1}
                          onClick={() => moveExisting(item.id, 1)}
                        >
                          ↓
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      className="media-order-link"
                      onClick={() => toggleRemoved(item.id)}
                    >
                      {keep ? "Remove" : "Keep"}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      <label className="block" htmlFor={inputId}>
        <span className="kicker">Upload pictures or videos</span>
        <span className="upload">
          <input
            id={inputId}
            ref={fileInputRef}
            name="demoFiles"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime"
            className="upload-input"
            onChange={onPickFiles}
          />
          <span className="upload-cta">
            {files.length > 0
              ? `${files.length} ${files.length === 1 ? "file" : "files"} chosen`
              : "Choose Files"}
          </span>
        </span>
      </label>

      {files.length > 0 ? (
        <ul className="media-order-list">
          {files.map((file, index) => {
            const preview = previews[index];
            const isVideo = file.type.startsWith("video/");
            return (
              <li key={`${file.name}-${file.size}-${file.lastModified}`} className="media-order-card">
                <div className="media-order-thumb">
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="" />
                  ) : (
                    <span>{isVideo ? "Video" : "File"}</span>
                  )}
                  <span className="media-order-badge">{kept.length + index + 1}</span>
                </div>
                <div className="media-order-meta">
                  <p className="media-order-label truncate" title={file.name}>
                    {file.name}
                  </p>
                  <div className="media-order-actions">
                    <button
                      type="button"
                      className="media-order-btn"
                      aria-label="Move earlier"
                      disabled={index === 0}
                      onClick={() => moveFile(index, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="media-order-btn"
                      aria-label="Move later"
                      disabled={index >= files.length - 1}
                      onClick={() => moveFile(index, 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="media-order-link"
                      onClick={() => removeFile(index)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
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
        {" · "}order is saved on submit
      </p>
    </fieldset>
  );
}
