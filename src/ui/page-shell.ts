export interface StaticPageOptions {
  documentTitle: string;
  pageClass: string;
  headingText: string;
  ledeText: string;
}

export function mountStaticPage(options: StaticPageOptions): void {
  const app = document.getElementById('app');
  if (!app) return;

  document.title = options.documentTitle;

  app.innerHTML = '';
  const main = document.createElement('main');
  main.className = options.pageClass;

  const h1 = document.createElement('h1');
  h1.className = 'page__title';
  h1.textContent = options.headingText;

  const p = document.createElement('p');
  p.className = 'page__lede';
  p.textContent = options.ledeText;

  main.appendChild(h1);
  main.appendChild(p);
  app.appendChild(main);
}
