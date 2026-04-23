export type ConsentModalStrings = {
  title: string;
  intro: string;
  bullets: readonly string[];
  accept: string;
  decline: string;
};

export type ConsentModalCallbacks = {
  onAccept: () => void;
  onDecline: () => void;
};

/**
 * Modal overlay blocking the gate until the visitor accepts biometric processing terms.
 */
export function mountConsentModal(
  host: HTMLElement,
  strings: ConsentModalStrings,
  callbacks: ConsentModalCallbacks,
): () => void {
  const backdrop = document.createElement('div');
  backdrop.className = 'consent-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-labelledby', 'consent-title');

  const dialog = document.createElement('div');
  dialog.className = 'consent-dialog';

  const title = document.createElement('h2');
  title.id = 'consent-title';
  title.className = 'consent-dialog__title';
  title.textContent = strings.title;

  const intro = document.createElement('p');
  intro.className = 'consent-dialog__intro';
  intro.textContent = strings.intro;

  const list = document.createElement('ul');
  list.className = 'consent-dialog__list';
  for (const text of strings.bullets) {
    const li = document.createElement('li');
    li.textContent = text;
    list.appendChild(li);
  }

  const actions = document.createElement('div');
  actions.className = 'consent-dialog__actions';

  const declineBtn = document.createElement('button');
  declineBtn.type = 'button';
  declineBtn.className = 'consent-dialog__btn consent-dialog__btn--secondary';
  declineBtn.textContent = strings.decline;

  const acceptBtn = document.createElement('button');
  acceptBtn.type = 'button';
  acceptBtn.className = 'consent-dialog__btn consent-dialog__btn--primary';
  acceptBtn.textContent = strings.accept;

  declineBtn.addEventListener('click', () => callbacks.onDecline());
  acceptBtn.addEventListener('click', () => callbacks.onAccept());

  actions.appendChild(declineBtn);
  actions.appendChild(acceptBtn);

  dialog.appendChild(title);
  dialog.appendChild(intro);
  dialog.appendChild(list);
  dialog.appendChild(actions);
  backdrop.appendChild(dialog);
  host.appendChild(backdrop);

  return () => {
    backdrop.remove();
  };
}
