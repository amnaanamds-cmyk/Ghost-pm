/** Downscale an image file in the browser and return a data URL (keeps DB rows and Claude requests small). */
export async function fileToDataUrl(file: File, maxDim = 1568): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  // PNG keeps screenshots crisp; fall back to JPEG if it's big (photos).
  const png = canvas.toDataURL("image/png");
  return png.length < 1_500_000 ? png : canvas.toDataURL("image/jpeg", 0.85);
}
