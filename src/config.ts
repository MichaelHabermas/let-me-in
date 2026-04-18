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
  admin: {
    user: string;
    pass: string;
  };
  /** Base URL for onnxruntime-web WASM assets */
  ortWasmBase: string;
  audioEnabled: boolean;
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
  },
  thresholds: {
    strong: 0.8,
    weak: 0.65,
    unknown: 0.6,
    margin: 0.05,
  },
  cooldownMs: 3000,
  modelUrls: {
    detector: '/models/yolov9t.onnx',
    embedder: '/models/w600k_mbf.onnx',
  },
  adminCredentialSource,
  admin,
  ortWasmBase: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/',
  audioEnabled: true,
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
    },
  },
};
