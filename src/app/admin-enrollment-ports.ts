import type { AdminEnrollmentDom } from './admin-enrollment-dom';

/** Save / name / role validation and status line. */
export type AdminEnrollmentSaveFormPort = Pick<
  AdminEnrollmentDom,
  'saveBtn' | 'nameInput' | 'roleSelect' | 'statusEl'
>;

/** Camera session + overlay + enrollment control buttons (session factory + button sync + capture handlers). */
export type AdminEnrollmentCaptureMount = Pick<
  AdminEnrollmentDom,
  | 'video'
  | 'frameCanvas'
  | 'overlayCanvas'
  | 'modelLoadRoot'
  | 'cameraDeviceSelect'
  | 'statusEl'
  | 'cameraToggleBtn'
  | 'capBtn'
  | 'retakeBtn'
  | 'saveBtn'
  | 'nameInput'
  | 'roleSelect'
>;

/** CSV import toolbar wiring. */
export type AdminEnrollmentImportDomPort = Pick<
  AdminEnrollmentDom,
  'importFileInput' | 'importButton' | 'importStatusEl'
>;

/** User roster table body. */
export type AdminEnrollmentRosterDomPort = Pick<AdminEnrollmentDom, 'rosterTbody'>;
