import { bootstrapApp } from './app/bootstrap-app';
import { mountAdminView } from './ui/admin-view';

void bootstrapApp({ mount: mountAdminView }).then((result) => {
  if (result.ok) return;
  if (result.reason === 'https') return;
  console.error('[Gatekeeper] bootstrap failed', result);
});
