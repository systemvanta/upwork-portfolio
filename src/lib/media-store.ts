import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { del, put } from "@vercel/blob";
import { isBlobUpload, isLocalUpload, type MediaKind } from "@/lib/media";

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

const VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

const MIME_FROM_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 40 * 1024 * 1024;

const uploadsRoot = path.join(process.cwd(), "public", "uploads");

function kindFromMime(type: string): MediaKind | null {
  if (type in IMAGE_TYPES) return "image";
  if (type in VIDEO_TYPES) return "video";
  return null;
}

function extForMime(type: string) {
  return IMAGE_TYPES[type] ?? VIDEO_TYPES[type] ?? "bin";
}

export function usesBlobStorage() {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      process.env.BLOB_STORE_ID ||
      process.env.VERCEL,
  );
}

function objectPath(projectId: string, filename: string) {
  return `projects/${projectId}/${filename}`;
}

async function putBlob(pathname: string, body: Buffer | File, contentType: string) {
  const blob = await put(pathname, body, {
    access: "public",
    addRandomSuffix: false,
    contentType,
  });
  return blob.url;
}

async function saveLocalFile(projectId: string, filename: string, body: Buffer) {
  const dir = path.join(uploadsRoot, projectId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), body);
  return `/uploads/${projectId}/${filename}`;
}

export async function saveUploadFile(projectId: string, file: File) {
  const kind = kindFromMime(file.type);
  if (!kind) {
    throw new Error("Demos must be JPEG, PNG, WebP, GIF, AVIF, MP4, WebM, or MOV.");
  }
  const max = kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (file.size > max) {
    throw new Error(
      kind === "image"
        ? "Images must be 8 MB or smaller."
        : "Videos must be 40 MB or smaller.",
    );
  }

  const filename = `${randomUUID()}.${extForMime(file.type)}`;
  if (usesBlobStorage()) {
    const src = await putBlob(objectPath(projectId, filename), file, file.type);
    return { kind, src };
  }

  const src = await saveLocalFile(
    projectId,
    filename,
    Buffer.from(await file.arrayBuffer()),
  );
  return { kind, src };
}

export async function saveBufferUpload(
  projectId: string,
  buffer: Buffer,
  ext: string,
  kind: MediaKind,
) {
  const filename = `${randomUUID()}.${ext}`;
  const contentType = MIME_FROM_EXT[ext] ?? "application/octet-stream";
  if (usesBlobStorage()) {
    const src = await putBlob(objectPath(projectId, filename), buffer, contentType);
    return { kind, src };
  }
  const src = await saveLocalFile(projectId, filename, buffer);
  return { kind, src };
}

export async function removeStoredUpload(src: string) {
  if (isBlobUpload(src)) {
    try {
      await del(src);
    } catch {
      // Blob may already be gone.
    }
    return;
  }

  if (!isLocalUpload(src)) return;
  const relative = src.replace(/^\/uploads\//, "");
  const filePath = path.join(uploadsRoot, relative);
  if (!filePath.startsWith(uploadsRoot)) return;
  try {
    await unlink(filePath);
  } catch {
    // File may already be gone.
  }
}

/** @deprecated use removeStoredUpload */
export const removeLocalUpload = removeStoredUpload;
