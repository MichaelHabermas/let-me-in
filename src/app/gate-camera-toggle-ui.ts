function readCameraToggleLabels(btn: HTMLButtonElement): { start: string; stop: string } {
  return {
    start: btn.dataset.labelStart ?? 'Start camera',
    stop: btn.dataset.labelStop ?? 'Stop camera',
  };
}

export function syncCameraToggleUi(
  btn: HTMLButtonElement,
  mode: 'idle' | 'loading' | 'running',
): void {
  const { start, stop } = readCameraToggleLabels(btn);
  if (mode === 'running') {
    btn.textContent = stop;
    btn.dataset.cameraState = 'running';
    btn.setAttribute('aria-label', stop);
    btn.disabled = false;
  } else if (mode === 'loading') {
    btn.textContent = start;
    btn.dataset.cameraState = 'idle';
    btn.setAttribute('aria-label', start);
    btn.disabled = true;
  } else {
    btn.textContent = start;
    btn.dataset.cameraState = 'idle';
    btn.setAttribute('aria-label', start);
    btn.disabled = false;
  }
}
