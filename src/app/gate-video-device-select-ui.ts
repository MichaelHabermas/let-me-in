import type { VideoInputListItem } from '../infra/camera-devices';

/** Rebuild a native `<select>` for video inputs: default option + one row per device. */
export function fillVideoDeviceSelect(
  el: HTMLSelectElement,
  defaultLabel: string,
  items: VideoInputListItem[],
  selectedDeviceId?: string | null,
): void {
  const prior = el.value;
  el.replaceChildren();
  const def = document.createElement('option');
  def.value = '';
  def.textContent = defaultLabel;
  el.appendChild(def);
  for (const it of items) {
    const o = document.createElement('option');
    o.value = it.deviceId;
    o.textContent = it.label;
    el.appendChild(o);
  }
  const pick = selectedDeviceId && items.some((i) => i.deviceId === selectedDeviceId);
  if (pick) {
    el.value = selectedDeviceId;
  } else if (prior && items.some((i) => i.deviceId === prior)) {
    el.value = prior;
  } else {
    el.value = '';
  }
}
