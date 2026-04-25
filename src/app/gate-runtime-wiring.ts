import type { GateAccessUiStrings } from './gate-access-ui-controller';
import type { ConsentModalStrings } from '../ui/components/consent';
import type { GatePreviewSessionCoreDeps, GateRuntime } from './gate-runtime';

/**
 * One place to read gate session wiring: {@link GatePreviewSessionCoreDeps} for pipeline/camera
 * copy, plus grouped gate UI. Prefer `wiring.core` for fields that also exist on the flat
 * `GateRuntime` root — values match, but `core` is the object passed into `wireGatePreviewSession`.
 */
export type GateSessionWiring = {
  core: GatePreviewSessionCoreDeps;
  accessUi: GateAccessUiStrings;
  consent: ConsentModalStrings;
  gatePageTitle: string;
};

export function getGateSessionWiring(rt: GateRuntime): GateSessionWiring {
  return {
    core: rt.gatePreviewSessionCoreDeps,
    accessUi: rt.runtimeSlices.gate.accessUi,
    consent: rt.runtimeSlices.gate.consent,
    gatePageTitle: rt.runtimeSlices.gate.pageTitle,
  };
}
