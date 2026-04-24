type NumericArray = ArrayLike<number> & { readonly length: number };

function elementAt(arr: NumericArray, i: number, label: string): number {
  const v = arr[i];
  if (v === undefined) {
    throw new Error(`${label} index ${i} out of bounds (len ${arr.length})`);
  }
  return v;
}

export function f32At(arr: Float32Array, i: number): number {
  return elementAt(arr, i, 'Float32Array');
}

export function u8At(arr: Uint8ClampedArray, i: number): number {
  return elementAt(arr, i, 'Uint8ClampedArray');
}
