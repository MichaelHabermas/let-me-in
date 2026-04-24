import { fillEnrollmentRoleSelect } from './admin-enrollment-role-select';
import type { GateRuntime } from './gate-runtime';

export type AdminEnrollmentDom = {
  shell: HTMLElement;
  logoutBtn: HTMLButtonElement;
  rosterSection: HTMLElement;
  rosterTbody: HTMLTableSectionElement;
  importToolbar: HTMLElement;
  importFileInput: HTMLInputElement;
  importButton: HTMLButtonElement;
  importStatusEl: HTMLElement;
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
  const header = document.createElement('header');
  header.className = 'admin-header';
  const h1 = document.createElement('h1');
  h1.className = 'admin-header__title';
  h1.textContent = `${rt.orgName} — Admin`;
  const logoutBtn = document.createElement('button');
  logoutBtn.type = 'button';
  logoutBtn.className = 'admin-header__logout';
  logoutBtn.textContent = rt.adminUiStrings.logout;
  logoutBtn.setAttribute('data-testid', 'admin-logout');
  header.append(h1, logoutBtn);
  return { header, logoutBtn };
}

function buildUserRosterSection(rt: GateRuntime): {
  section: HTMLElement;
  tbody: HTMLTableSectionElement;
} {
  const copy = rt.adminUiStrings;
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
  importStatusEl: HTMLElement;
} {
  const copy = rt.adminUiStrings;
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

  const importStatusEl = document.createElement('p');
  importStatusEl.className = 'admin-import-toolbar__status';
  importStatusEl.setAttribute('data-testid', 'admin-import-status');

  const fileLabel = document.createElement('label');
  fileLabel.className = 'admin-import-toolbar__pick';
  fileLabel.htmlFor = importFileInput.id;
  fileLabel.textContent = copy.rosterImportPick;

  toolbar.append(fileLabel, importFileInput, importButton, importStatusEl);
  return { toolbar, importFileInput, importButton, importStatusEl };
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
  const column = document.createElement('div');
  column.className = 'admin-enroll__preview';
  const previewWrap = document.createElement('div');
  previewWrap.className = 'admin-enroll__video-wrap';

  const deviceRow = document.createElement('div');
  deviceRow.className = 'admin-enroll__camera-device';
  const cameraDeviceSelect = document.createElement('select');
  cameraDeviceSelect.className = 'admin-enroll__camera-select';
  cameraDeviceSelect.setAttribute('data-testid', 'enroll-camera-device');
  cameraDeviceSelect.setAttribute('aria-label', rt.adminUiStrings.cameraSelectAriaLabel);
  const defOpt = document.createElement('option');
  defOpt.value = '';
  defOpt.textContent = rt.adminUiStrings.cameraDefaultDeviceOption;
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

function buildNameFields(rt: GateRuntime): {
  nameLabel: HTMLLabelElement;
  nameInput: HTMLInputElement;
  roleLabel: HTMLLabelElement;
  roleSelect: HTMLSelectElement;
} {
  const nameLabel = document.createElement('label');
  nameLabel.className = 'admin-enroll__label';
  nameLabel.htmlFor = 'enroll-name';
  nameLabel.textContent = rt.adminUiStrings.enrollNameLabel;
  const nameInput = document.createElement('input');
  nameInput.id = 'enroll-name';
  nameInput.type = 'text';
  nameInput.autocomplete = 'name';
  nameInput.setAttribute('data-testid', 'enroll-name');

  const roleLabel = document.createElement('label');
  roleLabel.className = 'admin-enroll__label';
  roleLabel.htmlFor = 'enroll-role';
  roleLabel.textContent = rt.adminUiStrings.enrollRoleLabel;
  const roleSelect = document.createElement('select');
  roleSelect.id = 'enroll-role';
  roleSelect.className = 'admin-enroll__select';
  roleSelect.setAttribute('data-testid', 'enroll-role');
  const copy = rt.adminUiStrings;
  fillEnrollmentRoleSelect(roleSelect, '', {
    enrollRolePlaceholder: copy.enrollRolePlaceholder,
    enrollRoleLegacySuffix: copy.enrollRoleLegacySuffix,
  });

  return { nameLabel, nameInput, roleLabel, roleSelect };
}

function buildActionButtons(rt: GateRuntime): {
  btnRow: HTMLDivElement;
  cameraToggleBtn: HTMLButtonElement;
  capBtn: HTMLButtonElement;
  retakeBtn: HTMLButtonElement;
  saveBtn: HTMLButtonElement;
} {
  const btnRow = document.createElement('div');
  btnRow.className = 'admin-enroll__actions';

  const startLabel = rt.adminUiStrings.enrollStartCamera;
  const stopLabel = rt.cameraStopLabel;

  const cameraToggleBtn = document.createElement('button');
  cameraToggleBtn.type = 'button';
  cameraToggleBtn.className = 'btn btn--primary';
  cameraToggleBtn.textContent = startLabel;
  cameraToggleBtn.setAttribute('aria-label', startLabel);
  cameraToggleBtn.dataset.labelStart = startLabel;
  cameraToggleBtn.dataset.labelStop = stopLabel;
  cameraToggleBtn.setAttribute('data-testid', 'enroll-camera');

  const capBtn = document.createElement('button');
  capBtn.type = 'button';
  capBtn.className = 'btn';
  capBtn.textContent = rt.adminUiStrings.enrollCapture;
  capBtn.setAttribute('data-testid', 'enroll-capture');
  capBtn.disabled = true;

  const retakeBtn = document.createElement('button');
  retakeBtn.type = 'button';
  retakeBtn.className = 'btn';
  retakeBtn.textContent = rt.adminUiStrings.enrollRetake;
  retakeBtn.setAttribute('data-testid', 'enroll-retake');
  retakeBtn.disabled = true;

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'btn btn--primary';
  saveBtn.textContent = rt.adminUiStrings.enrollSave;
  saveBtn.setAttribute('data-testid', 'enroll-save');
  saveBtn.disabled = true;

  btnRow.append(cameraToggleBtn, capBtn, retakeBtn, saveBtn);
  return { btnRow, cameraToggleBtn, capBtn, retakeBtn, saveBtn };
}

function buildFormColumn(rt: GateRuntime): {
  column: HTMLElement;
  nameInput: HTMLInputElement;
  roleSelect: HTMLSelectElement;
  cameraToggleBtn: HTMLButtonElement;
  capBtn: HTMLButtonElement;
  retakeBtn: HTMLButtonElement;
  saveBtn: HTMLButtonElement;
} {
  const column = document.createElement('div');
  column.className = 'admin-enroll__form-col';
  const h2 = document.createElement('h2');
  h2.className = 'admin-enroll__heading';
  h2.textContent = rt.adminUiStrings.enrollTitle;

  const names = buildNameFields(rt);
  const actions = buildActionButtons(rt);
  column.append(
    h2,
    names.nameLabel,
    names.nameInput,
    names.roleLabel,
    names.roleSelect,
    actions.btnRow,
  );

  return {
    column,
    nameInput: names.nameInput,
    roleSelect: names.roleSelect,
    cameraToggleBtn: actions.cameraToggleBtn,
    capBtn: actions.capBtn,
    retakeBtn: actions.retakeBtn,
    saveBtn: actions.saveBtn,
  };
}

export function createAdminEnrollmentDom(rt: GateRuntime): AdminEnrollmentDom {
  const shell = document.createElement('div');
  shell.className = 'admin-root admin-root--authed';
  shell.setAttribute('data-testid', 'admin-enroll-root');

  const { header, logoutBtn } = buildAdminHeader(rt);
  const roster = buildUserRosterSection(rt);
  const importUi = buildImportToolbar(rt);
  const main = document.createElement('main');
  main.className = 'admin-enroll';

  const preview = buildPreviewColumn(rt);
  const form = buildFormColumn(rt);
  main.append(preview.column, form.column);
  shell.append(header, roster.section, importUi.toolbar, main);

  return {
    shell,
    logoutBtn,
    rosterSection: roster.section,
    rosterTbody: roster.tbody,
    importToolbar: importUi.toolbar,
    importFileInput: importUi.importFileInput,
    importButton: importUi.importButton,
    importStatusEl: importUi.importStatusEl,
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
