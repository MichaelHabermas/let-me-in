import { runBulkImport } from './bulk-import';
import { downloadRosterJson, exportRosterJson, rosterExportFilename } from './roster-json-export';
import type { AdminEnrollmentImportDomPort } from './admin-enrollment-ports';
import type { GateRuntime } from './gate-runtime';
import type { DexiePersistence } from '../infra/persistence';

const IMPORT_FAILED_LABEL = 'Import failed.';
const EXPORT_FAILED_LABEL = 'Export failed.';

async function runExport(params: {
  persistence: DexiePersistence;
  statusEl: HTMLElement;
  doneLabel: string;
}): Promise<void> {
  try {
    const exported = await exportRosterJson(params.persistence);
    downloadRosterJson(exported, rosterExportFilename());
    params.statusEl.textContent = params.doneLabel;
  } catch {
    params.statusEl.textContent = EXPORT_FAILED_LABEL;
  }
}

async function runImport(params: {
  dom: AdminEnrollmentImportDomPort;
  rt: GateRuntime;
  persistence: DexiePersistence;
  text: string;
  refreshRoster: () => Promise<void>;
  useStubEnrollment: boolean;
}): Promise<void> {
  try {
    params.dom.importStatusEl.textContent = '';
    const copy = params.rt.runtimeSlices.admin.ui;
    const res = await runBulkImport(params.persistence, params.text, {
      useStubEnrollment: params.useStubEnrollment,
      onProgress(current, total) {
        params.dom.importStatusEl.textContent = copy.rosterImportProgress
          .replaceAll('{current}', String(current))
          .replaceAll('{total}', String(total));
      },
      confirmDuplicateNames() {
        return Promise.resolve(window.confirm(copy.rosterImportConfirmDuplicates));
      },
    });
    params.dom.importFileInput.value = '';
    if (!res.proceededAfterDuplicateConfirm) return;
    params.dom.importStatusEl.textContent = copy.rosterImportDone;
    await params.refreshRoster();
  } catch {
    params.dom.importStatusEl.textContent = IMPORT_FAILED_LABEL;
  }
}

function createOnImportFileChange(params: {
  dom: AdminEnrollmentImportDomPort;
  rt: GateRuntime;
  persistence: DexiePersistence;
  refreshRoster: () => Promise<void>;
  useStubEnrollment: boolean;
}): () => void {
  return () => {
    const file = params.dom.importFileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      void runImport({
        dom: params.dom,
        rt: params.rt,
        persistence: params.persistence,
        text,
        refreshRoster: params.refreshRoster,
        useStubEnrollment: params.useStubEnrollment,
      });
    };
    reader.readAsText(file);
  };
}

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

  const onExportClick = () => {
    void runExport({
      persistence,
      statusEl: dom.importStatusEl,
      doneLabel: rt.runtimeSlices.admin.ui.rosterExportDone,
    });
  };
  dom.exportButton.addEventListener('click', onExportClick);

  const onImportFileChange = createOnImportFileChange({
    dom,
    rt,
    persistence,
    refreshRoster,
    useStubEnrollment,
  });
  dom.importFileInput.addEventListener('change', onImportFileChange);

  return () => {
    dom.importButton.removeEventListener('click', onImportPick);
    dom.exportButton.removeEventListener('click', onExportClick);
    dom.importFileInput.removeEventListener('change', onImportFileChange);
  };
}
