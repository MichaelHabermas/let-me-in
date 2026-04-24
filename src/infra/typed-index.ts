/** Bounds-checked reads for `noUncheckedIndexedAccess` hot paths (pixels / tensors). */

export function f32At(arr: Float32Array, i: number): number {
  const v = arr[i];
  if (v === undefined) {
    throw new Error(`Float32Array index ${i} out of bounds (len ${arr.length})`);
  }
  return v;
}

export function u8At(arr: Uint8ClampedArray, i: number): number {
  const v = arr[i];
  if (v === undefined) {
    throw new Error(`Uint8ClampedArray index ${i} out of bounds (len ${arr.length})`);
  }
  return v;
}
