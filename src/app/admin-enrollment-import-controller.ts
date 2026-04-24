import { runBulkImport } from './bulk-import';
import type { AdminEnrollmentImportDomPort } from './admin-enrollment-ports';
import type { GateRuntime } from './gate-runtime';
import type { DexiePersistence } from '../infra/persistence';

export function bindAdminEnrollmentImportController(params: {
  dom: AdminEnrollmentImportDomPort;
  rt: GateRuntime;
  persistence: DexiePersistence;
  refreshRoster: () => Promise<void>;
  useStubEnrollment: boolean;
}): () => void {
  const { dom, rt, persistence, refreshRoster, useStubEnrollment } = params;
  const onImportPick = () => {
    dom.importFileInput.click();
  };
  dom.importButton.addEventListener('click', onImportPick);

  const onImportFileChange = () => {
    const file = dom.importFileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      void (async () => {
        dom.importStatusEl.textContent = '';
        const copy = rt.adminUiStrings;
        const res = await runBulkImport(persistence, text, {
          useStubEnrollment,
          onProgress(current, total) {
            dom.importStatusEl.textContent = copy.rosterImportProgress
              .replaceAll('{current}', String(current))
              .replaceAll('{total}', String(total));
          },
          confirmDuplicateNames() {
            return Promise.resolve(window.confirm(copy.rosterImportConfirmDuplicates));
          },
        });
        if (!res.proceededAfterDuplicateConfirm) {
          dom.importFileInput.value = '';
          return;
        }
        dom.importStatusEl.textContent = copy.rosterImportDone;
        dom.importFileInput.value = '';
        await refreshRoster();
      })();
    };
    reader.readAsText(file);
  };
  dom.importFileInput.addEventListener('change', onImportFileChange);

  return () => {
    dom.importButton.removeEventListener('click', onImportPick);
    dom.importFileInput.removeEventListener('change', onImportFileChange);
  };
}
