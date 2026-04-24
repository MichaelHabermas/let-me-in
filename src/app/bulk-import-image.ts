export function greyStubImportFrame(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 120;
    data[i + 1] = 120;
    data[i + 2] = 120;
    data[i + 3] = 255;
  }
  return new ImageData(data, width, height);
}

export async function base64ToImageData(base64: string): Promise<ImageData> {
  let binary: Uint8Array;
  try {
    const bin = atob(base64);
    binary = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) binary[i] = bin.charCodeAt(i);
  } catch {
    throw new Error('Could not decode base64');
  }
  const mime = binary[0] === 0xff && binary[1] === 0xd8 ? 'image/jpeg' : 'image/png';
  const blob = new Blob([new Uint8Array(binary)], { type: mime });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    const decoded = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image decode failed'));
    });
    img.src = url;
    await decoded;
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (w < 1 || h < 1) throw new Error('Invalid image dimensions');
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2d context');
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, w, h);
  } finally {
    URL.revokeObjectURL(url);
  }
}
