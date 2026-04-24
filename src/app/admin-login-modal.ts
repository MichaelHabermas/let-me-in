import type { AdminAuth } from './auth';
import type { AdminUiStrings } from './gate-ui-runtime';
import type { GateRuntime } from './gate-runtime';

function buildAdminLoginForm(copy: AdminUiStrings): {
  form: HTMLFormElement;
  userInput: HTMLInputElement;
  passInput: HTMLInputElement;
  err: HTMLParagraphElement;
} {
  const form = document.createElement('form');
  form.className = 'admin-login__form';
  form.noValidate = true;

  const userLabel = document.createElement('label');
  userLabel.className = 'admin-login__label';
  userLabel.htmlFor = 'admin-login-user';
  userLabel.textContent = copy.loginUsername;

  const userInput = document.createElement('input');
  userInput.id = 'admin-login-user';
  userInput.type = 'text';
  userInput.autocomplete = 'username';
  userInput.required = true;
  userInput.setAttribute('data-testid', 'admin-login-user');

  const passLabel = document.createElement('label');
  passLabel.className = 'admin-login__label';
  passLabel.htmlFor = 'admin-login-pass';
  passLabel.textContent = copy.loginPassword;

  const passInput = document.createElement('input');
  passInput.id = 'admin-login-pass';
  passInput.type = 'password';
  passInput.autocomplete = 'current-password';
  passInput.required = true;
  passInput.setAttribute('data-testid', 'admin-login-pass');

  const err = document.createElement('p');
  err.className = 'admin-login__error';
  err.setAttribute('role', 'alert');
  err.hidden = true;

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'admin-login__submit';
  submit.textContent = copy.loginSubmit;
  submit.setAttribute('data-testid', 'admin-login-submit');

  form.append(userLabel, userInput, passLabel, passInput, err, submit);
  return { form, userInput, passInput, err };
}

/** Modal gate before enrollment (PRD E6.S1.F1.T2). */
export function mountAdminLoginModal(
  host: HTMLElement,
  rt: GateRuntime,
  auth: AdminAuth,
  onSuccess: () => void,
): () => void {
  const copy = rt.runtimeSlices.admin.ui;
  host.innerHTML = '';

  const backdrop = document.createElement('div');
  backdrop.className = 'admin-login';
  backdrop.setAttribute('data-testid', 'admin-login-modal');

  const dialog = document.createElement('div');
  dialog.className = 'admin-login__dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'admin-login-heading');

  const h2 = document.createElement('h2');
  h2.id = 'admin-login-heading';
  h2.className = 'admin-login__title';
  h2.textContent = copy.loginHeading;

  const { form, userInput, passInput, err } = buildAdminLoginForm(copy);

  const onSubmit = (ev: Event) => {
    ev.preventDefault();
    err.hidden = true;
    if (auth.login(userInput.value, passInput.value)) {
      onSuccess();
      return;
    }
    err.textContent = copy.loginError;
    err.hidden = false;
  };
  form.addEventListener('submit', onSubmit);

  dialog.append(h2, form);
  backdrop.appendChild(dialog);
  host.appendChild(backdrop);

  return () => {
    form.removeEventListener('submit', onSubmit);
    host.innerHTML = '';
  };
}
