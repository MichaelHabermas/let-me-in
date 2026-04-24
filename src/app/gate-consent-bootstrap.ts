import type { DexiePersistence } from '../infra/persistence';
import { readConsentAccepted, writeConsentAccepted } from './gate-consent-settings';
import type { ConsentModalStrings } from '../ui/components/consent';
import { mountConsentModal } from '../ui/components/consent';

/**
 * If consent is not recorded, blocks the gate camera toggle until accept; decline keeps it disabled.
 */
export async function bootstrapGateConsentIfNeeded(options: {
  persistence: DexiePersistence;
  cameraToggleBtn: HTMLButtonElement;
  shell: HTMLElement;
  strings: ConsentModalStrings;
}): Promise<void> {
  const { persistence, cameraToggleBtn, shell, strings } = options;
  const existing = await readConsentAccepted(persistence);
  if (existing) {
    cameraToggleBtn.disabled = false;
    return;
  }

  cameraToggleBtn.disabled = true;
  let removeModal: (() => void) | undefined;

  const closeModal = () => {
    removeModal?.();
    removeModal = undefined;
  };

  removeModal = mountConsentModal(shell, strings, {
    onAccept: () => {
      void writeConsentAccepted(persistence).then(() => {
        closeModal();
        cameraToggleBtn.disabled = false;
      });
    },
    onDecline: () => {
      closeModal();
      cameraToggleBtn.disabled = true;
    },
  });
}
