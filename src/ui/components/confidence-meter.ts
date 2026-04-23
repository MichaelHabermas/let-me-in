import { config } from '../../config';

export type ConfidenceBand = 'strong' | 'weak' | 'reject';

/** Maps similarity to display band using the same cutoffs as decision policy thresholds (DRY). */
export function confidenceBandForScore(similarity01: number): ConfidenceBand {
  const { strong, weak } = config.thresholds;
  if (similarity01 >= strong) return 'strong';
  if (similarity01 >= weak) return 'weak';
  return 'reject';
}

export type ConfidenceMeterModel = {
  /** Top-1 cosine similarity in 0–1 (same unit as policy score). */
  similarity01: number;
};

/**
 * Full-width bar; fill width = score × 100%. Color class follows strong / weak / reject bands.
 */
export function renderConfidenceMeter(model: ConfidenceMeterModel): HTMLDivElement {
  const band = confidenceBandForScore(model.similarity01);
  const pct = Math.max(0, Math.min(100, Math.round(model.similarity01 * 100)));

  const root = document.createElement('div');
  root.className = `confidence-meter confidence-meter--${band}`;
  root.setAttribute('role', 'meter');
  root.setAttribute('aria-valuemin', '0');
  root.setAttribute('aria-valuemax', '100');
  root.setAttribute('aria-valuenow', String(pct));
  root.setAttribute('aria-label', `Match strength ${pct} percent`);

  const track = document.createElement('div');
  track.className = 'confidence-meter__track';

  const fill = document.createElement('div');
  fill.className = 'confidence-meter__fill';
  fill.style.width = `${pct}%`;

  track.appendChild(fill);
  root.appendChild(track);
  return root;
}
