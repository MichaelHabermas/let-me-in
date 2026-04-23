import type { AdminAuthCredentials } from './app/admin-auth-types';
import { ORT_EP_ORDER_BROWSER } from './infra/ort-execution-defaults';

/**
 * Central configuration module — all org-configurable values live here.
 * No other file may hardcode a threshold, URL, or org string.
 * Consumers import `config`, never `import.meta.env` directly (DIP).
 */

export interface Config {
  /** Default getUserMedia video constraints (OCP: change resolution here only). */
  camera: {
    idealWidth: number;
    idealHeight: number;
    defaultFacingMode: string;
  };
  org: {
    name: string;
    logoUrl: string;
    /** One-line product description shown under the gate title. */
    tagline: string;
  };
  thresholds: {
    /** similarity01 >= strong AND margin >= margin → GRANTED */
    strong: number;
    /** similarity01 >= weak (but < strong or margin too small) → UNCERTAIN */
    weak: number;
    /** similarity01 < unknown → label as "Unknown" */
    unknown: number;
    /** minimum delta between top-2 matches to confirm strong band */
    margin: number;
  };
  cooldownMs: number;
  modelUrls: {
    detector: string;
    embedder: string;
  };
  adminCredentialSource: 'env' | 'dev-default';
  admin: AdminAuthCredentials;
  /**
   * Base URL for onnxruntime-web WASM assets (default: jsDelivr).
   * For strict CSP / air-gapped deploys, vendor `dist/*.wasm` under `/ort/` and point here.
   */
  ortWasmBase: string;
  /**
   * Run the YOLO detector in a Web Worker so ORT inference does not block the camera RAF loop.
   * Set false only for debugging (e.g. worker init issues).
   */
  detectorUseWorker: boolean;
  /**
   * When true, gate pipeline logs embedding wall time and vector length to the console (dev only).
   * Set `VITE_LOG_EMBEDDING_TIMINGS=true` at build time.
   */
  devLogEmbeddingTimings: boolean;
  audioEnabled: boolean;
  /** When true (Vite `VITE_E2E_STUB_ENROLL`), admin enrollment skips camera/ONNX for Playwright. */
  e2eStubEnrollment: boolean;
  ui: {
    strings: {
      unknown: string;
      noFace: string;
      multiFace: string;
      cameraPermissionDenied: string;
      cameraNoDevice: string;
      cameraUnknownError: string;
      cameraStart: string;
      cameraStop: string;
      detectorLoading: string;
      detectorLoadFailed: string;
      adminLoginHeading: string;
      adminLoginUsername: string;
      adminLoginPassword: string;
      adminLoginSubmit: string;
      adminLoginError: string;
      adminLogout: string;
      rosterTitle: string;
      rosterColPhoto: string;
      rosterColName: string;
      rosterColRole: string;
      rosterColCreated: string;
      rosterColActions: string;
      rosterEdit: string;
      rosterDelete: string;
      rosterThumbnailAlt: string;
      rosterBulkImport: string;
      rosterImportPick: string;
      rosterImportConfirmDuplicates: string;
      rosterImportProgress: string;
      rosterImportDone: string;
      rosterDeleteConfirm: string;
      enrollTitle: string;
      enrollStartCamera: string;
      enrollCapture: string;
      enrollRetake: string;
      enrollSave: string;
      enrollNameLabel: string;
      enrollRoleLabel: string;
      enrollSuccess: string;
      enrollNameRequired: string;
      /** `{name}` and `{similarity}` placeholders (similarity as integer percent). */
      accessGrantedBanner: string;
      /** `{unknown}` and `{similarity}` placeholders. */
      accessDeniedBanner: string;
      accessTryAgain: string;
      consentTitle: string;
      consentIntro: string;
      consentBulletPurpose: string;
      consentBulletStored: string;
      consentBulletRetention: string;
      consentBulletRefuse: string;
      consentAccept: string;
      consentDecline: string;
    };
  };
}

function resolveAdminCredentials(): Pick<Config, 'adminCredentialSource' | 'admin'> {
  const user = import.meta.env.VITE_ADMIN_USER as string | undefined;
  const pass = import.meta.env.VITE_ADMIN_PASS as string | undefined;

  if (user && pass) {
    return { adminCredentialSource: 'env', admin: { user, pass } };
  }

  console.warn(
    '[Gatekeeper] No VITE_ADMIN_USER/VITE_ADMIN_PASS set — using dev-default credentials. Do NOT use in production.',
  );
  return { adminCredentialSource: 'dev-default', admin: { user: 'admin', pass: 'admin' } };
}

const { adminCredentialSource, admin } = resolveAdminCredentials();

export const config: Config = {
  camera: {
    idealWidth: 1280,
    idealHeight: 720,
    defaultFacingMode: 'user',
  },
  org: {
    name: 'Gatekeeper',
    logoUrl: '',
    tagline:
      'A browser-only facial-recognition “door” that verifies who is at the camera and grants or denies entry without sending video to a server or requiring dedicated hardware.',
  },
  thresholds: {
    strong: 0.85,
    weak: 0.65,
    unknown: 0.65,
    margin: 0.05,
  },
  cooldownMs: 3000,
  modelUrls: {
    detector: '/models/yolov9t.onnx',
    embedder: '/models/w600k_mbf.onnx',
  },
  adminCredentialSource,
  admin,
  ortWasmBase: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/',
  detectorUseWorker: true,
  devLogEmbeddingTimings: import.meta.env.VITE_LOG_EMBEDDING_TIMINGS === 'true',
  audioEnabled: true,
  e2eStubEnrollment: import.meta.env.VITE_E2E_STUB_ENROLL === 'true',
  ui: {
    strings: {
      unknown: 'Unknown',
      noFace: 'No face detected',
      multiFace: 'Multiple faces detected. Please ensure only one person is in frame.',
      cameraPermissionDenied:
        'Camera access is required. Allow the camera in your browser settings, then try again.',
      cameraNoDevice: 'No camera was found. Connect a camera and refresh the page.',
      cameraUnknownError: 'The camera could not be started. Try again or use a different browser.',
      cameraStart: 'Start camera',
      cameraStop: 'Stop camera',
      detectorLoading: 'Loading face detector…',
      detectorLoadFailed: 'Face detector could not load. Check your connection and refresh.',
      adminLoginHeading: 'Admin sign-in',
      adminLoginUsername: 'Username',
      adminLoginPassword: 'Password',
      adminLoginSubmit: 'Sign in',
      adminLoginError: 'Invalid username or password.',
      adminLogout: 'Sign out',
      rosterTitle: 'Enrolled users',
      rosterColPhoto: 'Photo',
      rosterColName: 'Name',
      rosterColRole: 'Role',
      rosterColCreated: 'Added',
      rosterColActions: 'Actions',
      rosterEdit: 'Edit',
      rosterDelete: 'Delete',
      rosterThumbnailAlt: 'Reference face',
      rosterBulkImport: 'Import JSON',
      rosterImportPick: 'Choose JSON file…',
      rosterImportConfirmDuplicates: 'Duplicate names found. Import anyway?',
      rosterImportProgress: 'Importing {current} / {total}…',
      rosterImportDone: 'Import finished.',
      rosterDeleteConfirm: 'Delete this user? Their log entries will show as Unknown.',
      enrollTitle: 'Enroll a user',
      enrollStartCamera: 'Start camera',
      enrollCapture: 'Capture',
      enrollRetake: 'Retake',
      enrollSave: 'Save',
      enrollNameLabel: 'Name',
      enrollRoleLabel: 'Role',
      enrollSuccess: 'User saved.',
      enrollNameRequired: 'Name is required.',
      accessGrantedBanner: '{name} — {similarity}%',
      accessDeniedBanner: '{unknown} — {similarity}%',
      accessTryAgain: 'Please try again',
      consentTitle: 'Face verification',
      consentIntro: 'Before we use your camera, please confirm you understand the following:',
      consentBulletPurpose:
        'Live video is processed in your browser to verify identity for access control. Nothing is sent to our servers for recognition.',
      consentBulletStored:
        'Embeddings and a reference face image are stored only in this browser (IndexedDB). They can be inspected with developer tools on this device.',
      consentBulletRetention:
        'Data remains until an administrator deletes your enrollment from this deployment.',
      consentBulletRefuse:
        'You may refuse by closing this tab; the camera will not start without your consent.',
      consentAccept: 'I understand — continue',
      consentDecline: 'Decline',
    },
  },
};

/** Subset of `Config` used to build the YOLO ONNX detector (avoids leaking full config into infra). */
export type DetectorRuntimeSettings = {
  detectorModelUrl: string;
  ortWasmBase: string;
  detectorUseWorker: boolean;
  preferredExecutionProviders: string[];
};

export function getDetectorRuntimeSettings(c: Config = config): DetectorRuntimeSettings {
  return {
    detectorModelUrl: c.modelUrls.detector,
    ortWasmBase: c.ortWasmBase,
    detectorUseWorker: c.detectorUseWorker,
    preferredExecutionProviders: [...ORT_EP_ORDER_BROWSER],
  };
}

/** Subset of `Config` for InsightFace ONNX embedder (keeps infra free of unrelated config). */
export type EmbedderRuntimeSettings = {
  embedderModelUrl: string;
  ortWasmBase: string;
  preferredExecutionProviders: string[];
};

export function getEmbedderRuntimeSettings(c: Config = config): EmbedderRuntimeSettings {
  return {
    embedderModelUrl: c.modelUrls.embedder,
    ortWasmBase: c.ortWasmBase,
    preferredExecutionProviders: [...ORT_EP_ORDER_BROWSER],
  };
}
