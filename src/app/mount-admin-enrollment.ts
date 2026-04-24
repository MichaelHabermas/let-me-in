import {
  mountAuthenticatedAdminEnrollmentCoordinator,
  type MountAdminEnrollmentOptions,
} from './admin-enrollment-mount-coordinator';

export type { MountAdminEnrollmentOptions };

/** Authenticated admin shell: roster + import + enrollment panel. */
export function mountAuthenticatedAdminEnrollment(opts: MountAdminEnrollmentOptions): () => void {
  return mountAuthenticatedAdminEnrollmentCoordinator(opts);
}
