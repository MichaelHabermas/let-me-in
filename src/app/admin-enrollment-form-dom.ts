import { fillEnrollmentRoleSelect } from './admin-enrollment-role-select';
import type { GateRuntime } from './gate-runtime';

function buildNameFields(rt: GateRuntime): {
  nameLabel: HTMLLabelElement;
  nameInput: HTMLInputElement;
  roleLabel: HTMLLabelElement;
  roleSelect: HTMLSelectElement;
} {
  const ui = rt.runtimeSlices.admin.ui;
  const nameLabel = document.createElement('label');
  nameLabel.className = 'admin-enroll__label';
  nameLabel.htmlFor = 'enroll-name';
  nameLabel.textContent = ui.enrollNameLabel;
  const nameInput = document.createElement('input');
  nameInput.id = 'enroll-name';
  nameInput.type = 'text';
  nameInput.autocomplete = 'name';
  nameInput.setAttribute('data-testid', 'enroll-name');

  const roleLabel = document.createElement('label');
  roleLabel.className = 'admin-enroll__label';
  roleLabel.htmlFor = 'enroll-role';
  roleLabel.textContent = ui.enrollRoleLabel;
  const roleSelect = document.createElement('select');
  roleSelect.id = 'enroll-role';
  roleSelect.className = 'admin-enroll__select';
  roleSelect.setAttribute('data-testid', 'enroll-role');
  fillEnrollmentRoleSelect(roleSelect, '', {
    enrollRolePlaceholder: ui.enrollRolePlaceholder,
    enrollRoleLegacySuffix: ui.enrollRoleLegacySuffix,
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
  const ui = rt.runtimeSlices.admin.ui;
  const btnRow = document.createElement('div');
  btnRow.className = 'admin-enroll__actions';

  const cameraToggleBtn = document.createElement('button');
  cameraToggleBtn.type = 'button';
  cameraToggleBtn.className = 'btn btn--primary';
  cameraToggleBtn.textContent = ui.enrollStartCamera;
  cameraToggleBtn.setAttribute('aria-label', ui.enrollStartCamera);
  cameraToggleBtn.dataset.labelStart = ui.enrollStartCamera;
  cameraToggleBtn.dataset.labelStop = rt.cameraStopLabel;
  cameraToggleBtn.setAttribute('data-testid', 'enroll-camera');

  const capBtn = document.createElement('button');
  capBtn.type = 'button';
  capBtn.className = 'btn';
  capBtn.textContent = ui.enrollCapture;
  capBtn.setAttribute('data-testid', 'enroll-capture');
  capBtn.disabled = true;

  const retakeBtn = document.createElement('button');
  retakeBtn.type = 'button';
  retakeBtn.className = 'btn';
  retakeBtn.textContent = ui.enrollRetake;
  retakeBtn.setAttribute('data-testid', 'enroll-retake');
  retakeBtn.disabled = true;

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'btn btn--primary';
  saveBtn.textContent = ui.enrollSave;
  saveBtn.setAttribute('data-testid', 'enroll-save');
  saveBtn.disabled = true;

  btnRow.append(cameraToggleBtn, capBtn, retakeBtn, saveBtn);
  return { btnRow, cameraToggleBtn, capBtn, retakeBtn, saveBtn };
}

export function buildFormColumn(rt: GateRuntime): {
  column: HTMLElement;
  nameInput: HTMLInputElement;
  roleSelect: HTMLSelectElement;
  cameraToggleBtn: HTMLButtonElement;
  capBtn: HTMLButtonElement;
  retakeBtn: HTMLButtonElement;
  saveBtn: HTMLButtonElement;
} {
  const ui = rt.runtimeSlices.admin.ui;
  const column = document.createElement('div');
  column.className = 'admin-enroll__form-col';
  const h2 = document.createElement('h2');
  h2.className = 'admin-enroll__heading';
  h2.textContent = ui.enrollTitle;

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
