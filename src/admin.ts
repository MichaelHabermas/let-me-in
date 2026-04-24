import { mountAdminView } from './app/mount-admin-shell';
import { readE2eStubFlags } from './app/e2e-stub-flags';
import { runBootstrap } from './app/run-bootstrap';

const flags = readE2eStubFlags();

runBootstrap(() => mountAdminView({ useStubEnrollment: flags.enrollment }));
