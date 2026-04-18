import { getLogPageTitle, getOrgName } from '../app/config-bridge';

export function mountLogView(): void {
  const app = document.getElementById('app');
  if (!app) return;

  document.title = getLogPageTitle();

  app.innerHTML = '';
  const main = document.createElement('main');
  main.className = 'page page--log';

  const h1 = document.createElement('h1');
  h1.className = 'page__title';
  h1.textContent = `${getOrgName()} — Entry log`;

  const p = document.createElement('p');
  p.className = 'page__lede';
  p.textContent = 'Access history UI will appear in Epic E7. Data store is ready.';

  main.appendChild(h1);
  main.appendChild(p);
  app.appendChild(main);
}
