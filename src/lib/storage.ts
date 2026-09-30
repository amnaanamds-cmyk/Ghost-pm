import "server-only";
import { UserError } from "@/lib/action-result";
import { DeleteObjectsCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Screenshot storage.
 * - With S3_* env vars (AWS S3, Cloudflare R2, MinIO…): images go to a private bucket and the DB
 *   stores a reference like "s3:captures/<workspace>/<capture>.png".
 * - Without them: the base64 data URL is stored in Postgres (fine for small deployments).
 */
const S3_PREFIX = "s3:";

const cfg = () => ({
  bucket: process.env.S3_BUCKET,
  region: process.env.S3_REGION || "auto",
  endpoint: process.env.S3_ENDPOINT || undefined,
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
});

export const objectStorageEnabled = () => {
  const c = cfg();
  return Boolean(c.bucket && c.accessKeyId && c.secretAccessKey);
};

let s3: S3Client | null = null;
function client() {
  const c = cfg();
  s3 ??= new S3Client({
    region: c.region,
    endpoint: c.endpoint,
    // Path-style URLs work for R2, MinIO and custom endpoints; AWS handles both.
    forcePathStyle: Boolean(c.endpoint),
    credentials: { accessKeyId: c.accessKeyId!, secretAccessKey: c.secretAccessKey! },
  });
  return s3;
}

function parseDataUrl(dataUrl: string) {
  const m = dataUrl.match(/^data:(image\/(png|jpeg|gif|webp));base64,(.+)$/);
  if (!m) throw new UserError("Unsupported image");
  return { contentType: m[1], ext: m[2] === "jpeg" ? "jpg" : m[2], bytes: Buffer.from(m[3], "base64") };
}

/** Persists an uploaded screenshot and returns the value to store in Capture.imageUrl. */
export async function storeImage(dataUrl: string, keyBase: string): Promise<string> {
  if (!objectStorageEnabled()) return dataUrl;
  const { contentType, ext, bytes } = parseDataUrl(dataUrl);
  const key = `${keyBase}.${ext}`;
  await client().send(
    new PutObjectCommand({ Bucket: cfg().bucket, Key: key, Body: bytes, ContentType: contentType })
  );
  return `${S3_PREFIX}${key}`;
}

/** Reads a stored image as raw bytes (for serving) — works for both storage modes. */
export async function readImage(ref: string): Promise<{ bytes: Buffer; contentType: string } | null> {
  if (ref.startsWith("data:")) {
    const { bytes, contentType } = parseDataUrl(ref);
    return { bytes, contentType };
  }
  if (!ref.startsWith(S3_PREFIX) || !objectStorageEnabled()) return null;
  try {
    const obj = await client().send(new GetObjectCommand({ Bucket: cfg().bucket, Key: ref.slice(S3_PREFIX.length) }));
    const bytes = Buffer.from(await obj.Body!.transformToByteArray());
    return { bytes, contentType: obj.ContentType || "image/png" };
  } catch (e) {
    console.error("Failed to read image", ref, e);
    return null;
  }
}

/** Returns a data URL (what Claude's image blocks need) for a stored image reference. */
export async function loadImageDataUrl(ref: string): Promise<string | null> {
  if (ref.startsWith("data:")) return ref;
  const img = await readImage(ref);
  return img ? `data:${img.contentType};base64,${img.bytes.toString("base64")}` : null;
}

/** Best-effort deletion of bucket objects (call before deleting the rows that reference them). */
export async function deleteImages(refs: (string | null)[]) {
  const keys = refs.filter((r): r is string => !!r?.startsWith(S3_PREFIX)).map((r) => r.slice(S3_PREFIX.length));
  if (!keys.length || !objectStorageEnabled()) return;
  for (let i = 0; i < keys.length; i += 1000) {
    try {
      await client().send(
        new DeleteObjectsCommand({
          Bucket: cfg().bucket,
          Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true },
        })
      );
    } catch (e) {
      console.error("Failed to delete images", e);
    }
  }
}

/** Collects stored image refs for everything under a project / workspace, for cleanup on delete. */
export async function imageRefsFor(where: { projectId?: string; workspaceId?: string; userWorkspaceIds?: string[] }) {
  const { db } = await import("@/lib/db");
  const rows = await db.capture.findMany({
    where: {
      imageUrl: { startsWith: S3_PREFIX },
      ...(where.projectId ? { projectId: where.projectId } : {}),
      ...(where.workspaceId ? { project: { workspaceId: where.workspaceId } } : {}),
      ...(where.userWorkspaceIds ? { project: { workspaceId: { in: where.userWorkspaceIds } } } : {}),
    },
    select: { imageUrl: true },
  });
  return rows.map((r) => r.imageUrl);
}
