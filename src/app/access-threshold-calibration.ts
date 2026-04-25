import type { AccessThresholds } from '../domain/access-policy';
import type { DatabaseSeedSettings } from '../domain/database-seed';
import { collectCalibrationSamples } from '../domain/access-log-review';
import type { AccessLogRow } from '../domain/types';
import type { CalibrationExplainability } from '../domain/threshold-calibration-explain';
import {
  buildMetaApplied,
  buildMetaIbalanced,
  buildMetaNoChange,
  buildMetaInsufficient,
  thresholdsUnchanged,
} from './access-threshold-calibration-meta';
import {
  deriveCandidateThresholds,
  type DriftTuningOptions,
  maybeExplainability,
} from './access-threshold-calibration-math';
import {
  type ThresholdCalibrationMeta,
  type ThresholdCalibrationOptions,
  type ThresholdCalibrationShadow,
  THRESHOLD_CALIBRATION_META_KEY,
  THRESHOLD_CALIBRATION_SHADOW_KEY,
} from './access-threshold-calibration-types';
import type { DexiePersistence, SettingsStore } from '../infra/persistence';
import {
  readAccessThresholdsFromSettings,
  writeAccessThresholdsToSettings,
} from './access-thresholds-store';

export {
  THRESHOLD_CALIBRATION_META_KEY,
  THRESHOLD_CALIBRATION_SHADOW_KEY,
  type ThresholdCalibrationMeta,
  type ThresholdCalibrationShadow,
  type ThresholdCalibrationOptions,
};

const DEFAULTS: Required<ThresholdCalibrationOptions> = {
  lookbackWindowMs: 24 * 60 * 60 * 1000,
  minSamples: 20,
  minGrantedSamples: 6,
  minDeniedSamples: 6,
  maxDriftPerRun: 0.02,
  minGap: 0.05,
  minWeak: 0.5,
  maxStrong: 0.95,
  minMargin: 0.02,
  maxMargin: 0.12,
};

function toDriftOpts(o: Required<ThresholdCalibrationOptions>): DriftTuningOptions {
  return {
    minGap: o.minGap,
    minWeak: o.minWeak,
    maxStrong: o.maxStrong,
    maxDriftPerRun: o.maxDriftPerRun,
    minMargin: o.minMargin,
    maxMargin: o.maxMargin,
  };
}

async function writeLiveCalibrationMeta(
  settingsRepo: SettingsStore,
  meta: ThresholdCalibrationMeta,
): Promise<void> {
  await settingsRepo.put({ key: THRESHOLD_CALIBRATION_META_KEY, value: meta });
}

export async function readThresholdCalibrationMeta(
  settingsRepo: SettingsStore,
): Promise<ThresholdCalibrationMeta | null> {
  const row = await settingsRepo.get(THRESHOLD_CALIBRATION_META_KEY);
  if (!row?.value || typeof row.value !== 'object') return null;
  return row.value as ThresholdCalibrationMeta;
}

export async function readThresholdCalibrationShadow(
  settingsRepo: SettingsStore,
): Promise<ThresholdCalibrationShadow | null> {
  const row = await settingsRepo.get(THRESHOLD_CALIBRATION_SHADOW_KEY);
  if (!row?.value || typeof row.value !== 'object') return null;
  return row.value as ThresholdCalibrationShadow;
}

async function writeShadowCalibration(
  settingsRepo: SettingsStore,
  shadow: ThresholdCalibrationShadow,
): Promise<void> {
  await settingsRepo.put({ key: THRESHOLD_CALIBRATION_SHADOW_KEY, value: shadow });
}

export async function clearThresholdCalibrationShadow(settingsRepo: SettingsStore): Promise<void> {
  await settingsRepo.delete(THRESHOLD_CALIBRATION_SHADOW_KEY);
}

async function persistCalibrationResult(
  settingsRepo: SettingsStore,
  apply: boolean,
  meta: ThresholdCalibrationMeta,
): Promise<void> {
  if (apply) {
    await writeLiveCalibrationMeta(settingsRepo, meta);
  } else {
    await writeShadowCalibration(settingsRepo, { previewedAtMs: meta.lastRunAtMs, meta });
  }
}

async function persistNewCandidateThresholds(p: {
  settingsRepo: SettingsStore;
  persistence: DexiePersistence;
  nowMs: number;
  apply: boolean;
  current: AccessThresholds;
  next: AccessThresholds;
  samples: ReturnType<typeof collectCalibrationSamples>;
  logCount: number;
  explainability: CalibrationExplainability | undefined;
}): Promise<{ applied: boolean; meta: ThresholdCalibrationMeta }> {
  if (p.apply) {
    await writeAccessThresholdsToSettings(p.persistence.settingsRepo, p.next);
  }
  const maxDr = Math.max(
    Math.abs(p.next.strong - p.current.strong),
    Math.abs(p.next.weak - p.current.weak),
    Math.abs(p.next.margin - p.current.margin),
  );
  const meta = buildMetaApplied(
    { nowMs: p.nowMs, current: p.current, next: p.next, samples: p.samples },
    p.logCount,
    maxDr,
    p.explainability,
  );
  if (p.apply) {
    await writeLiveCalibrationMeta(p.settingsRepo, meta);
    await clearThresholdCalibrationShadow(p.settingsRepo);
  } else {
    await writeShadowCalibration(p.settingsRepo, { previewedAtMs: p.nowMs, meta });
  }
  return { applied: p.apply, meta };
}

async function runAfterSampleGate(params: {
  settingsRepo: SettingsStore;
  persistence: DexiePersistence;
  nowMs: number;
  apply: boolean;
  opts: Required<ThresholdCalibrationOptions>;
  current: AccessThresholds;
  logs: AccessLogRow[];
}): Promise<{ applied: boolean; meta: ThresholdCalibrationMeta }> {
  const { settingsRepo, persistence, nowMs, apply, opts, current, logs } = params;
  const samples = collectCalibrationSamples(logs);
  const { grantedScores, deniedScores } = samples;
  if (
    grantedScores.length < opts.minGrantedSamples ||
    deniedScores.length < opts.minDeniedSamples
  ) {
    const explainability = maybeExplainability({
      grantedScores,
      deniedScores,
      previous: current,
      next: null,
    });
    const meta = buildMetaIbalanced({ nowMs, current, samples }, logs.length, explainability);
    await persistCalibrationResult(settingsRepo, apply, meta);
    return { applied: false, meta };
  }
  const next = deriveCandidateThresholds(current, grantedScores, deniedScores, toDriftOpts(opts));
  const explainability = maybeExplainability({
    grantedScores,
    deniedScores,
    previous: current,
    next,
  });
  if (thresholdsUnchanged(next, current)) {
    const meta = buildMetaNoChange({ nowMs, current, next, samples }, logs.length, explainability);
    await persistCalibrationResult(settingsRepo, apply, meta);
    return { applied: false, meta };
  }
  return persistNewCandidateThresholds({
    settingsRepo,
    persistence,
    nowMs,
    apply,
    current,
    next,
    samples,
    logCount: logs.length,
    explainability,
  });
}

/**
 * @param applyThresholds When false, shadow mode: do not change persisted thresholds or live
 *   calibration meta; only write `thresholdCalibrationShadow` for admin preview.
 */
export async function runAutomaticThresholdCalibration(params: {
  persistence: DexiePersistence;
  seedFallback: DatabaseSeedSettings;
  nowMs?: number;
  options?: ThresholdCalibrationOptions;
  applyThresholds?: boolean;
}): Promise<{ applied: boolean; meta: ThresholdCalibrationMeta }> {
  const nowMs = params.nowMs ?? Date.now();
  const opts = { ...DEFAULTS, ...(params.options ?? {}) };
  const apply = params.applyThresholds !== false;
  const { settingsRepo } = params.persistence;
  const current = await readAccessThresholdsFromSettings(
    params.persistence.settingsRepo,
    params.seedFallback,
  );
  const logs = await params.persistence.accessLogRepo.whereTimestampBetween(
    nowMs - opts.lookbackWindowMs,
    nowMs,
  );
  if (logs.length < opts.minSamples) {
    const meta = buildMetaInsufficient(nowMs, current, logs.length);
    await persistCalibrationResult(settingsRepo, apply, meta);
    return { applied: false, meta };
  }
  return runAfterSampleGate({
    settingsRepo,
    persistence: params.persistence,
    nowMs,
    apply,
    opts,
    current,
    logs,
  });
}

/** Promote a shadow preview into live thresholds and live calibration metadata. */
export async function applyThresholdCalibrationShadow(persistence: DexiePersistence): Promise<{
  ok: boolean;
}> {
  const sh = await readThresholdCalibrationShadow(persistence.settingsRepo);
  if (!sh?.meta.next || sh.meta.reason !== 'applied') return { ok: false };
  const next = sh.meta.next;
  await writeAccessThresholdsToSettings(persistence.settingsRepo, next);
  const meta: ThresholdCalibrationMeta = {
    ...sh.meta,
    lastRunAtMs: Date.now(),
    reason: 'applied',
    previous: sh.meta.previous,
    next,
  };
  await writeLiveCalibrationMeta(persistence.settingsRepo, meta);
  await clearThresholdCalibrationShadow(persistence.settingsRepo);
  return { ok: true };
}
