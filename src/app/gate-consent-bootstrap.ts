import type { DexiePersistence } from '../infra/persistence';
import { readConsentAccepted, writeConsentAccepted } from './consent';
import type { ConsentModalStrings } from '../ui/components/consent';
import { mountConsentModal } from '../ui/components/consent';

/**
 * If consent is not recorded, blocks `#start` with a modal until accept; decline keeps start disabled.
 */
export async function bootstrapGateConsentIfNeeded(options: {
  persistence: DexiePersistence;
  startBtn: HTMLButtonElement;
  shell: HTMLElement;
  strings: ConsentModalStrings;
}): Promise<void> {
  const { persistence, startBtn, shell, strings } = options;
  const existing = await readConsentAccepted(persistence);
  if (existing) {
    startBtn.disabled = false;
    return;
  }

  startBtn.disabled = true;
  let removeModal: (() => void) | undefined;

  const closeModal = () => {
    removeModal?.();
    removeModal = undefined;
  };

  removeModal = mountConsentModal(shell, strings, {
    onAccept: () => {
      void writeConsentAccepted(persistence).then(() => {
        closeModal();
        startBtn.disabled = false;
      });
    },
    onDecline: () => {
      closeModal();
      startBtn.disabled = true;
    },
  });
}
