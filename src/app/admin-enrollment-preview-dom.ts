import type { GateRuntime } from './gate-runtime';

export function buildPreviewColumn(rt: GateRuntime): {
  column: HTMLElement;
  video: HTMLVideoElement;
  frameCanvas: HTMLCanvasElement;
  overlayCanvas: HTMLCanvasElement;
  modelLoadRoot: HTMLElement;
  cameraDeviceSelect: HTMLSelectElement;
  statusEl: HTMLElement;
} {
  const ui = rt.runtimeSlices.admin.ui;
  const column = document.createElement('div');
  column.className = 'admin-enroll__preview';
  const previewWrap = document.createElement('div');
  previewWrap.className = 'admin-enroll__video-wrap';

  const deviceRow = document.createElement('div');
  deviceRow.className = 'admin-enroll__camera-device';
  const cameraDeviceSelect = document.createElement('select');
  cameraDeviceSelect.className = 'admin-enroll__camera-select';
  cameraDeviceSelect.setAttribute('data-testid', 'enroll-camera-device');
  cameraDeviceSelect.setAttribute('aria-label', ui.cameraSelectAriaLabel);
  const defOpt = document.createElement('option');
  defOpt.value = '';
  defOpt.textContent = ui.cameraDefaultDeviceOption;
  cameraDeviceSelect.appendChild(defOpt);
  deviceRow.appendChild(cameraDeviceSelect);

  const video = document.createElement('video');
  video.className = 'admin-enroll__video';
  video.playsInline = true;
  video.muted = true;

  const frameCanvas = document.createElement('canvas');
  frameCanvas.className = 'admin-enroll__frame-canvas';
  frameCanvas.width = rt.previewCanvasWidth;
  frameCanvas.height = rt.previewCanvasHeight;

  const overlayCanvas = document.createElement('canvas');
  overlayCanvas.className = 'admin-enroll__overlay';
  overlayCanvas.width = rt.previewCanvasWidth;
  overlayCanvas.height = rt.previewCanvasHeight;

  previewWrap.append(video, frameCanvas, overlayCanvas);
  const modelLoadRoot = document.createElement('div');
  modelLoadRoot.className = 'admin-enroll__model-load-host';
  const statusEl = document.createElement('p');
  statusEl.className = 'admin-enroll__status';
  statusEl.setAttribute('data-testid', 'enroll-status');
  column.append(deviceRow, previewWrap, modelLoadRoot, statusEl);
  return { column, video, frameCanvas, overlayCanvas, modelLoadRoot, cameraDeviceSelect, statusEl };
}
