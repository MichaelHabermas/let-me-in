import { createAccessDecisionEvaluator, type LiveAccessDecisionUi } from './access-decision-engine';
import { createAccessDecisionContext } from './access-decision-context';
import { createAccessAudioCues } from './audio';
import { runAutomaticThresholdCalibration } from './access-threshold-calibration';
import { createAutoThresholdCalibrationTrigger } from './auto-threshold-calibration-trigger';
import {
  createGateAccessUiController,
  FALLBACK_GATE_ACCESS_UI_STRINGS,
  type GateAccessUiStrings,
} from './gate-access-ui-controller';
import type { AppendAccessLogFn } from './detection-pipeline';
import type { DexiePersistence } from '../infra/persistence';
import type { GatePreviewElements, GatePreviewSessionDeps } from './gate-session';

/**
 * UI + sound side effects for each access decision (used as `LiveAccessDecisionUi` for the evaluator).
 */
export function createLiveAccessOnDecision(
  decisionEl: GatePreviewElements['decisionEl'],
  uiStrings: GateAccessUiStrings,
): LiveAccessDecisionUi {
  const accessUi = decisionEl && createGateAccessUiController(decisionEl, uiStrings);
  const audioCues = createAccessAudioCues();
  return {
    onDecision: (event) => {
      accessUi?.present(event);
      audioCues.play(event.verdict.decision);
    },
  };
}

/** Default pipeline hook: append GRANTED/DENIED lines through Dexie. */
export function appendAccessLogFromPersistence(persistence: DexiePersistence): AppendAccessLogFn {
  return (payload) => persistence.accessLogRepo.appendDecision(payload);
}

const AUTO_CALIBRATION_MIN_ATTEMPTS = 10;
const AUTO_CALIBRATION_MIN_INTERVAL_MS = 2 * 60 * 1000;

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
  const seedFallback = deps.databaseSeedFallback;
  const uiStrings = deps.accessUiStrings ?? FALLBACK_GATE_ACCESS_UI_STRINGS;
  const onDecision = createLiveAccessOnDecision(elements.decisionEl, uiStrings);
  const context = await createAccessDecisionContext(persistence, deps.databaseSeedFallback);
  const evaluateDecision = await createAccessDecisionEvaluator(
    persistence,
    deps.databaseSeedFallback,
    onDecision,
    context,
  );
  const baseAppendAccessLog = deps.appendAccessLog ?? appendAccessLogFromPersistence(persistence);
  const calibrationTrigger = createAutoThresholdCalibrationTrigger({
    minNewAttempts: AUTO_CALIBRATION_MIN_ATTEMPTS,
    minIntervalMs: AUTO_CALIBRATION_MIN_INTERVAL_MS,
    runCalibration: async () => {
      const result = await runAutomaticThresholdCalibration({
        persistence,
        seedFallback,
      });
      if (result.applied) {
        await context.refresh();
      }
    },
  });
  const appendAccessLog: AppendAccessLogFn = async (payload) => {
    await baseAppendAccessLog(payload);
    calibrationTrigger.onDecisionAppended();
  };
  return {
    ...deps,
    evaluateDecision,
    appendAccessLog,
  };
}
