export type DecisionBannerVariant = 'granted' | 'uncertain' | 'denied';

export type DecisionBannerModel = {
  variant: DecisionBannerVariant;
  /** Primary line (name + similarity, denied line, or try-again). */
  title: string;
};

export function renderDecisionBanner(model: DecisionBannerModel): HTMLDivElement {
  const root = document.createElement('div');
  root.className = `banner banner--${model.variant}`;
  root.setAttribute('role', 'status');
  const title = document.createElement('p');
  title.className = 'banner__title';
  title.textContent = model.title;
  root.appendChild(title);
  return root;
}
