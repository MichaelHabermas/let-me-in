import { createAccessAudioCues } from './audio';
import {
  createGateAccessUiController,
  FALLBACK_GATE_ACCESS_UI_STRINGS,
} from './gate-access-ui-controller';
import { createAccessDecisionEvaluator } from './access-decision-engine';
import type { GatePreviewElements, GatePreviewSessionDeps } from './gate-session';

/**
 * When persistence + seed are present and no evaluator was injected, wires live
 * access evaluation, UI presentation, audio, and default access log appends.
 */
export async function withLiveAccessDeps(
  elements: GatePreviewElements,
  deps: GatePreviewSessionDeps,
): Promise<GatePreviewSessionDeps> {
  if (deps.evaluateDecision || !deps.persistence || !deps.databaseSeedFallback) {
    return deps;
  }
  const persistence = deps.persistence;
  const uiStrings = deps.accessUiStrings ?? FALLBACK_GATE_ACCESS_UI_STRINGS;
  const accessUi =
    elements.decisionEl && createGateAccessUiController(elements.decisionEl, uiStrings);
  const audioCues = createAccessAudioCues();
  const evaluateDecision = await createAccessDecisionEvaluator(
    deps.persistence,
    deps.databaseSeedFallback,
    {
      onDecision: (event) => {
        accessUi?.present(event);
        audioCues.play(event.policy.decision);
      },
    },
  );
  return {
    ...deps,
    evaluateDecision,
    appendAccessLog:
      deps.appendAccessLog ?? ((payload) => persistence.accessLogRepo.appendDecision(payload)),
  };
}
