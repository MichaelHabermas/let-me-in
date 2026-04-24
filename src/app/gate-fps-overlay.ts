import type { Camera } from './camera';

export function maybeMountFpsOverlay(
  camera: Camera,
  host: HTMLElement,
  enabled: boolean,
): () => void {
  if (!enabled) return () => {};

  const fpsEl = document.createElement('div');
  fpsEl.id = 'fps';
  fpsEl.className = 'gate-preview__fps';
  host.appendChild(fpsEl);

  let lastTs = 0;
  const rolling: number[] = [];

  return camera.onFrame((ts) => {
    if (lastTs > 0) {
      const dt = ts - lastTs;
      if (dt > 0) rolling.push(1000 / dt);
      if (rolling.length > 30) rolling.shift();
      const avg = rolling.reduce((a, b) => a + b, 0) / rolling.length;
      fpsEl.textContent = `${avg.toFixed(1)} FPS`;
    }
    lastTs = ts;
  });
}
