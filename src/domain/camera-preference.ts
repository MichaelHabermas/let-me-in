/**
 * Persisted camera choice (E12). Stored as JSON in Dexie `settings` rows.
 */
export type CameraPreference = {
  deviceId?: string;
  facingMode?: string;
};

export const GATE_CAMERA_PREFERENCE_KEY = 'gateCameraPreference';
export const ENROLL_CAMERA_PREFERENCE_KEY = 'enrollCameraPreference';
