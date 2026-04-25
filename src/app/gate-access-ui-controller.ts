import type { GateAccessEvaluation } from './gate-access-evaluation';
import { recordDecisionPresented } from './gatekeeper-metrics';
import { renderConfidenceMeter } from '../ui/components/confidence-meter';
import { renderDecisionBanner, type DecisionBannerVariant } from '../ui/components/decision-banner';
import { renderSideBySide } from '../ui/components/side-by-side';

export type GateAccessUiStrings = {
  formatGranted(name: string, similarityPct: number): string;
  formatDenied(similarityPct: number): string;
  tryAgain: string;
};

export const FALLBACK_GATE_ACCESS_UI_STRINGS: GateAccessUiStrings = {
  formatGranted: (name, p) => `${name} — ${p}%`,
  formatDenied: (p) => `Unknown — ${p}%`,
  tryAgain: 'Please try again',
};

function variantFor(verdict: GateAccessEvaluation['verdict']): DecisionBannerVariant {
  if (verdict.decision === 'GRANTED') return 'granted';
  if (verdict.decision === 'UNCERTAIN') return 'uncertain';
  return 'denied';
}

function similarityPct(score: number): number {
  return Math.round(score * 100);
}

function titleFor(strings: GateAccessUiStrings, ev: GateAccessEvaluation): string {
  const { verdict } = ev;
  const pct = similarityPct(verdict.bestScore);
  if (verdict.decision === 'GRANTED') {
    const name = ev.displayName ?? '';
    return strings.formatGranted(name, pct);
  }
  if (verdict.decision === 'UNCERTAIN') return strings.tryAgain;
  return strings.formatDenied(pct);
}

/**
 * Renders decision banner (+ optional side-by-side) into a host element (typically `#decision`).
 */
export function createGateAccessUiController(
  host: HTMLElement,
  strings: GateAccessUiStrings,
): { present(ev: GateAccessEvaluation): void; clear(): void } {
  const revocations: Array<() => void> = [];

  const clear = () => {
    for (const r of revocations) r();
    revocations.length = 0;
    host.replaceChildren();
  };

  const present = (ev: GateAccessEvaluation) => {
    clear();
    const variant = variantFor(ev.verdict);
    const banner = renderDecisionBanner({
      variant,
      title: titleFor(strings, ev),
    });
    host.appendChild(banner);
    host.appendChild(
      renderConfidenceMeter({
        similarity01: ev.verdict.bestScore,
        strong: ev.bandThresholds.strong,
        weak: ev.bandThresholds.weak,
      }),
    );

    const showCompare =
      (ev.verdict.decision === 'GRANTED' || ev.verdict.decision === 'UNCERTAIN') &&
      ev.referenceImageBlob;

    if (showCompare && ev.referenceImageBlob) {
      try {
        const refUrl = URL.createObjectURL(ev.referenceImageBlob);
        const liveUrl = URL.createObjectURL(ev.capturedFrameBlob);
        revocations.push(() => URL.revokeObjectURL(refUrl));
        revocations.push(() => URL.revokeObjectURL(liveUrl));
        const side = renderSideBySide({
          referenceObjectUrl: refUrl,
          liveObjectUrl: liveUrl,
          similarityLine: `${similarityPct(ev.verdict.bestScore)}% match`,
        });
        host.appendChild(side);
      } catch (error) {
        // Keep access decisions flowing even if optional preview rendering fails.
        console.warn('[gate-access-ui] side-by-side preview unavailable', error);
      }
    }
    recordDecisionPresented();
  };

  return { present, clear };
}
