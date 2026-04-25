import { buildFormColumn } from './admin-enrollment-form-dom';
import type { GateRuntime } from './gate-runtime';

export type AdminEnrollmentDom = {
  shell: HTMLElement;
  logoutBtn: HTMLButtonElement;
  rosterSection: HTMLElement;
  rosterTbody: HTMLTableSectionElement;
  importToolbar: HTMLElement;
  importFileInput: HTMLInputElement;
  importButton: HTMLButtonElement;
  exportButton: HTMLButtonElement;
  importStatusEl: HTMLElement;
  thresholdSection: HTMLElement;
  thresholdStatusEl: HTMLElement;
  thresholdCalibrationStatusEl: HTMLElement;
  thresholdApplySpec075Btn: HTMLButtonElement;
  main: HTMLElement;
  video: HTMLVideoElement;
  frameCanvas: HTMLCanvasElement;
  overlayCanvas: HTMLCanvasElement;
  modelLoadRoot: HTMLElement;
  cameraDeviceSelect: HTMLSelectElement;
  statusEl: HTMLElement;
  nameInput: HTMLInputElement;
  roleSelect: HTMLSelectElement;
  cameraToggleBtn: HTMLButtonElement;
  capBtn: HTMLButtonElement;
  retakeBtn: HTMLButtonElement;
  saveBtn: HTMLButtonElement;
};

function buildAdminHeader(rt: GateRuntime): { header: HTMLElement; logoutBtn: HTMLButtonElement } {
  const ui = rt.runtimeSlices.admin.ui;
  const header = document.createElement('header');
  header.className = 'admin-header';
  const h1 = document.createElement('h1');
  h1.className = 'admin-header__title';
  h1.textContent = `${rt.orgName} — Admin`;
  const logoutBtn = document.createElement('button');
  logoutBtn.type = 'button';
  logoutBtn.className = 'admin-header__logout';
  logoutBtn.textContent = ui.logout;
  logoutBtn.setAttribute('data-testid', 'admin-logout');
  header.append(h1, logoutBtn);
  return { header, logoutBtn };
}

function buildUserRosterSection(rt: GateRuntime): {
  section: HTMLElement;
  tbody: HTMLTableSectionElement;
} {
  const copy = rt.runtimeSlices.admin.ui;
  const section = document.createElement('section');
  section.className = 'admin-user-roster';
  section.setAttribute('data-testid', 'admin-user-roster');

  const h2 = document.createElement('h2');
  h2.className = 'admin-user-roster__title';
  h2.textContent = copy.rosterTitle;

  const wrap = document.createElement('div');
  wrap.className = 'admin-user-roster__table-wrap';
  const table = document.createElement('table');
  table.className = 'admin-user-table';
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  for (const label of [
    copy.rosterColPhoto,
    copy.rosterColName,
    copy.rosterColRole,
    copy.rosterColCreated,
    copy.rosterColActions,
  ]) {
    const th = document.createElement('th');
    th.textContent = label;
    hr.appendChild(th);
  }
  thead.appendChild(hr);
  const tbody = document.createElement('tbody');
  tbody.setAttribute('data-testid', 'admin-user-roster-tbody');
  table.append(thead, tbody);
  wrap.appendChild(table);
  section.append(h2, wrap);
  return { section, tbody };
}

function buildImportToolbar(rt: GateRuntime): {
  toolbar: HTMLElement;
  importFileInput: HTMLInputElement;
  importButton: HTMLButtonElement;
  exportButton: HTMLButtonElement;
  importStatusEl: HTMLElement;
} {
  const copy = rt.runtimeSlices.admin.ui;
  const toolbar = document.createElement('div');
  toolbar.className = 'admin-import-toolbar';
  toolbar.setAttribute('data-testid', 'admin-import-toolbar');

  const importFileInput = document.createElement('input');
  importFileInput.type = 'file';
  importFileInput.accept = 'application/json,.json';
  importFileInput.setAttribute('data-testid', 'admin-import-file');
  importFileInput.className = 'admin-import-toolbar__file';
  importFileInput.id = 'admin-bulk-import-file';

  const importButton = document.createElement('button');
  importButton.type = 'button';
  importButton.className = 'btn btn--primary';
  importButton.textContent = copy.rosterBulkImport;
  importButton.setAttribute('data-testid', 'admin-import-trigger');

  const exportButton = document.createElement('button');
  exportButton.type = 'button';
  exportButton.className = 'btn';
  exportButton.textContent = copy.rosterExportJson;
  exportButton.setAttribute('data-testid', 'admin-export-trigger');

  const importStatusEl = document.createElement('p');
  importStatusEl.className = 'admin-import-toolbar__status';
  importStatusEl.setAttribute('data-testid', 'admin-import-status');

  const fileLabel = document.createElement('label');
  fileLabel.className = 'admin-import-toolbar__pick';
  fileLabel.htmlFor = importFileInput.id;
  fileLabel.textContent = copy.rosterImportPick;

  toolbar.append(fileLabel, importFileInput, importButton, exportButton, importStatusEl);
  return { toolbar, importFileInput, importButton, exportButton, importStatusEl };
}

function buildAccessThresholdSection(rt: GateRuntime): {
  section: HTMLElement;
  statusEl: HTMLElement;
  calibrationStatusEl: HTMLElement;
  applySpec075Btn: HTMLButtonElement;
} {
  const copy = rt.runtimeSlices.admin.ui;
  const section = document.createElement('section');
  section.className = 'admin-thresholds';
  section.setAttribute('data-testid', 'admin-access-thresholds');

  const h2 = document.createElement('h2');
  h2.className = 'admin-thresholds__title';
  h2.textContent = copy.adminAccessThresholdsTitle;

  const statusEl = document.createElement('p');
  statusEl.className = 'admin-thresholds__status';
  statusEl.setAttribute('data-testid', 'admin-thresholds-status');

  const calibrationStatusEl = document.createElement('p');
  calibrationStatusEl.className = 'admin-thresholds__status';
  calibrationStatusEl.setAttribute('data-testid', 'admin-thresholds-calibration-status');

  const applySpec075Btn = document.createElement('button');
  applySpec075Btn.type = 'button';
  applySpec075Btn.className = 'btn';
  applySpec075Btn.setAttribute('data-testid', 'admin-threshold-apply-spec075');
  applySpec075Btn.textContent = copy.adminAccessThresholdsApplySpec075;

  section.append(h2, statusEl, calibrationStatusEl, applySpec075Btn);
  return { section, statusEl, calibrationStatusEl, applySpec075Btn };
}

function buildPreviewColumn(rt: GateRuntime): {
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

export function createAdminEnrollmentDom(rt: GateRuntime): AdminEnrollmentDom {
  const shell = document.createElement('div');
  shell.className = 'admin-root admin-root--authed';
  shell.setAttribute('data-testid', 'admin-enroll-root');

  const { header, logoutBtn } = buildAdminHeader(rt);
  const roster = buildUserRosterSection(rt);
  const importUi = buildImportToolbar(rt);
  const thr = buildAccessThresholdSection(rt);
  const main = document.createElement('main');
  main.className = 'admin-enroll';

  const preview = buildPreviewColumn(rt);
  const form = buildFormColumn(rt);
  main.append(preview.column, form.column);
  shell.append(header, roster.section, importUi.toolbar, thr.section, main);

  return {
    shell,
    logoutBtn,
    rosterSection: roster.section,
    rosterTbody: roster.tbody,
    importToolbar: importUi.toolbar,
    importFileInput: importUi.importFileInput,
    importButton: importUi.importButton,
    exportButton: importUi.exportButton,
    importStatusEl: importUi.importStatusEl,
    thresholdSection: thr.section,
    thresholdStatusEl: thr.statusEl,
    thresholdCalibrationStatusEl: thr.calibrationStatusEl,
    thresholdApplySpec075Btn: thr.applySpec075Btn,
    main,
    video: preview.video,
    frameCanvas: preview.frameCanvas,
    overlayCanvas: preview.overlayCanvas,
    modelLoadRoot: preview.modelLoadRoot,
    cameraDeviceSelect: preview.cameraDeviceSelect,
    statusEl: preview.statusEl,
    nameInput: form.nameInput,
    roleSelect: form.roleSelect,
    cameraToggleBtn: form.cameraToggleBtn,
    capBtn: form.capBtn,
    retakeBtn: form.retakeBtn,
    saveBtn: form.saveBtn,
  };
}
