import { getAdminPageTitle, getOrgName } from '../app/config-bridge';

export function mountAdminView(): void {
  const app = document.getElementById('app');
  if (!app) return;

  document.title = getAdminPageTitle();

  app.innerHTML = '';
  const main = document.createElement('main');
  main.className = 'page page--admin';

  const h1 = document.createElement('h1');
  h1.className = 'page__title';
  h1.textContent = `${getOrgName()} — Admin`;

  const p = document.createElement('p');
  p.className = 'page__lede';
  p.textContent = 'Enrollment and authentication will be wired in Epic E6.';

  main.appendChild(h1);
  main.appendChild(p);
  app.appendChild(main);
}
