import { getGatePageTitle, getOrgName } from '../app/config-bridge';

export function mountGateView(): void {
  const app = document.getElementById('app');
  if (!app) return;

  document.title = getGatePageTitle();

  app.innerHTML = '';
  const main = document.createElement('main');
  main.className = 'page page--gate';

  const h1 = document.createElement('h1');
  h1.className = 'page__title';
  h1.textContent = getOrgName();

  const p = document.createElement('p');
  p.className = 'page__lede';
  p.textContent =
    'Foundation scaffold: camera and detection arrive in later epics. IndexedDB is ready.';

  main.appendChild(h1);
  main.appendChild(p);
  app.appendChild(main);
}
