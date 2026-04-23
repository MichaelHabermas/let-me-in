import { bootstrapApp } from './app/bootstrap-app';
import { mountGateView } from './app/mount-gate';

void bootstrapApp({ mount: mountGateView }).then((result) => {
  if (result.ok) return;

  if (result.reason === 'https') return;

  console.error('[Gatekeeper] bootstrap failed', result);
});
