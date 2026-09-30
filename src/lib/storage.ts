import "server-only";

/**
 * Screenshot storage. v1 keeps base64 data URLs in Postgres; object storage is added separately.
 * Returns a data URL for a stored image reference.
 */
export async function loadImageDataUrl(ref: string): Promise<string | null> {
  return ref.startsWith("data:") ? ref : null;
}
