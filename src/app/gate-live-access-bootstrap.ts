import { createAccessAudioCues } from './audio';
import {
  createGateAccessUiController,
  FALLBACK_GATE_ACCESS_UI_STRINGS,
} from './gate-access-ui-controller';
import { loadLiveAccessDecisionFn } from './gate-live-access';
import type { AppendAccessLogFn } from './pipeline';
import type { GatePreviewElements, GatePreviewSessionDeps } from './gate-session';

export async function withLiveAccessDeps(
  elements: GatePreviewElements,
  deps: GatePreviewSessionDeps,
): Promise<GatePreviewSessionDeps> {
  if (deps.evaluateDecision || !deps.persistence || !deps.databaseSeedFallback) {
    return deps;
  }

  const uiStrings = deps.accessUiStrings ?? FALLBACK_GATE_ACCESS_UI_STRINGS;
  const accessUi =
    elements.decisionEl && createGateAccessUiController(elements.decisionEl, uiStrings);
  const audioCues = createAccessAudioCues();
  const evaluateDecision = await loadLiveAccessDecisionFn(
    deps.persistence,
    deps.databaseSeedFallback,
    {
      onDecision: (ev) => {
        accessUi?.present(ev);
        audioCues.play(ev.policy.decision);
      },
    },
  );
  const appendAccessLog: AppendAccessLogFn | undefined =
    deps.appendAccessLog ?? ((payload) => deps.persistence!.accessLogRepo.appendDecision(payload));
  return { ...deps, evaluateDecision, appendAccessLog };
}
