/** Rasterize ImageData to JPEG Blob (browser). */
export function imageDataToJpegBlob(data: ImageData, quality = 0.85): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = data.width;
  canvas.height = data.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Could not get 2d context'));
  ctx.putImageData(data, 0, 0);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('toBlob returned null'));
      },
      'image/jpeg',
      quality,
    );
  });
}
